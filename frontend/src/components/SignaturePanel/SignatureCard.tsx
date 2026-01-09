import { useState } from 'react';
import { Copy, Check, Code, Gamepad2, FileCode2, Binary, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { GeneratedSignature } from '../../types';
import { useAppStore } from '../../stores/appStore';
import clsx from 'clsx';

interface SignatureCardProps {
  signature: GeneratedSignature;
  index: number;
  targetName?: string;
}

export function SignatureCard({ signature, index, targetName }: SignatureCardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { addToHistory, inputText, selectedTarget } = useAppStore();

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyAndSave = async () => {
    await navigator.clipboard.writeText(signature.pattern);
    setCopied('pattern');
    // Add to history
    addToHistory(targetName || selectedTarget || 'Unknown', signature, inputText);
    setTimeout(() => setCopied(null), 2000);
  };

  // Render pattern with highlighted wildcards
  const renderPattern = () => {
    const parts = signature.pattern.split(' ');
    return parts.map((part, i) => (
      <span
        key={i}
        className={clsx(
          part === '??' ? 'text-accent-pink font-semibold' : 'text-accent-green'
        )}
      >
        {part}{i < parts.length - 1 ? ' ' : ''}
      </span>
    ));
  };

  const stabilityColors = {
    high: 'text-accent-green bg-accent-green/20',
    medium: 'text-accent-yellow bg-accent-yellow/20',
    low: 'text-accent-pink bg-accent-pink/20',
  };

  return (
    <div className="bg-bg-tertiary border border-border-subtle rounded-lg p-4 hover:border-accent-green/50 transition-all animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-text-secondary">
            Variant {index}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-bg-elevated text-text-muted">
            {signature.strategy}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'text-xs px-2 py-0.5 rounded font-medium',
              stabilityColors[signature.stability]
            )}
          >
            {signature.stability}
          </span>
          <span className="text-sm font-mono font-bold text-accent-cyan">
            {Math.round(signature.uniqueness_score * 100)}%
          </span>
        </div>
      </div>

      {/* Pattern */}
      <div className="bg-bg-primary rounded p-3 mb-3 overflow-x-auto">
        <code className="font-mono text-sm whitespace-nowrap">
          {renderPattern()}
        </code>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
        <span>{signature.length} bytes</span>
        <span>{signature.wildcard_count} wildcards</span>
        <span>Mask: <code className="text-text-secondary">{signature.mask}</code></span>
      </div>

      {/* Summary - Always visible */}
      {signature.summary && (
        <div className="bg-bg-elevated/50 rounded p-3 mb-3 border border-border-subtle">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-accent-cyan mt-0.5 shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">{signature.summary}</p>
          </div>
        </div>
      )}

      {/* Detailed Wildcard Reasons - Expandable */}
      {signature.wildcard_reasons && signature.wildcard_reasons.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-cyan transition-colors"
          >
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDetails ? 'Hide' : 'Show'} detailed breakdown ({signature.wildcard_reasons.length} wildcarded positions)
          </button>

          {showDetails && (
            <div className="mt-2 bg-bg-primary rounded p-3 border border-border-subtle max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-muted border-b border-border-subtle">
                    <th className="text-left pb-2 font-medium">Pos</th>
                    <th className="text-left pb-2 font-medium">Type</th>
                    <th className="text-left pb-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {signature.wildcard_reasons.map((reason, i) => (
                    <tr key={i} className="border-b border-border-subtle/50 last:border-0">
                      <td className="py-1.5 text-accent-pink font-mono">{reason.position}</td>
                      <td className="py-1.5">
                        <span className={clsx(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          reason.reason === 'relative_jump' && 'bg-yellow-500/20 text-yellow-400',
                          reason.reason === 'relative_call' && 'bg-cyan-500/20 text-cyan-400',
                          reason.reason === 'stack_offset' && 'bg-purple-500/20 text-purple-400',
                          reason.reason === 'global_address' && 'bg-red-500/20 text-red-400',
                          reason.reason === 'immediate' && 'bg-orange-500/20 text-orange-400',
                          reason.reason === 'struct_offset' && 'bg-blue-500/20 text-blue-400',
                        )}>
                          {reason.reason.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-1.5 text-text-secondary">{reason.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCopyAndSave}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all',
            copied === 'pattern'
              ? 'bg-accent-green text-bg-primary'
              : 'bg-bg-elevated border border-border-subtle text-text-secondary hover:border-accent-green hover:text-accent-green'
          )}
          title="Copy pattern and save to history"
        >
          {copied === 'pattern' ? <Check size={12} /> : <Copy size={12} />}
          {copied === 'pattern' ? 'Saved!' : 'Copy'}
        </button>
        <button
          onClick={() => handleCopy(signature.mask, 'mask')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-bg-elevated border border-border-subtle text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-all"
        >
          <Binary size={12} />
          Mask
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-bg-elevated border border-border-subtle text-text-secondary hover:border-accent-yellow hover:text-accent-yellow transition-all"
        >
          <Code size={12} />
          IDA
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-bg-elevated border border-border-subtle text-text-secondary hover:border-accent-pink hover:text-accent-pink transition-all"
        >
          <Gamepad2 size={12} />
          CE
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-bg-elevated border border-border-subtle text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-all"
        >
          <FileCode2 size={12} />
          C++
        </button>
      </div>
    </div>
  );
}
