import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

// Declare the electron API type
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      windowMinimize: () => void;
      windowMaximize: () => void;
      windowClose: () => void;
      windowIsMaximized: () => Promise<boolean>;
    };
  }
}

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (isElectron) {
      // Check initial maximized state
      window.electronAPI?.windowIsMaximized().then(setIsMaximized);
    }
  }, [isElectron]);

  // Don't render if not in Electron
  if (!isElectron) {
    return null;
  }

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.windowMaximize();
    // Toggle the state optimistically
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.electronAPI?.windowClose();
  };

  return (
    <div className="title-bar h-8 bg-bg-primary flex items-center justify-between select-none border-b border-border-primary">
      {/* Drag region - app title */}
      <div className="flex-1 h-full flex items-center px-3 drag-region">
        <span className="text-xs font-medium text-text-secondary">SignatureForge</span>
      </div>

      {/* Window controls */}
      <div className="flex h-full">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center hover:bg-white/10 transition-colors no-drag"
          title="Minimize"
        >
          <Minus className="w-4 h-4 text-text-secondary" />
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center hover:bg-white/10 transition-colors no-drag"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Maximize2 className="w-3.5 h-3.5 text-text-secondary" />
          ) : (
            <Square className="w-3.5 h-3.5 text-text-secondary" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center hover:bg-red-600 transition-colors no-drag"
          title="Close"
        >
          <X className="w-4 h-4 text-text-secondary" />
        </button>
      </div>
    </div>
  );
}
