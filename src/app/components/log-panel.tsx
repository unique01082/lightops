import { Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface LogEntry {
  type: 'ok' | 'dry' | 'skip' | 'error' | 'warn' | 'section';
  source?: string;
  destination?: string;
  message?: string;
}

interface LogPanelProps {
  entries: LogEntry[];
  isDryRun: boolean;
  stats: { ok: number; skip: number; error: number };
  onClear: () => void;
}

export function LogPanel({ entries, isDryRun, stats, onClear }: LogPanelProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);

  useEffect(() => {
    if (!isUserScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isUserScrolling.current = scrollTop + clientHeight < scrollHeight - 50;
    }
  };

  const getEntryColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'ok':    return 'var(--log-ok)';
      case 'dry':   return 'var(--log-dry)';
      case 'skip':  return 'var(--log-skip)';
      case 'error': return 'var(--log-error)';
      case 'warn':  return 'var(--log-warn)';
      default:      return 'var(--text-primary)';
    }
  };

  const getTag = (type: LogEntry['type']) => {
    switch (type) {
      case 'ok':    return '[OK]';
      case 'dry':   return '[DRY]';
      case 'skip':  return '[SKIP]';
      case 'error': return '[ERR]';
      case 'warn':  return '[WARN]';
      default:      return '';
    }
  };

  return (
    <div 
      className="rounded-2xl backdrop-blur-lg border flex flex-col h-full"
      style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.1)' }}
    >
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--glass-divider)' }}>
        <div className="flex items-center gap-3">
          <h2 className="text-white" style={{ fontFamily: 'var(--font-heading)' }}>{t('log.title')}</h2>
          {isDryRun && (
            <span 
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255, 210, 0, 0.1)', color: 'var(--log-skip)', border: '1px solid rgba(255, 210, 0, 0.3)' }}
            >
              {t('log.dryRunBadge')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: 'var(--log-ok)' }}>✅ {stats.ok}</span>
            <span style={{ color: 'var(--log-skip)' }}>⚠ {stats.skip}</span>
            <span style={{ color: 'var(--log-error)' }}>❌ {stats.error}</span>
          </div>
          <button onClick={onClear} className="text-xs hover:bg-white/5 px-2 py-1 rounded transition-colors" style={{ color: 'var(--text-muted)' }}>
            {t('log.clear')}
          </button>
        </div>
      </div>
      
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto rounded-b-2xl"
        style={{ background: 'var(--log-bg)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', lineHeight: 1.6 }}
      >
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Camera className="w-12 h-12 mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>{t('log.empty')}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {entries.map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={entry.type === 'section' ? 'mb-2 mt-3' : 'mb-1'}
              >
                {entry.type === 'section' ? (
                  <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{entry.message}</div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="font-medium flex-shrink-0" style={{ color: getEntryColor(entry.type) }}>
                        {getTag(entry.type)}
                      </span>
                      <span
                        className={entry.type === 'dry' ? 'opacity-60' : ''}
                        style={{ color: entry.type === 'error' ? 'var(--log-error)' : 'var(--text-primary)', wordBreak: 'break-all' }}
                      >
                        {entry.source ?? entry.message}
                      </span>
                    </div>
                    {entry.destination && (
                      <div
                        className={`pl-12 ${entry.type === 'dry' ? 'opacity-60' : 'opacity-70'}`}
                        style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}
                      >
                        → {entry.destination}
                      </div>
                    )}
                    {entry.message && entry.source && (
                      <div className="pl-12" style={{ color: getEntryColor(entry.type) }}>
                        {entry.message}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
