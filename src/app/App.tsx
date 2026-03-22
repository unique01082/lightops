import { useState, useCallback, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useTranslation } from 'react-i18next'
import { TitleBar } from './components/title-bar'
import { SourceFoldersPanel } from './components/source-folders-panel'
import { OutputFolderPanel } from './components/output-folder-panel'
import { CameraFormatPanel } from './components/camera-format-panel'
import { RenameSettingsPanel } from './components/rename-settings-panel'
import { AdvancedOptionsPanel } from './components/advanced-options-panel'
import { ActionButtons } from './components/action-buttons'
import { ProgressBar } from './components/progress-bar'
import { LogPanel, LogEntry } from './components/log-panel'
import { SettingsModal } from './components/settings-modal'
import { motion } from 'motion/react'
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'

// ── Types matching Rust structs ────────────────────────────────────────────

interface FilePair {
  jpg?: string
  raw?: string
}

interface ScanResult {
  pairs: FilePair[]
  stats: { total_pairs: number; both: number; jpg_only: number; raw_only: number }
}

interface RenameEntry {
  old_path: string
  new_name: string
  ts?: string
}

interface BuildPlanResult {
  plan: RenameEntry[]
  skipped_count: number
}

interface ProgressEvent {
  current: number
  total: number
  entry: {
    entry_type: string
    source?: string
    destination?: string
    message?: string
  }
  stats: { ok: number; skip: number; error: number }
}

interface ExecuteResult {
  ok: number
  errors: number
  cancelled: boolean
}

interface UpdateInfo {
  available: boolean
  version?: string
  body?: string
}

// Format values → strftime patterns for Rust
const FORMAT_TO_STRFTIME: Record<string, string | null> = {
  'YYYYMMDD_HHMMSS_NNNN': '%Y%m%d_%H%M%S',
  'YYYY-MM-DD_HH-MM-SS_NNNN': '%Y-%m-%d_%H-%M-%S',
  'YYYYMMDD_NNNN': '%Y%m%d',
  'NNNN': null,
}

