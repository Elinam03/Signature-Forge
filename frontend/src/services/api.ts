import type {
  ParseResponse,
  GenerateResponse,
  SignatureOptions,
  Instruction,
  TargetSelection,
  ExportFormat,
  GeneratedSignature,
  SmartAnalysisResult,
} from '../types';

// Detect if running in Electron production mode
const isElectronProd = typeof window !== 'undefined' &&
  window.location.protocol === 'file:';

// In Electron production, use absolute URL to backend
const API_BASE = isElectronProd ? 'http://127.0.0.1:8000/api' : '/api';

// Parse disassembly input
export async function parseInput(
  inputText: string,
  format: string = 'auto'
): Promise<ParseResponse> {
  const response = await fetch(`${API_BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_text: inputText, format }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to parse input');
  }

  return response.json();
}

// Generate signatures
export async function generateSignatures(
  instructions: Instruction[],
  targets: TargetSelection,
  options: SignatureOptions
): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions, targets, options }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate signatures');
  }

  return response.json();
}

// Generate signatures from first instruction (Target Mode)
export async function generateTargeted(
  instructions: Instruction[],
  options: SignatureOptions
): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/generate-targeted`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions, targets: [], options }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate targeted signatures');
  }

  return response.json();
}

// Batch parse and generate
export async function batchGenerate(
  inputText: string,
  targets: TargetSelection = 'all_labeled',
  options: SignatureOptions,
  format: string = 'auto'
): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_text: inputText, targets, options, format }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate signatures');
  }

  return response.json();
}

// Export signatures
export async function exportSignatures(
  signatures: Record<string, GeneratedSignature[]>,
  format: ExportFormat,
  moduleName: string = 'game.exe'
): Promise<string> {
  const response = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signatures,
      format,
      module_name: moduleName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to export signatures');
  }

  return response.text();
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Smart analyze instructions
export async function smartAnalyze(
  instructions: Instruction[],
  maxTargets: number = 10
): Promise<SmartAnalysisResult> {
  const response = await fetch(`${API_BASE}/smart-analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions, max_targets: maxTargets }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze instructions');
  }

  return response.json();
}

// Smart generate signatures (auto-find best targets)
export async function smartGenerate(
  instructions: Instruction[],
  options: SignatureOptions,
  topN: number = 3
): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/smart-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions, options, top_n: topN }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate smart signatures');
  }

  return response.json();
}
