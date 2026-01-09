import { X, Trash2, Copy, Clock, Check } from 'lucide-react';
import { useAppStore, type SignatureHistoryEntry } from '../../stores/appStore';
import { useState } from 'react';
import clsx from 'clsx';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function HistoryCard({ entry, onRemove }: { entry: SignatureHistoryEntry; onRemove: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entry.signature.pattern);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 rounded-lg bg-bg-tertiary border border-border-subtle hover:border-border-default transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-accent-green truncate">
              {entry.target}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
              {entry.signature.length} bytes
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock size={10} />
            <span>{formatTimeAgo(entry.timestamp)}</span>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-elevated text-text-muted hover:text-accent-pink transition-all"
          title="Remove from history"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="relative">
        <code className="block text-xs font-mono bg-bg-elevated rounded p-2 text-text-secondary break-all line-clamp-2">
          {entry.signature.pattern}
        </code>
        <button
          onClick={handleCopy}
          className={clsx(
            'absolute top-1 right-1 p-1.5 rounded transition-all',
            copied
              ? 'bg-accent-green/20 text-accent-green'
              : 'bg-bg-tertiary/80 text-text-muted hover:text-accent-cyan'
          )}
          title={copied ? 'Copied!' : 'Copy pattern'}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>

      <div className="mt-2 text-[10px] text-text-muted truncate">
        {entry.inputPreview}...
      </div>
    </div>
  );
}

export function HistoryPanel() {
  const { signatureHistory, removeFromHistory, clearHistory, showHistory, setShowHistory } =
    useAppStore();

  if (!showHistory) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setShowHistory(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-bg-secondary border-l border-border-subtle h-full overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-bg-secondary border-b border-border-subtle p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-accent-cyan">
              <Clock size={20} />
            </span>
            Signature History
            {signatureHistory.length > 0 && (
              <span className="text-sm font-normal text-text-muted">
                ({signatureHistory.length})
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowHistory(false)}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {signatureHistory.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No History Yet</p>
              <p className="text-sm">
                Generated signatures will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Clear all button */}
              <button
                onClick={clearHistory}
                className="w-full flex items-center justify-center gap-2 p-2 mb-4 rounded-lg border border-border-subtle text-text-muted hover:border-accent-pink hover:text-accent-pink transition-all text-sm"
              >
                <Trash2 size={14} />
                Clear All History
              </button>

              {/* History list */}
              <div className="space-y-3">
                {signatureHistory.map((entry) => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeFromHistory(entry.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
