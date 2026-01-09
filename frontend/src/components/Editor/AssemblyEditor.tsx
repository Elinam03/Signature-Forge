import { useCallback, useRef, useEffect } from 'react';
import Editor, { type OnMount, useMonaco } from '@monaco-editor/react';
import { Trash2, FileCode, MousePointerClick, Layers } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import type { editor } from 'monaco-editor';
import { Tooltip } from '../ui/Tooltip';

// Sample data for demo
const SAMPLE_DATA = `00B27AB0 | 0F84 79050000 | je apr24.2020.B2802F | Lawnmower_A
00B27AB6 | 8B8D 2CFEFFFF | mov ecx,dword ptr ss:[ebp-1D4] |
00B27ABC | 81C1 CC060000 | add ecx,6CC |
00B27AC2 | 898D 34FCFFFF | mov dword ptr ss:[ebp-3CC],ecx |
00B27AC8 | 8B95 34FCFFFF | mov edx,dword ptr ss:[ebp-3CC] |
00B27ACE | 81C2 D6660000 | add edx,66D6 |
00B27AD4 | 8B85 34FCFFFF | mov eax,dword ptr ss:[ebp-3CC] |
00B27ADA | 8B08 | mov ecx,dword ptr ds:[eax] |
00B27ADC | 2BCA | sub ecx,edx |
00B27ADE | 8339 01 | cmp dword ptr ds:[ecx],1 |
00B27AE1 | 0F85 48050000 | jne apr24.2020.B2802F | Lawnmower_B
00B27AE7 | 8B95 28FEFFFF | mov edx,dword ptr ss:[ebp-1D8] |
00B27AED | 8A42 02 | mov al,byte ptr ds:[edx+2] |
00B27AF0 | 24 01 | and al,1 |
00B27AF2 | 0FB6C8 | movzx ecx,al |
00B27AF5 | 85C9 | test ecx,ecx |
00B27AF7 | 0F85 32050000 | jne apr24.2020.B2802F | Lawnmower_C`;


