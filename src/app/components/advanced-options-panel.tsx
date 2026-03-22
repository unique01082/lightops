import { ChevronDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

interface AdvancedOptionsPanelProps {
  recursiveScan: boolean;
  fileOperation: 'copy' | 'move';
  organizeByDate: boolean;
  onlyPaired: boolean;
  onRecursiveScanChange: (value: boolean) => void;
  onFileOperationChange: (value: 'copy' | 'move') => void;
  onOrganizeByDateChange: (value: boolean) => void;
  onOnlyPairedChange: (value: boolean) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? undefined : 'var(--switch-background)',
               backgroundImage: checked ? 'var(--accent-lightops)' : undefined }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full"
      />
    </button>
  );
}

export function AdvancedOptionsPanel({
  recursiveScan, fileOperation, organizeByDate, onlyPaired,
  onRecursiveScanChange, onFileOperationChange, onOrganizeByDateChange, onOnlyPairedChange
}: AdvancedOptionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="rounded-2xl backdrop-blur-lg border overflow-hidden"
      style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.1)' }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <h2 className="text-white" style={{ fontFamily: 'var(--font-heading)' }}>ADVANCED</h2>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--glass-divider)' }}>
              <div className="pt-3 flex items-center justify-between">
                <label className="text-sm" style={{ color: 'var(--text-primary)' }}>Scan subfolders</label>
                <Toggle checked={recursiveScan} onChange={onRecursiveScanChange} />
              </div>

              <div>
                <label className="block text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>File Operation</label>
                <div className="flex gap-2">
                  {(['copy', 'move'] as const).map(op => (
                    <button
                      key={op}
                      onClick={() => onFileOperationChange(op)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm transition-all capitalize"
                      style={{
                        background: fileOperation === op ? 'var(--accent-lightops)' : 'var(--input-background)',
                        color: fileOperation === op ? 'white' : 'var(--text-secondary)',
                        border: fileOperation === op ? 'none' : '1px solid var(--glass-border)'
                      }}
                    >
                      {op}
                    </button>
                  ))}
                </div>
                {fileOperation === 'move' && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 mt-2 text-xs"
                    style={{ color: 'var(--log-warn)' }}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Original files will be deleted</span>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm mr-4" style={{ color: 'var(--text-primary)' }}>Create YYYY-MM-DD/ subfolders</label>
                <Toggle checked={organizeByDate} onChange={onOrganizeByDateChange} />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm mr-4" style={{ color: 'var(--text-primary)' }}>Skip unpaired JPG or RAW</label>
                <Toggle checked={onlyPaired} onChange={onOnlyPairedChange} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
