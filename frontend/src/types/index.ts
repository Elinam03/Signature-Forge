// Input format types
export type InputFormat = 'x64dbg' | 'cheatengine' | 'hex' | 'auto';

// Instruction type categories
export type InstructionType =
  | 'conditional_jump'
  | 'unconditional_jump'
  | 'call'
  | 'return'
  | 'mov'
  | 'arithmetic'
  | 'logic'
  | 'compare'
  | 'stack'
  | 'float'
  | 'string'
  | 'other';

// Volatility levels
export interface Volatility {
  opcode: 'low' | 'medium' | 'high';
  operand: 'low' | 'medium' | 'high';
}

// Parsed instruction
export interface Instruction {
  address: string;
  raw_address?: string;
  bytes: string[];
  mnemonic: string;
  operands: string;
  operands_normalized?: string;
  label?: string;
  comment?: string;
  type: InstructionType;
  size: number;
  volatility: Volatility;
  wildcard_positions: number[];
}

// Parse statistics
export interface ParseStats {
  total: number;
  by_type: Record<string, number>;
  labeled: number;
  total_bytes: number;
}

// Wildcard rules configuration
export interface WildcardRules {
  relative_jumps: boolean;
  relative_calls: boolean;
  stack_offsets: boolean;
  global_addresses: boolean;
  immediates: boolean;
  struct_offsets: boolean;
  memory_displacements: boolean;
}

// Signature generation options
export interface SignatureOptions {
  min_length: number;
  max_length: number;
  variants: number;
  context_before: number;
  context_after: number;
  wildcard_rules: WildcardRules;
}

// Wildcard reason explanation
export interface WildcardReason {
  position: number;
  reason: string;
  detail: string;
  instruction_address?: string;
}

// Generated signature variant
export interface GeneratedSignature {
  pattern: string;
  mask: string;
  bytes: (number | null)[];
  description: string;
  length: number;
  wildcard_count: number;
  wildcard_positions: number[];
  wildcard_reasons?: WildcardReason[];
  uniqueness_score: number;
  stability: 'high' | 'medium' | 'low';
  start_address?: string;
  end_address?: string;
  strategy: string;
  summary?: string;
}

// API Response types
export interface ParseResponse {
  instructions: Instruction[];
  labels: string[];
  format: string;
  module?: string;
  stats: ParseStats;
}

export interface GenerateResponse {
  signatures: Record<string, GeneratedSignature[]>;
  targets_processed: number;
  total_variants: number;
}

// Export format types
export type ExportFormat = 'aob' | 'mask' | 'ida' | 'cheatengine' | 'cpp' | 'x64dbg';

export interface ExportFormatInfo {
  id: ExportFormat;
  name: string;
  description: string;
  extension: string;
}

// Target selection types
export type TargetSelection = string[] | 'all_jumps' | 'all_calls' | 'all_labeled' | 'all';

// Smart analysis types
export interface SmartTarget {
  instruction_index: number;
  address: string;
  mnemonic: string;
  operands: string;
  score: number;
  stability_score: number;
  uniqueness_score: number;
  context_score: number;
  reasons: string[];
  warnings: string[];
}

export interface StableRegion {
  start_index: number;
  end_index: number;
  start_address: string;
  end_address: string;
  avg_score: number;
  byte_count: number;
}

export interface SmartAnalysisResult {
  top_targets: SmartTarget[];
  stable_regions: StableRegion[];
  analysis_summary: string;
  total_instructions: number;
  avg_stability: number;
}

// Default values
export const DEFAULT_WILDCARD_RULES: WildcardRules = {
  relative_jumps: true,
  relative_calls: true,
  stack_offsets: true,
  global_addresses: true,
  immediates: false,
  struct_offsets: false,
  memory_displacements: false,
};

export const DEFAULT_OPTIONS: SignatureOptions = {
  min_length: 20,
  max_length: 50,
  variants: 25,  // Increased for expanded strategies
  context_before: 0,
  context_after: 10,
  wildcard_rules: DEFAULT_WILDCARD_RULES,
};