type AppStatus = 'idle' | 'processing' | 'complete' | 'stopped' | 'error'

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const { t, i18n } = useTranslation()

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [defaultCamera, setDefaultCamera] = useState('nikon')
  const [defaultFileOperation, setDefaultFileOperation] = useState<'copy' | 'move'>('copy')
  const [defaultRecursiveScan, setDefaultRecursiveScan] = useState(false)
  const [defaultOrganizeByDate, setDefaultOrganizeByDate] = useState(false)

  // Source folders
  const [folders, setFolders] = useState<string[]>([])

  // Output folder
  const [outputFolder, setOutputFolder] = useState('')

  // Camera & format
  const [cameraPreset, setCameraPreset] = useState('nikon')
  const [rawExtensions, setRawExtensions] = useState('.nef .nrw')
  const [fileType, setFileType] = useState<'both' | 'jpg' | 'raw'>('both')

  // Rename settings
  const [prefix, setPrefix] = useState('')
  const [format, setFormat] = useState('YYYYMMDD_HHMMSS_NNNN')
  const [startNumber, setStartNumber] = useState(1)

  // Advanced options
  const [recursiveScan, setRecursiveScan] = useState(false)
  const [fileOperation, setFileOperation] = useState<'copy' | 'move'>('copy')
  const [organizeByDate, setOrganizeByDate] = useState(false)
  const [onlyPaired, setOnlyPaired] = useState(false)

  // Processing state
  const [status, setStatus] = useState<AppStatus>('idle')
  const [isDryRun, setIsDryRun] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [stats, setStats] = useState({ ok: 0, skip: 0, error: 0 })
  const [banner, setBanner] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null)

  // Update notification
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  // Ref to append log entries without triggering re-renders mid-run
  const logRef = useRef<LogEntry[]>([])

  // Check for updates on mount
  useEffect(() => {
    invoke<UpdateInfo>('check_update')
      .then((info) => { if (info.available) setUpdateInfo(info) })
      .catch(() => { /* silently ignore */ })
  }, [])

  const addLog = useCallback((entry: LogEntry) => {
    logRef.current = [...logRef.current, entry]
    setLogEntries([...logRef.current])
  }, [])

  // ── Folder actions

  const handleAddFolder = useCallback(async () => {
    try {
      const folder = await invoke<string | null>('pick_folder')
      if (folder && !folders.includes(folder)) {
        setFolders((prev) => [...prev, folder])
      }
    } catch (e) {
      console.error('pick_folder failed:', e)
    }
  }, [folders])

  const handleRemoveFolder = useCallback((index: number) => {
    setFolders((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleBrowseOutput = useCallback(async () => {
    try {
      const folder = await invoke<string | null>('pick_folder')
      if (folder) setOutputFolder(folder)
    } catch (e) {
      console.error('pick_folder failed:', e)
    }
  }, [])

  // ── Core run logic

  const handleRun = useCallback(
    async (dryRun: boolean) => {
      if (folders.length === 0) {
        setBanner({ type: 'error', message: t('errors.noFolders') })
        return
      }

      const rawExts = rawExtensions
        .split(/\s+/)
        .filter((e) => e.startsWith('.'))

      if (fileType !== 'jpg' && rawExts.length === 0) {
        setBanner({ type: 'error', message: t('errors.noRawExt') })
        return
      }

      setStatus('processing')
      setIsDryRun(dryRun)
      setBanner(null)
      setStats({ ok: 0, skip: 0, error: 0 })
      logRef.current = []
      setLogEntries([])

      addLog({ type: 'section', message: `=== ${dryRun ? 'DRY RUN' : 'PROCESSING'} STARTED ===` })

      try {
        // 1. Scan folders
        addLog({ type: 'section', message: `Scanning ${folders.length} folder(s)...` })
        const scanResult = await invoke<ScanResult>('scan_folders', {
          folders,
          rawExts,
          recursive: recursiveScan,
        })

        const { stats: s } = scanResult
        addLog({
          type: 'section',
          message: [
            `Found ${s.total_pairs} groups`,
            `${s.both} paired`,
            `${s.jpg_only} JPG-only`,
            `${s.raw_only} RAW-only`,
          ].join(' · '),
        })

        if (scanResult.pairs.length === 0) {
          addLog({ type: 'warn', message: 'No files found in the selected folders.' })
          setStatus('idle')
          return
        }

        // 2. Build rename plan
        const planResult = await invoke<BuildPlanResult>('build_rename_plan', {
          pairs: scanResult.pairs,
          opts: {
            prefix,
            fmt_pattern: FORMAT_TO_STRFTIME[format] ?? null,
            file_mode: fileType,
            only_paired: onlyPaired,
            start_num: startNumber,
          },
        })

        if (planResult.skipped_count > 0) {
          addLog({
            type: 'warn',
            message: `${planResult.skipped_count} group(s) skipped — no readable EXIF data.`,
          })
        }

        if (planResult.plan.length === 0) {
          addLog({ type: 'warn', message: 'Nothing to rename.' })
          setStatus('idle')
          return
        }

        setProgress({ current: 0, total: planResult.plan.length })
        addLog({ type: 'section', message: `Renaming ${planResult.plan.length} files...` })

        // 3. Listen for progress events before invoking execute_plan
        const unlisten = await listen<ProgressEvent>('progress', (event) => {
          const { entry, current, total, stats: es } = event.payload
          setProgress({ current, total })
          setStats({ ok: es.ok, skip: es.skip, error: es.error })
          addLog({
            type: entry.entry_type as LogEntry['type'],
            source: entry.source,
            destination: entry.destination,
            message: entry.message,
          })
        })

        // 4. Execute
        const result = await invoke<ExecuteResult>('execute_plan', {
          plan: planResult.plan,
          opts: {
            output_dir: outputFolder.trim() || null,
            dry_run: dryRun,
            use_date_subdir: organizeByDate,
            file_op: fileOperation,
          },
        })

        unlisten()

        if (result.cancelled) {
          setStatus('stopped')
          setBanner({
            type: 'warning',
            message: `⏹ Stopped at ${result.ok} / ${planResult.plan.length} files`,
          })
        } else {
          setStatus('complete')
          addLog({ type: 'section', message: '=== COMPLETED ===' })
          const msg = `✅ Completed: ${result.ok} file(s) ${dryRun ? 'would be renamed' : 'renamed successfully'}${
            result.errors ? `, ${result.errors} error(s)` : ''
          }`
          setBanner({ type: result.errors > 0 ? 'warning' : 'success', message: msg })
          setTimeout(() => setBanner(null), 6000)
        }
      } catch (e) {
        setStatus('error')
        addLog({ type: 'error', message: String(e) })
        setBanner({ type: 'error', message: `Error: ${e}` })
      }
    },
    [
      folders, rawExtensions, recursiveScan, format, prefix,
      fileType, onlyPaired, startNumber, outputFolder,
      organizeByDate, fileOperation, addLog, t,
    ],
  )

  const handleStop = useCallback(async () => {
    try {
      await invoke('cancel_execution')
    } catch (e) {
      console.error('cancel_execution failed:', e)
    }
  }, [])

  const handleClearLog = useCallback(() => {
    logRef.current = []
    setLogEntries([])
    setStats({ ok: 0, skip: 0, error: 0 })
    setProgress({ current: 0, total: 0 })
    setBanner(null)
    if (status === 'complete' || status === 'stopped' || status === 'error') {
      setStatus('idle')
    }
  }, [status])

  // ── Language toggle
  const handleLanguageChange = useCallback((lang: string) => {
    i18n.changeLanguage(lang)
    try {
      localStorage.setItem('lightops-language', lang)
    } catch { /* ignore */ }
  }, [i18n])

  // ── Decorative gradient orbs
  const gradientOrbs = [
    {
      gradient: 'radial-gradient(circle, rgba(102, 126, 234, 0.15), transparent 70%)',
      size: '600px', top: '10%', left: '15%',
    },
    {
      gradient: 'radial-gradient(circle, rgba(217, 70, 239, 0.12), transparent 70%)',
      size: '500px', top: '50%', right: '10%',
    },
    {
      gradient: 'radial-gradient(circle, rgba(79, 172, 254, 0.1), transparent 70%)',
      size: '450px', bottom: '15%', left: '20%',
    },
  ]

  const isProcessing = status === 'processing'

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Background gradient orbs */}
      {gradientOrbs.map((orb, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: orb.gradient,
            width: orb.size, height: orb.size,
            top: orb.top, left: orb.left,
            right: (orb as Record<string, string>).right,
            bottom: (orb as Record<string, string>).bottom,
            filter: 'blur(80px)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8 + index * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Window chrome */}
      <TitleBar
        onSettingsClick={() => setIsSettingsOpen(true)}
        updateInfo={updateInfo}
      />

      {/* Update notification banner */}
      {updateInfo?.available && (
        <div className="px-4 py-2 text-sm flex items-center justify-between"
          style={{ background: 'rgba(102,126,234,0.15)', borderBottom: '1px solid rgba(102,126,234,0.3)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {t('update.available')} v{updateInfo.version}
          </span>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Configuration */}
        <div
          className="w-[400px] flex flex-col gap-3 overflow-y-auto p-4"
          style={{ borderRight: '1px solid var(--glass-divider)' }}
        >
          <SourceFoldersPanel
            folders={folders}
            onAddFolder={handleAddFolder}
            onRemoveFolder={handleRemoveFolder}
          />
          <OutputFolderPanel
            outputFolder={outputFolder}
            onBrowse={handleBrowseOutput}
            onChange={setOutputFolder}
          />
          <CameraFormatPanel
            cameraPreset={cameraPreset}
            rawExtensions={rawExtensions}
            fileType={fileType}
            onCameraChange={setCameraPreset}
            onRawExtensionsChange={setRawExtensions}
            onFileTypeChange={setFileType}
          />
          <RenameSettingsPanel
            prefix={prefix}
            format={format}
            startNumber={startNumber}
            onPrefixChange={setPrefix}
            onFormatChange={setFormat}
            onStartNumberChange={setStartNumber}
          />
          <AdvancedOptionsPanel
            recursiveScan={recursiveScan}
            fileOperation={fileOperation}
            organizeByDate={organizeByDate}
            onlyPaired={onlyPaired}
            onRecursiveScanChange={setRecursiveScan}
            onFileOperationChange={setFileOperation}
            onOrganizeByDateChange={setOrganizeByDate}
            onOnlyPairedChange={setOnlyPaired}
          />

          <ActionButtons
            isProcessing={isProcessing}
            onRun={() => handleRun(false)}
            onDryRun={() => handleRun(true)}
            onStop={handleStop}
          />

          {/* Status banner */}
          {banner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl p-3 flex items-center gap-2 text-sm border"
              style={{
                background: banner.type === 'success'
                  ? 'rgba(17, 153, 142, 0.15)'
                  : banner.type === 'warning'
                  ? 'rgba(247, 151, 30, 0.15)'
                  : 'rgba(245, 87, 108, 0.15)',
                borderColor: banner.type === 'success'
                  ? 'rgba(17, 153, 142, 0.3)'
                  : banner.type === 'warning'
                  ? 'rgba(247, 151, 30, 0.3)'
                  : 'rgba(245, 87, 108, 0.3)',
              }}
            >
              {banner.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--log-ok)' }} />}
              {banner.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--log-warn)' }} />}
              {banner.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--log-error)' }} />}
              <span style={{ color: 'var(--text-secondary)' }}>{banner.message}</span>
            </motion.div>
          )}
        </div>

        {/* Right panel — Log output */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <LogPanel
            entries={logEntries}
            isDryRun={isDryRun}
            stats={stats}
            onClear={handleClearLog}
          />
        </div>
      </div>

      {/* Bottom progress bar */}
      <ProgressBar
        current={progress.current}
        total={progress.total}
        status={status}
      />

      {/* Settings modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        defaultCamera={defaultCamera}
        defaultFileOperation={defaultFileOperation}
        defaultRecursiveScan={defaultRecursiveScan}
        defaultOrganizeByDate={defaultOrganizeByDate}
        language={i18n.language}
        onDefaultCameraChange={setDefaultCamera}
        onDefaultFileOperationChange={setDefaultFileOperation}
        onDefaultRecursiveScanChange={setDefaultRecursiveScan}
        onDefaultOrganizeByDateChange={setDefaultOrganizeByDate}
        onLanguageChange={handleLanguageChange}
      />
    </div>
  )
}

export default App