export function AssemblyEditor() {
  const {
    inputText,
    setInputText,
    detectedFormat,
    clearParseResults,
    clearSignatures,
    instructions,
    setSelectedTarget,
    toggleTargetSelection,
    selectedTarget,
    selectedTargets,
  } = useAppStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const monaco = useMonaco();
  const showBytePreview = true; // Can be made toggleable later

  // Register custom language for assembly highlighting
  useEffect(() => {
    if (monaco) {
      // Always define/update the theme first
      monaco.editor.defineTheme('signature-forge', {
        base: 'vs-dark',
        inherit: false,
        rules: [
          { token: '', foreground: 'E0E0E0' },
          { token: 'source', foreground: 'E0E0E0' },
          { token: 'text', foreground: 'E0E0E0' },
          { token: 'address', foreground: '7EC699' },
          { token: 'hex-byte', foreground: 'E8B87A' },
          { token: 'label', foreground: 'B8FF57', fontStyle: 'bold' },
          { token: 'memory', foreground: 'A5D6FF' },
          { token: 'jump-conditional', foreground: 'FFD700', fontStyle: 'bold' },
          { token: 'jump-unconditional', foreground: 'FFA500', fontStyle: 'bold' },
          { token: 'call', foreground: '00D9FF', fontStyle: 'bold' },
          { token: 'return', foreground: 'FF6B9D', fontStyle: 'bold' },
          { token: 'compare', foreground: 'FF8C42' },
          { token: 'stack', foreground: '4FC3F7' },
          { token: 'logic', foreground: 'D4A0FF' },
          { token: 'arithmetic', foreground: 'B8FF57' },
          { token: 'mov', foreground: 'F0E68C' },
          { token: 'register', foreground: '5ED9C5' },
          { token: 'size-specifier', foreground: '79B8FF' },
          { token: 'segment', foreground: 'D895E0' },
          { token: 'number', foreground: 'C5D8A8' },
          { token: 'delimiter', foreground: 'C0C0C0' },
          { token: 'operator', foreground: 'C0C0C0' },
          { token: 'identifier', foreground: 'E0E0E0' },
        ],
        colors: {
          'editor.background': '#0a0a0f',
          'editor.foreground': '#E0E0E0',
          'editor.lineHighlightBackground': '#1a1a25',
          'editor.selectionBackground': '#264F78',
          'editorLineNumber.foreground': '#6a6a7a',
          'editorLineNumber.activeForeground': '#B8FF57',
          'editorCursor.foreground': '#B8FF57',
          'editorGutter.background': '#0a0a0f',
        },
      });

      // Register assembly language if not exists
      if (!monaco.languages.getLanguages().some(l => l.id === 'x86asm')) {
        monaco.languages.register({ id: 'x86asm' });

        // Define tokens - use 'text' as default so unmatched tokens get colored
        monaco.languages.setMonarchTokensProvider('x86asm', {
          defaultToken: 'text',
          ignoreCase: true,

          // All mnemonics by category
          jumps: ['je', 'jne', 'jz', 'jnz', 'jg', 'jge', 'jl', 'jle', 'ja', 'jae', 'jb', 'jbe', 'jo', 'jno', 'js', 'jns', 'jp', 'jnp', 'jpe', 'jpo'],
          unconditionalJumps: ['jmp'],
          calls: ['call'],
          returns: ['ret', 'retn', 'retf'],
          movs: ['mov', 'movzx', 'movsx', 'lea', 'xchg'],
          arithmetic: ['add', 'sub', 'mul', 'imul', 'div', 'idiv', 'inc', 'dec', 'neg', 'adc', 'sbb'],
          logic: ['and', 'or', 'xor', 'not', 'shl', 'shr', 'sar', 'rol', 'ror'],
          compare: ['cmp', 'test'],
          stack: ['push', 'pop', 'pusha', 'popa', 'pushf', 'popf', 'pushfd', 'popfd'],
          registers: ['eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'ebp', 'esp', 'ax', 'bx', 'cx', 'dx', 'si', 'di', 'bp', 'sp', 'al', 'bl', 'cl', 'dl', 'ah', 'bh', 'ch', 'dh', 'rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'rbp', 'rsp'],

          tokenizer: {
            root: [
              // Address at start of line
              [/^[0-9A-Fa-f]{8}\b/, 'address'],

              // Hex bytes
              [/\b[0-9A-Fa-f]{2}\b/, 'hex-byte'],

              // Labels (at end after |)
              [/\|[^|]*$/, 'label'],

              // Memory operands
              [/\[.*?\]/, 'memory'],

              // Instructions by category
              [/\b(je|jne|jz|jnz|jg|jge|jl|jle|ja|jae|jb|jbe|jo|jno|js|jns|jp|jnp|jpe|jpo)\b/, 'jump-conditional'],
              [/\bjmp\b/, 'jump-unconditional'],
              [/\bcall\b/, 'call'],
              [/\b(ret|retn|retf)\b/, 'return'],
              [/\b(cmp|test)\b/, 'compare'],
              [/\b(push|pop|pusha|popa)\b/, 'stack'],
              [/\b(and|or|xor|not|shl|shr|sar|rol|ror)\b/, 'logic'],
              [/\b(add|sub|mul|imul|div|idiv|inc|dec|neg)\b/, 'arithmetic'],
              [/\b(mov|movzx|movsx|lea|xchg)\b/, 'mov'],

              // Registers
              [/\b(eax|ebx|ecx|edx|esi|edi|ebp|esp|ax|bx|cx|dx|al|bl|cl|dl|ah|bh|ch|dh)\b/, 'register'],

              // Size specifiers
              [/\b(dword|word|byte|qword)\b/, 'size-specifier'],
              [/\bptr\b/, 'size-specifier'],

              // Segment prefixes
              [/\b(ss|ds|es|cs|fs|gs):/, 'segment'],

              // Numbers
              [/\b0x[0-9A-Fa-f]+\b/, 'number'],
              [/\b[0-9]+\b/, 'number'],
            ],
          },
        });
      }
    }
  }, [monaco]);

  // Update decorations when instructions change or target is selected
  useEffect(() => {
    if (!editorRef.current || !monaco) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    const newDecorations: editor.IModelDeltaDecoration[] = [];
    const lines = model.getLinesContent();

    // Create decorations based on parsed instructions
    instructions.forEach((inst) => {
      // Find the line containing this instruction's address
      const lineIndex = lines.findIndex(line =>
        line.toLowerCase().includes(inst.address.toLowerCase())
      );

      if (lineIndex === -1) return;
      const lineNumber = lineIndex + 1;

      // Determine if this line is a target (labeled or selected)
      const isLabel = !!inst.label;
      const targetId = inst.label ||
        (inst.type === 'conditional_jump' || inst.type === 'unconditional_jump'
          ? `jump@${inst.address}`
          : inst.type === 'call'
            ? `call@${inst.address}`
            : null);
      const isSelected = targetId && selectedTarget === targetId;
      const isMultiSelected = targetId && selectedTargets.includes(targetId);

      // Line decoration for instruction type
      newDecorations.push({
        range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: isSelected
            ? 'selected-target-line'
            : isMultiSelected
              ? 'multi-selected-line'
              : isLabel
                ? 'labeled-line'
                : undefined,
          glyphMarginClassName: isLabel
            ? 'glyph-label'
            : (inst.type === 'conditional_jump' || inst.type === 'unconditional_jump')
              ? 'glyph-jump'
              : inst.type === 'call'
                ? 'glyph-call'
                : undefined,
          linesDecorationsClassName: inst.type !== 'other' && inst.type !== 'mov'
            ? `line-deco-${inst.type}`
            : undefined,
        },
      });

      // Add inline byte preview for instructions (hover on glyph margin)
      if (showBytePreview && inst.bytes && inst.bytes.length > 0) {
        const hasWildcard = inst.wildcard_positions && inst.wildcard_positions.length > 0;
        newDecorations.push({
          range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 },
          options: {
            glyphMarginHoverMessage: {
              value: `**Bytes:** \`${inst.bytes.join(' ')}\`\n\n**Size:** ${inst.size} bytes\n\n**Volatility:** Opcode=${inst.volatility.opcode}, Operand=${inst.volatility.operand}${hasWildcard ? `\n\n**Wildcard positions:** ${inst.wildcard_positions.join(', ')}` : ''}`
            },
          },
        });
      }

      // Add inline decoration for labels
      if (isLabel) {
        newDecorations.push({
          range: { startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: model.getLineMaxColumn(lineNumber) },
          options: {
            after: {
              content: ` ← ${inst.label}`,
              inlineClassName: 'label-inline-hint',
            },
          },
        });
      }
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [instructions, selectedTarget, selectedTargets, monaco, showBytePreview]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Handle click-to-select-target (with Shift for multi-select)
    editor.onMouseDown((e) => {
      if (e.target.type !== monaco?.editor.MouseTargetType.CONTENT_TEXT &&
          e.target.type !== monaco?.editor.MouseTargetType.GUTTER_LINE_NUMBERS &&
          e.target.type !== monaco?.editor.MouseTargetType.GUTTER_LINE_DECORATIONS &&
          e.target.type !== monaco?.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        return;
      }

      const lineNumber = e.target.position?.lineNumber || e.target.range?.startLineNumber;
      if (!lineNumber) return;

      const model = editor.getModel();
      if (!model) return;

      const lineContent = model.getLineContent(lineNumber);

      // Find the instruction at this line
      const inst = instructions.find(i =>
        lineContent.toLowerCase().includes(i.address.toLowerCase())
      );

      if (inst) {
        // Determine the target identifier
        let targetId: string | null = null;

        if (inst.label) {
          targetId = inst.label;
        } else if (inst.type === 'conditional_jump' || inst.type === 'unconditional_jump') {
          targetId = `jump@${inst.address}`;
        } else if (inst.type === 'call') {
          targetId = `call@${inst.address}`;
        }

        if (targetId) {
          // Check if Shift is held for multi-select
          if (e.event.shiftKey) {
            toggleTargetSelection(targetId);
          } else {
            setSelectedTarget(targetId);
          }
        }
      }
    });
  };

  const handleChange = useCallback(
    (value: string | undefined) => {
      setInputText(value || '');
    },
    [setInputText]
  );

  const handleClear = () => {
    setInputText('');
    clearParseResults();
    clearSignatures();
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_DATA);
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg border border-border-subtle overflow-hidden relative">
      {/* Inject custom styles for decorations */}
      <style>{`
        .selected-target-line {
          background-color: rgba(184, 255, 87, 0.2) !important;
          border-left: 3px solid #B8FF57 !important;
        }
        .labeled-line {
          background-color: rgba(184, 255, 87, 0.08) !important;
        }
        .glyph-label::before {
          content: '◆';
          color: #B8FF57;
          font-size: 10px;
          margin-left: 4px;
        }
        .glyph-jump::before {
          content: '↗';
          color: #FFD700;
          font-size: 12px;
          margin-left: 4px;
        }
        .glyph-call::before {
          content: '→';
          color: #00D9FF;
          font-size: 12px;
          margin-left: 4px;
        }
        .label-inline-hint {
          color: #6A9955 !important;
          font-style: italic;
          font-size: 0.9em;
        }
        .line-deco-conditional_jump { border-left: 2px solid #FFD700 !important; }
        .line-deco-unconditional_jump { border-left: 2px solid #FFA500 !important; }
        .line-deco-call { border-left: 2px solid #00D9FF !important; }
        .line-deco-return { border-left: 2px solid #FF6B9D !important; }
        .line-deco-compare { border-left: 2px solid #FF8C42 !important; }
        .line-deco-stack { border-left: 2px solid #4FC3F7 !important; }
        .multi-selected-line {
          background-color: rgba(0, 217, 255, 0.15) !important;
          border-left: 3px solid #00D9FF !important;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-tertiary border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider uppercase text-text-secondary">
            Assembly Input
          </span>
          {detectedFormat && (
            <span className="px-2 py-0.5 text-xs rounded bg-accent-green/20 text-accent-green">
              {detectedFormat}
            </span>
          )}
          {instructions.length > 0 && (
            <>
              <Tooltip content="Click any instruction line to select it as a target. Hold Shift to multi-select." position="right">
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-accent-cyan/20 text-accent-cyan cursor-help">
                  <MousePointerClick size={12} />
                  Click-to-Target
                </span>
              </Tooltip>
              {selectedTargets.length > 1 && (
                <Tooltip content={`${selectedTargets.length} targets selected. Generate will create signatures for all.`} position="right">
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-accent-yellow/20 text-accent-yellow cursor-help">
                    <Layers size={12} />
                    {selectedTargets.length} Selected
                  </span>
                </Tooltip>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-bg-elevated border border-border-subtle text-text-secondary hover:border-accent-cyan hover:text-accent-cyan transition-all"
          >
            <FileCode size={14} />
            Load Example
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-bg-elevated border border-border-subtle text-text-secondary hover:border-accent-pink hover:text-accent-pink transition-all"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Legend */}
      {instructions.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-bg-tertiary/50 border-b border-border-subtle text-xs overflow-x-auto">
          <span className="text-text-muted shrink-0">Types:</span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FFD700' }} />
            <span className="text-text-secondary">Cond Jump</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FFA500' }} />
            <span className="text-text-secondary">Jump</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00D9FF' }} />
            <span className="text-text-secondary">Call</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF6B9D' }} />
            <span className="text-text-secondary">Return</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#B8FF57' }} />
            <span className="text-text-secondary">Label</span>
          </span>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={monaco ? 'x86asm' : 'plaintext'}
          theme={monaco ? 'signature-forge' : 'vs-dark'}
          value={inputText}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            glyphMargin: true,
            lineDecorationsWidth: 8,
            folding: false,
          }}
        />
      </div>

      {/* Empty state */}
      {!inputText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '120px' }}>
          <div className="text-center text-text-muted">
            <FileCode size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Paste Assembly</p>
            <p className="text-sm">
              Paste x64dbg/OllyDbg output or raw hex bytes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
