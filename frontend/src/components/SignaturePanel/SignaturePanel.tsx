import { useState, useCallback, useEffect } from 'react';
import { Play, ChevronDown, Crosshair, Loader2, Target, Zap } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { SignatureCard } from './SignatureCard';
import { parseInput, generateSignatures, generateTargeted, smartGenerate, smartAnalyze } from '../../services/api';
import type { SmartAnalysisResult } from '../../types';
import clsx from 'clsx';

export function SignaturePanel() {
  const {
    inputText,
    instructions,
    labels,
    signatures,
    selectedTarget,
    options,
    isLoading,
    error,
    setParseResults,
    setSignatures,
    setSelectedTarget,
    setIsLoading,
    setError,
  } = useAppStore();

  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [smartAnalysis, setSmartAnalysis] = useState<SmartAnalysisResult | null>(null);
  const [showSmartPanel, setShowSmartPanel] = useState(false);

  // Auto-parse when input changes
  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (!inputText.trim()) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const result = await parseInput(inputText);
        setParseResults(result);

        // Auto-select first label if available
        if (result.labels.length > 0 && !selectedTarget) {
          setSelectedTarget(result.labels[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Parse failed');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [inputText]);

  // Generate signatures for selected target
  const handleGenerate = useCallback(async () => {
    if (!instructions.length || !selectedTarget) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await generateSignatures(instructions, [selectedTarget], options);
      setSignatures(result.signatures);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [instructions, selectedTarget, options]);

  // Generate signatures from first instruction (Target Mode)
  const handleGenerateTargeted = useCallback(async () => {
    if (!instructions.length) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await generateTargeted(instructions, options);
      setSignatures(result.signatures);
      // Auto-select the target name from result
      const targetName = Object.keys(result.signatures)[0];
      if (targetName) {
        setSelectedTarget(targetName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Target generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [instructions, options]);

  // Smart Mode - analyze and generate from best targets
  const handleSmartGenerate = useCallback(async () => {
    if (!instructions.length) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First analyze to show results
      const analysis = await smartAnalyze(instructions);
      setSmartAnalysis(analysis);
      setShowSmartPanel(true);

      // Then generate signatures for top targets
      const result = await smartGenerate(instructions, options, 3);
      setSignatures(result.signatures);

      // Auto-select the first target
      const targetName = Object.keys(result.signatures)[0];
      if (targetName) {
        setSelectedTarget(targetName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Smart generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [instructions, options]);

  // Get all possible targets (labels + jumps + calls)
  const jumpTargets = instructions
    .filter((i) => i.type === 'conditional_jump' || i.type === 'unconditional_jump')
    .filter((i) => !i.label)
    .map((i) => `jump@${i.address}`);

  const callTargets = instructions
    .filter((i) => i.type === 'call')
    .filter((i) => !i.label)
    .map((i) => `call@${i.address}`);

  const allTargets = [...labels, ...jumpTargets, ...callTargets];

  const currentSignatures = selectedTarget ? signatures[selectedTarget] || [] : [];

  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-bg-tertiary border-b border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold tracking-wider uppercase text-text-secondary">
            Signature Results
          </span>
          {currentSignatures.length > 0 && (
            <span className="text-xs text-text-muted">
              {currentSignatures.length} variants
            </span>
          )}
        </div>

        {/* Target selector + Generate button */}
        <div className="flex gap-2">
          {/* Target dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
              disabled={!allTargets.length}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all',
                allTargets.length
                  ? 'bg-bg-elevated border-border-subtle text-text-primary hover:border-accent-green'
                  : 'bg-bg-elevated border-border-subtle text-text-muted cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-2">
                <Crosshair size={14} className="text-accent-yellow" />
                <span className="truncate">
                  {selectedTarget || 'Select target...'}
                </span>
              </div>
              <ChevronDown size={14} />
            </button>

            {/* Dropdown menu */}
            {targetDropdownOpen && allTargets.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-subtle rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {labels.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs text-text-muted uppercase tracking-wider">
                      Labels
                    </div>
                    {labels.map((label) => (
                      <button
                        key={label}
                        onClick={() => {
                          setSelectedTarget(label);
                          setTargetDropdownOpen(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors',
                          selectedTarget === label
                            ? 'text-accent-green'
                            : 'text-text-primary'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </>
                )}

                {jumpTargets.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs text-text-muted uppercase tracking-wider border-t border-border-subtle">
                      Jump Instructions ({jumpTargets.length})
                    </div>
                    {jumpTargets.map((target) => (
                      <button
                        key={target}
                        onClick={() => {
                          setSelectedTarget(target);
                          setTargetDropdownOpen(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-sm font-mono hover:bg-bg-tertiary transition-colors',
                          selectedTarget === target
                            ? 'text-accent-green'
                            : 'text-text-primary'
                        )}
                      >
                        {target}
                      </button>
                    ))}
                  </>
                )}

                {callTargets.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs text-text-muted uppercase tracking-wider border-t border-border-subtle">
                      Call Instructions ({callTargets.length})
                    </div>
                    {callTargets.map((target) => (
                      <button
                        key={target}
                        onClick={() => {
                          setSelectedTarget(target);
                          setTargetDropdownOpen(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-2 text-sm font-mono hover:bg-bg-tertiary transition-colors',
                          selectedTarget === target
                            ? 'text-accent-cyan'
                            : 'text-text-primary'
                        )}
                      >
                        {target}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Smart Mode button - Auto-find best targets */}
          <button
            onClick={handleSmartGenerate}
            disabled={!instructions.length || isLoading}
            title="Smart analyze and generate from best targets"
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all',
              instructions.length && !isLoading
                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 hover:bg-accent-cyan/30'
                : 'bg-bg-elevated text-text-muted cursor-not-allowed border border-border-subtle'
            )}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            <span className="hidden sm:inline">Smart</span>
          </button>

          {/* Target Mode button - Generate from first line */}
          <button
            onClick={handleGenerateTargeted}
            disabled={!instructions.length || isLoading}
            title="Generate signature from first instruction"
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all',
              instructions.length && !isLoading
                ? 'bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/50 hover:bg-accent-yellow/30'
                : 'bg-bg-elevated text-text-muted cursor-not-allowed border border-border-subtle'
            )}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Target size={16} />
            )}
            <span className="hidden sm:inline">Start</span>
          </button>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedTarget || isLoading}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm uppercase tracking-wide transition-all',
              selectedTarget && !isLoading
                ? 'bg-accent-green text-bg-primary hover:shadow-glow-green'
                : 'bg-bg-elevated text-text-muted cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-accent-pink/20 border border-accent-pink/50 text-accent-pink text-sm">
            {error}
          </div>
        )}

        {/* Smart Analysis Panel */}
        {showSmartPanel && smartAnalysis && (
          <div className="bg-bg-tertiary border border-accent-cyan/30 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-accent-cyan" />
                <span className="text-sm font-semibold text-accent-cyan">Smart Analysis</span>
              </div>
              <button
                onClick={() => setShowSmartPanel(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                Hide
              </button>
            </div>

            {/* Summary */}
            <p className="text-xs text-text-secondary mb-3">{smartAnalysis.analysis_summary}</p>

            {/* Stats */}
            <div className="flex gap-4 text-xs text-text-muted mb-3">
              <span>Analyzed: {smartAnalysis.total_instructions} instructions</span>
              <span>Avg Stability: {smartAnalysis.avg_stability}%</span>
              <span>Top Targets: {smartAnalysis.top_targets.length}</span>
            </div>

            {/* Top Targets */}
            {smartAnalysis.top_targets.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-text-secondary">Best Anchor Points:</span>
                <div className="grid gap-2">
                  {smartAnalysis.top_targets.slice(0, 5).map((target, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-bg-elevated rounded px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          'text-xs font-bold px-1.5 py-0.5 rounded',
                          target.score >= 70 ? 'bg-accent-green/20 text-accent-green' :
                          target.score >= 50 ? 'bg-accent-yellow/20 text-accent-yellow' :
                          'bg-accent-pink/20 text-accent-pink'
                        )}>
                          {Math.round(target.score)}
                        </span>
                        <span className="text-sm font-mono text-text-primary">
                          {target.mnemonic}
                        </span>
                        <span className="text-xs text-text-muted font-mono">
                          @{target.address}
                        </span>
                      </div>
                      <div className="flex gap-2 text-[10px]">
                        <span className="text-accent-green">S:{Math.round(target.stability_score)}</span>
                        <span className="text-accent-cyan">U:{Math.round(target.uniqueness_score)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stable Regions */}
            {smartAnalysis.stable_regions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <span className="text-xs font-medium text-text-secondary">
                  Stable Regions: {smartAnalysis.stable_regions.length} found
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {smartAnalysis.stable_regions.slice(0, 3).map((region, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-1 rounded bg-accent-green/10 text-accent-green font-mono"
                    >
                      {region.start_address} → {region.end_address} ({region.byte_count}B)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentSignatures.length > 0 ? (
          currentSignatures.map((sig, i) => (
            <SignatureCard key={i} signature={sig} index={i + 1} targetName={selectedTarget || undefined} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-muted py-12">
            <Crosshair size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Select a Target</p>
            <p className="text-sm">
              Choose a label, jump, or call from the dropdown
              <br />
              then click Generate
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
