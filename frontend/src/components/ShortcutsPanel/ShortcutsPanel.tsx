import { X, Keyboard } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useEffect } from 'react';

const SHORTCUTS = [
  {
    category: 'Navigation',
    items: [
      { keys: ['?'], description: 'Show this shortcuts panel' },
      { keys: ['Esc'], description: 'Close any open panel' },
      { keys: ['Ctrl', 'G'], description: 'Go to address (in editor)' },
    ],
  },
  {
    category: 'Selection',
    items: [
      { keys: ['Click'], description: 'Select instruction as target' },
      { keys: ['Shift', 'Click'], description: 'Multi-select targets' },
      { keys: ['Ctrl', 'A'], description: 'Select all targets' },
    ],
  },
  {
    category: 'Actions',
    items: [
      { keys: ['Ctrl', 'Enter'], description: 'Generate signatures' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected signature' },
      { keys: ['Ctrl', 'E'], description: 'Export signatures' },
    ],
  },
  {
    category: 'Panels',
    items: [
      { keys: ['Ctrl', ','], description: 'Toggle Options panel' },
      { keys: ['Ctrl', 'H'], description: 'Toggle History panel' },
      { keys: ['Ctrl', 'L'], description: 'Load example data' },
    ],
  },
];

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-mono font-semibold bg-bg-elevated border border-border-default rounded shadow-sm text-text-primary">
      {children}
    </kbd>
  );
}

export function ShortcutsPanel() {
  const { showShortcuts, setShowShortcuts, setShowOptions, setShowHistory } = useAppStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? key to show shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
        return;
      }

      // Escape to close panels
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowOptions(false);
        setShowHistory(false);
        return;
      }

      // Ctrl+, for options
      if (e.key === ',' && e.ctrlKey) {
        e.preventDefault();
        setShowOptions(true);
        return;
      }

      // Ctrl+H for history
      if (e.key === 'h' && e.ctrlKey) {
        e.preventDefault();
        setShowHistory(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts, setShowShortcuts, setShowOptions, setShowHistory]);

  if (!showShortcuts) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => setShowShortcuts(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-bg-tertiary border-b border-border-subtle">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Keyboard size={20} className="text-accent-cyan" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setShowShortcuts(false)}
            className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {SHORTCUTS.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-tertiary/50"
                    >
                      <span className="text-sm text-text-secondary">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, j) => (
                          <span key={j} className="flex items-center gap-1">
                            <KeyCap>{key}</KeyCap>
                            {j < item.keys.length - 1 && (
                              <span className="text-text-muted text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-bg-tertiary/50 border-t border-border-subtle text-center">
          <span className="text-xs text-text-muted">
            Press <KeyCap>?</KeyCap> anytime to toggle this panel
          </span>
        </div>
      </div>
    </div>
  );
}
