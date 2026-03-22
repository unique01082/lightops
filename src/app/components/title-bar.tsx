import { Aperture, Settings, Bell } from 'lucide-react';

interface UpdateInfo {
  available: boolean;
  version?: string;
}

interface TitleBarProps {
  onSettingsClick: () => void;
  updateInfo?: UpdateInfo | null;
}

export function TitleBar({ onSettingsClick, updateInfo }: TitleBarProps) {
  return (
    <div 
      className="flex items-center justify-between px-6 py-3 border-b"
      style={{
        background: 'var(--titlebar-bg)',
        borderColor: 'var(--glass-border)'
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Aperture className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            LightOps
          </h1>
          <span className="text-xs opacity-45" style={{ color: 'var(--text-muted)' }}>
            Photo File Manager
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {updateInfo?.available && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
            style={{
              background: 'rgba(102, 126, 234, 0.15)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              color: '#667eea'
            }}
          >
            <Bell className="w-3 h-3" />
            <span>Update v{updateInfo.version}</span>
          </div>
        )}
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="flex items-center gap-2">
          <button className="w-3 h-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors" aria-label="Minimize" />
          <button className="w-3 h-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors" aria-label="Maximize" />
          <button className="w-3 h-3 rounded-full bg-white/20 hover:bg-red-500/50 transition-colors" aria-label="Close" />
        </div>
      </div>
    </div>
  );
}
