import { X, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { InfoTooltip } from '../ui/Tooltip';
import clsx from 'clsx';

// Tooltip content for all settings
const TOOLTIPS = {
  minLength: "Minimum number of bytes in the generated signature. Shorter signatures are faster to scan but may have more false positives. Recommended: 16-20 bytes",
  maxLength: "Maximum bytes to include. Longer signatures are more unique but may break if code changes. Recommended: 40-60 bytes",
  variants: "Number of different signature versions to generate. More variants give you backup options if one breaks. Recommended: 5-10",
  contextBefore: "How many instructions BEFORE the target to include. Useful when the target itself has volatile bytes. Range: 0-10",
  contextAfter: "How many instructions AFTER the target to include. More context = more unique but less stable. Range: 0-20",
  // Wildcard rules
  relativeJumps: "Wildcard the offset bytes in JE, JNE, JMP instructions. These change when code moves. Strongly recommended: ON",
  relativeCalls: "Wildcard the offset bytes in CALL instructions. These point to function addresses that shift between versions. Strongly recommended: ON",
  stackOffsets: "Wildcard [ebp-X] and [esp+X] displacements. These change when local variables are added/removed. Recommended: ON",
  globalAddresses: "Wildcard absolute memory addresses like [0x12345678]. These are module-base-dependent. Recommended: ON",
  immediates: "Wildcard constant values in instructions like 'mov eax, 1234'. Usually stable but can change. Default: OFF",
  structOffsets: "Wildcard small displacements like [eax+8] that often represent struct field offsets. Can change if structs are modified. Default: OFF",
  memoryDisplacements: "Wildcard all memory operation displacements. Very aggressive - use only if other options fail. Default: OFF",
};

export function OptionsPanel() {
  const { options, setOptions, setWildcardRules, resetOptions, showOptions, setShowOptions } =
    useAppStore();

  if (!showOptions) return null;

  const toggleRule = (rule: keyof typeof options.wildcard_rules) => {
    setWildcardRules({ [rule]: !options.wildcard_rules[rule] });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setShowOptions(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-bg-secondary border-l border-border-subtle h-full overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-bg-secondary border-b border-border-subtle p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-accent-green">⚙</span>
            Signature Options
          </h2>
          <button
            onClick={() => setShowOptions(false)}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Signature Length */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Signature Length
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-text-muted flex items-center gap-1.5">
                    Minimum
                    <InfoTooltip content={TOOLTIPS.minLength} position="right" />
                  </span>
                  <span className="text-accent-green font-mono">{options.min_length} bytes</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="100"
                  value={options.min_length}
                  onChange={(e) => setOptions({ min_length: parseInt(e.target.value) })}
                  className="w-full h-1 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-green"
                />
              </div>
              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-text-muted flex items-center gap-1.5">
                    Maximum
                    <InfoTooltip content={TOOLTIPS.maxLength} position="right" />
                  </span>
                  <span className="text-accent-green font-mono">{options.max_length} bytes</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={options.max_length}
                  onChange={(e) => setOptions({ max_length: parseInt(e.target.value) })}
                  className="w-full h-1 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-green"
                />
              </div>
            </div>
          </div>

          {/* Variants */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Variants
            </h3>
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-text-muted flex items-center gap-1.5">
                Count
                <InfoTooltip content={TOOLTIPS.variants} position="right" />
              </span>
              <span className="text-accent-green font-mono">{options.variants}</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={options.variants}
              onChange={(e) => setOptions({ variants: parseInt(e.target.value) })}
              className="w-full h-1 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-green"
            />
          </div>

          {/* Context */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Context
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-text-muted flex items-center gap-1.5">
                    Instructions Before
                    <InfoTooltip content={TOOLTIPS.contextBefore} position="right" />
                  </span>
                  <span className="text-accent-green font-mono">{options.context_before}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={options.context_before}
                  onChange={(e) => setOptions({ context_before: parseInt(e.target.value) })}
                  className="w-full h-1 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-green"
                />
              </div>
              <div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-text-muted flex items-center gap-1.5">
                    Bytes After
                    <InfoTooltip content={TOOLTIPS.contextAfter} position="right" />
                  </span>
                  <span className="text-accent-green font-mono">{options.context_after}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={options.context_after}
                  onChange={(e) => setOptions({ context_after: parseInt(e.target.value) })}
                  className="w-full h-1 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent-green"
                />
              </div>
            </div>
          </div>

          {/* Wildcard Rules */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Wildcard Rules
            </h3>
            <div className="space-y-2">
              {[
                { key: 'relative_jumps', label: 'Relative Jumps', desc: 'JE, JNE, JMP offset bytes', tooltip: TOOLTIPS.relativeJumps, recommended: true },
                { key: 'relative_calls', label: 'Relative Calls', desc: 'CALL offset bytes', tooltip: TOOLTIPS.relativeCalls, recommended: true },
                { key: 'stack_offsets', label: 'Stack Offsets', desc: '[ebp-X], [esp+X] displacements', tooltip: TOOLTIPS.stackOffsets, recommended: true },
                { key: 'global_addresses', label: 'Global Addresses', desc: 'Absolute memory addresses', tooltip: TOOLTIPS.globalAddresses, recommended: true },
                { key: 'immediates', label: 'Immediate Values', desc: 'Constant operands', tooltip: TOOLTIPS.immediates, recommended: false },
                { key: 'struct_offsets', label: 'Struct Offsets', desc: '[reg+X] small offsets', tooltip: TOOLTIPS.structOffsets, recommended: false },
                { key: 'memory_displacements', label: 'All Memory Displacements', desc: 'Very aggressive wildcarding', tooltip: TOOLTIPS.memoryDisplacements, recommended: false },
              ].map(({ key, label, desc, tooltip, recommended }) => (
                <button
                  key={key}
                  onClick={() => toggleRule(key as keyof typeof options.wildcard_rules)}
                  className={clsx(
                    'w-full flex items-center justify-between p-3 rounded-lg border transition-all',
                    options.wildcard_rules[key as keyof typeof options.wildcard_rules]
                      ? 'bg-accent-green/10 border-accent-green/50'
                      : 'bg-bg-tertiary border-border-subtle hover:border-border-default'
                  )}
                >
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      {label}
                      {recommended && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan uppercase font-semibold">
                          rec
                        </span>
                      )}
                      <InfoTooltip content={tooltip} position="right" />
                    </div>
                    <div className="text-xs text-text-muted">{desc}</div>
                  </div>
                  <div
                    className={clsx(
                      'w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ml-3',
                      options.wildcard_rules[key as keyof typeof options.wildcard_rules]
                        ? 'bg-accent-green'
                        : 'bg-bg-elevated'
                    )}
                  >
                    <div
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                        options.wildcard_rules[key as keyof typeof options.wildcard_rules]
                          ? 'left-5'
                          : 'left-1'
                      )}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Quick Presets
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setWildcardRules({
                    relative_jumps: true,
                    relative_calls: true,
                    stack_offsets: false,
                    global_addresses: false,
                    immediates: false,
                    struct_offsets: false,
                    memory_displacements: false,
                  });
                }}
                className="p-2 text-xs rounded-lg border border-border-subtle bg-bg-tertiary hover:border-accent-green hover:text-accent-green transition-all"
              >
                Minimal
              </button>
              <button
                onClick={() => {
                  setWildcardRules({
                    relative_jumps: true,
                    relative_calls: true,
                    stack_offsets: true,
                    global_addresses: true,
                    immediates: false,
                    struct_offsets: false,
                    memory_displacements: false,
                  });
                }}
                className="p-2 text-xs rounded-lg border border-border-subtle bg-bg-tertiary hover:border-accent-cyan hover:text-accent-cyan transition-all"
              >
                Balanced
              </button>
              <button
                onClick={() => {
                  setWildcardRules({
                    relative_jumps: true,
                    relative_calls: true,
                    stack_offsets: true,
                    global_addresses: true,
                    immediates: true,
                    struct_offsets: true,
                    memory_displacements: true,
                  });
                }}
                className="p-2 text-xs rounded-lg border border-border-subtle bg-bg-tertiary hover:border-accent-pink hover:text-accent-pink transition-all"
              >
                Aggressive
              </button>
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={resetOptions}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-border-subtle text-text-secondary hover:border-accent-pink hover:text-accent-pink transition-all"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
