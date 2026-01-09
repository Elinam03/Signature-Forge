import { Settings, Download, HelpCircle, Clock } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export function Header() {
  const { showOptions, setShowOptions, showHistory, setShowHistory, showShortcuts, setShowShortcuts, stats, signatureHistory } = useAppStore();

  return (
    <header className="h-16 bg-bg-secondary border-b border-border-subtle flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">◈</span>
        <h1 className="text-xl font-bold tracking-wide uppercase bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
          SignatureForge
        </h1>
      </div>

      {/* Stats (if parsed) */}
      {stats && (
        <div className="hidden md:flex items-center gap-4 text-sm text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="text-accent-green">{stats.total}</span> instructions
          </span>
          <span className="flex items-center gap-1">
            <span className="text-accent-cyan">{stats.by_type.conditional_jump || 0}</span> jumps
          </span>
          <span className="flex items-center gap-1">
            <span className="text-accent-pink">{stats.by_type.call || 0}</span> calls
          </span>
          <span className="flex items-center gap-1">
            <span className="text-accent-yellow">{stats.labeled}</span> labels
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`relative p-2 rounded-lg border transition-all ${
            showHistory
              ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
              : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:border-accent-cyan hover:text-accent-cyan'
          }`}
          title="History"
        >
          <Clock size={20} />
          {signatureHistory.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-accent-cyan text-bg-primary rounded-full">
              {signatureHistory.length > 9 ? '9+' : signatureHistory.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`p-2 rounded-lg border transition-all ${
            showOptions
              ? 'bg-accent-green/20 border-accent-green text-accent-green'
              : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:border-accent-green hover:text-accent-green'
          }`}
          title="Options"
        >
          <Settings size={20} />
        </button>
        <button
          className="p-2 rounded-lg bg-bg-tertiary border border-border-subtle text-text-secondary hover:border-accent-yellow hover:text-accent-yellow transition-all"
          title="Export"
        >
          <Download size={20} />
        </button>
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className={`p-2 rounded-lg border transition-all ${
            showShortcuts
              ? 'bg-accent-pink/20 border-accent-pink text-accent-pink'
              : 'bg-bg-tertiary border-border-subtle text-text-secondary hover:border-accent-pink hover:text-accent-pink'
          }`}
          title="Help & Shortcuts (?)"
        >
          <HelpCircle size={20} />
        </button>
      </div>
    </header>
  );
}
