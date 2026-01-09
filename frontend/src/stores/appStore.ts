import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Instruction,
  ParseStats,
  SignatureOptions,
  GeneratedSignature,
  WildcardRules,
} from '../types';

// History entry for signature tracking
export interface SignatureHistoryEntry {
  id: string;
  timestamp: number;
  target: string;
  signature: GeneratedSignature;
  inputPreview: string; // First 100 chars of input
}

interface AppState {
  // Editor state
  inputText: string;
  setInputText: (text: string) => void;

  // Parse results
  instructions: Instruction[];
  labels: string[];
  detectedFormat: string;
  moduleName: string | null;
  stats: ParseStats | null;
  setParseResults: (results: {
    instructions: Instruction[];
    labels: string[];
    format: string;
    module?: string;
    stats: ParseStats;
  }) => void;
  clearParseResults: () => void;

  // Signature options
  options: SignatureOptions;
  setOptions: (options: Partial<SignatureOptions>) => void;
  setWildcardRules: (rules: Partial<WildcardRules>) => void;
  resetOptions: () => void;

  // Selected targets (supports multi-select)
  selectedTarget: string | null;
  selectedTargets: string[];
  setSelectedTarget: (target: string | null) => void;
  toggleTargetSelection: (target: string) => void;
  clearTargetSelection: () => void;

  // Generated signatures
  signatures: Record<string, GeneratedSignature[]>;
  setSignatures: (sigs: Record<string, GeneratedSignature[]>) => void;
  clearSignatures: () => void;

  // Signature history
  signatureHistory: SignatureHistoryEntry[];
  addToHistory: (target: string, signature: GeneratedSignature, inputPreview: string) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  showOptions: boolean;
  setShowOptions: (show: boolean) => void;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
}

const DEFAULT_WILDCARD_RULES: WildcardRules = {
  relative_jumps: true,
  relative_calls: true,
  stack_offsets: true,
  global_addresses: true,
  immediates: false,
  struct_offsets: false,
  memory_displacements: false,
};

const DEFAULT_SIGNATURE_OPTIONS: SignatureOptions = {
  min_length: 20,
  max_length: 50,
  variants: 10,
  context_before: 0,
  context_after: 10,
  wildcard_rules: DEFAULT_WILDCARD_RULES,
};

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Editor state
      inputText: '',
      setInputText: (text) => set({ inputText: text }),

      // Parse results
      instructions: [],
      labels: [],
      detectedFormat: '',
      moduleName: null,
      stats: null,
      setParseResults: (results) =>
        set({
          instructions: results.instructions,
          labels: results.labels,
          detectedFormat: results.format,
          moduleName: results.module || null,
          stats: results.stats,
        }),
      clearParseResults: () =>
        set({
          instructions: [],
          labels: [],
          detectedFormat: '',
          moduleName: null,
          stats: null,
        }),

      // Signature options
      options: DEFAULT_SIGNATURE_OPTIONS,
      setOptions: (options) =>
        set((state) => ({
          options: { ...state.options, ...options },
        })),
      setWildcardRules: (rules) =>
        set((state) => ({
          options: {
            ...state.options,
            wildcard_rules: { ...state.options.wildcard_rules, ...rules },
          },
        })),
      resetOptions: () => set({ options: DEFAULT_SIGNATURE_OPTIONS }),

      // Selected targets (supports multi-select)
      selectedTarget: null,
      selectedTargets: [],
      setSelectedTarget: (target) => set({ selectedTarget: target, selectedTargets: target ? [target] : [] }),
      toggleTargetSelection: (target) =>
        set((state) => {
          const isSelected = state.selectedTargets.includes(target);
          if (isSelected) {
            const newTargets = state.selectedTargets.filter((t) => t !== target);
            return {
              selectedTargets: newTargets,
              selectedTarget: newTargets.length > 0 ? newTargets[newTargets.length - 1] : null,
            };
          } else {
            return {
              selectedTargets: [...state.selectedTargets, target],
              selectedTarget: target,
            };
          }
        }),
      clearTargetSelection: () => set({ selectedTarget: null, selectedTargets: [] }),

      // Generated signatures
      signatures: {},
      setSignatures: (sigs) => set({ signatures: sigs }),
      clearSignatures: () => set({ signatures: {} }),

      // Signature history
      signatureHistory: [],
      addToHistory: (target, signature, inputPreview) =>
        set((state) => {
          const entry: SignatureHistoryEntry = {
            id: generateId(),
            timestamp: Date.now(),
            target,
            signature,
            inputPreview: inputPreview.substring(0, 100),
          };
          // Keep last 50 entries
          const newHistory = [entry, ...state.signatureHistory].slice(0, 50);
          return { signatureHistory: newHistory };
        }),
      removeFromHistory: (id) =>
        set((state) => ({
          signatureHistory: state.signatureHistory.filter((h) => h.id !== id),
        })),
      clearHistory: () => set({ signatureHistory: [] }),

      // UI state
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      error: null,
      setError: (error) => set({ error }),
      showOptions: false,
      setShowOptions: (show) => set({ showOptions: show }),
      showHistory: false,
      setShowHistory: (show) => set({ showHistory: show }),
      showShortcuts: false,
      setShowShortcuts: (show) => set({ showShortcuts: show }),
    }),
    {
      name: 'signature-forge-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        inputText: state.inputText,
        options: state.options,
        signatureHistory: state.signatureHistory,
      }),
    }
  )
);
