"""
Disassembly Parser Service

Parses input in three formats:
1. x64dbg/OllyDbg format (pipe-separated)
2. Cheat Engine format (dash-separated, Module+Offset)
3. Raw hex bytes (using Capstone for disassembly)
"""

import re
from typing import Optional
from capstone import Cs, CS_ARCH_X86, CS_MODE_32

from app.models.instruction import Instruction, InstructionType, Volatility, ParseStats
from app.services.analyzer import classify_instruction, get_volatility, analyze_wildcard_positions


# Regex patterns for parsing
X64DBG_PATTERN = re.compile(
    r'^([0-9A-Fa-f]+)\s*\|\s*'      # Address
    r'([0-9A-Fa-f\s]+?)\s*\|\s*'    # Bytes (hex, may have spaces)
    r'([a-zA-Z0-9]+)\s*'             # Mnemonic (may include numbers like movzx)
    r'([^|]*?)\s*'                   # Operands
    r'(?:\|\s*(.*))?$'               # Optional comment/label (can be empty)
)

CHEAT_ENGINE_PATTERN = re.compile(
    r'^([\w.]+\+[0-9A-Fa-f]+)\s*-\s*'  # Module+Offset
    r'([0-9A-Fa-f\s]+?)\s*-\s*'         # Bytes
    r'([a-zA-Z]+)\s*'                    # Mnemonic
    r'(.*)$'                             # Operands (rest of line)
)


def detect_format(input_text: str) -> str:
    """
    Auto-detect the input format based on content analysis.
    Returns: 'x64dbg', 'cheatengine', or 'hex'
    """
    lines = input_text.strip().split('\n')

    for line in lines:
        line = line.strip()
        if not line or line.startswith('//') or line.startswith('#'):
            continue

        # Check for x64dbg format: contains '|' separator
        if ' | ' in line or '\t|\t' in line:
            return 'x64dbg'

        # Check for Cheat Engine format: MODULE+OFFSET - BYTES - INSTRUCTION
        if re.match(r'^[\w.]+\+[0-9A-Fa-f]+\s+-\s+', line):
            return 'cheatengine'

        # Check for raw hex: only hex chars and whitespace
        hex_clean = line.replace(' ', '').replace('\t', '')
        if re.match(r'^[0-9A-Fa-f]+$', hex_clean):
            return 'hex'

        break

    # Default fallback
    return 'x64dbg'


def parse_ce_address(address_str: str) -> tuple[str, Optional[str]]:
    """
    Convert 'Apr24.2020.exe+46751D' to offset '0046751D' and module name
    """
    if '+' in address_str:
        module, offset = address_str.split('+', 1)
        return offset.upper().zfill(8), module
    return address_str, None


def normalize_memory_ref(operands: str, module_name: Optional[str]) -> str:
    """
    Convert CE-style memory refs to standard format.
    '[Apr24.2020.exe+57EF40]' -> 'ds:[0057EF40]'
    """
    if module_name and f'[{module_name}+' in operands:
        pattern = rf'\[{re.escape(module_name)}\+([0-9A-Fa-f]+)\]'
        operands = re.sub(pattern, r'ds:[\1]', operands)
    return operands


def parse_bytes_string(bytes_str: str) -> list[str]:
    """Parse hex bytes string into list of byte strings"""
    # Remove all whitespace and ensure uppercase
    clean = bytes_str.replace(' ', '').replace('\t', '').upper()

    # Split into pairs
    return [clean[i:i+2] for i in range(0, len(clean), 2) if len(clean[i:i+2]) == 2]


def parse_x64dbg_format(input_text: str) -> tuple[list[Instruction], list[str], Optional[str]]:
    """Parse x64dbg/OllyDbg format"""
    instructions = []
    labels = []

    for line in input_text.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('//') or line.startswith('#'):
            continue

        match = X64DBG_PATTERN.match(line)
        if not match:
            continue

        address = match.group(1).upper().zfill(8)
        bytes_list = parse_bytes_string(match.group(2))
        mnemonic = match.group(3).lower()
        operands = match.group(4).strip() if match.group(4) else ""
        comment = match.group(5).strip() if match.group(5) else None

        # Extract label from comment (if present)
        label = None
        if comment:
            # Check if comment looks like a label (no spaces, alphanumeric + underscore)
            if re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', comment):
                label = comment
                labels.append(label)

        # Classify instruction
        inst_type = classify_instruction(mnemonic)
        volatility = get_volatility(inst_type, operands)

        instruction = Instruction(
            address=address,
            bytes=bytes_list,
            mnemonic=mnemonic,
            operands=operands,
            label=label,
            comment=comment,
            type=inst_type,
            size=len(bytes_list),
            volatility=volatility,
            wildcard_positions=[]
        )

        # Analyze which bytes should be wildcarded
        instruction.wildcard_positions = analyze_wildcard_positions(instruction)

        instructions.append(instruction)

    return instructions, labels, None


def parse_cheat_engine_format(input_text: str) -> tuple[list[Instruction], list[str], Optional[str]]:
    """Parse Cheat Engine format"""
    instructions = []
    labels = []
    module_name = None

    for line in input_text.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('//') or line.startswith('#'):
            continue

        match = CHEAT_ENGINE_PATTERN.match(line)
        if not match:
            continue

        raw_address = match.group(1)
        address, detected_module = parse_ce_address(raw_address)

        if detected_module and not module_name:
            module_name = detected_module

        bytes_list = parse_bytes_string(match.group(2))
        mnemonic = match.group(3).lower()
        operands = match.group(4).strip() if match.group(4) else ""

        # Normalize memory references
        operands_normalized = normalize_memory_ref(operands, module_name)

        # Classify instruction
        inst_type = classify_instruction(mnemonic)
        volatility = get_volatility(inst_type, operands_normalized)

        instruction = Instruction(
            address=address,
            raw_address=raw_address,
            bytes=bytes_list,
            mnemonic=mnemonic,
            operands=operands,
            operands_normalized=operands_normalized,
            label=None,  # CE format doesn't have labels
            comment=None,
            type=inst_type,
            size=len(bytes_list),
            volatility=volatility,
            wildcard_positions=[]
        )

        # Analyze which bytes should be wildcarded
        instruction.wildcard_positions = analyze_wildcard_positions(instruction)

        instructions.append(instruction)

    return instructions, labels, module_name


def parse_hex_format(input_text: str) -> tuple[list[Instruction], list[str], Optional[str]]:
    """Parse raw hex bytes using Capstone disassembler"""
    instructions = []

    # Clean input - remove all whitespace and newlines
    hex_clean = input_text.replace(' ', '').replace('\n', '').replace('\t', '').replace('\r', '')

    # Convert to bytes
    try:
        code = bytes.fromhex(hex_clean)
    except ValueError:
        return [], [], None

    # Disassemble using Capstone (x86 32-bit)
    md = Cs(CS_ARCH_X86, CS_MODE_32)
    md.detail = True

    for inst in md.disasm(code, 0x00000000):
        bytes_list = [f'{b:02X}' for b in inst.bytes]
        mnemonic = inst.mnemonic.lower()
        operands = inst.op_str

        # Classify instruction
        inst_type = classify_instruction(mnemonic)
        volatility = get_volatility(inst_type, operands)

        instruction = Instruction(
            address=f'{inst.address:08X}',
            bytes=bytes_list,
            mnemonic=mnemonic,
            operands=operands,
            label=None,
            comment=None,
            type=inst_type,
            size=inst.size,
            volatility=volatility,
            wildcard_positions=[]
        )

        # Analyze which bytes should be wildcarded
        instruction.wildcard_positions = analyze_wildcard_positions(instruction)

        instructions.append(instruction)

    return instructions, [], None


def parse_input(input_text: str, format_hint: str = 'auto') -> tuple[list[Instruction], list[str], str, Optional[str]]:
    """
    Parse input based on detected or specified format.
    Returns: (instructions, labels, detected_format, module_name)
    """
    if format_hint == 'auto':
        format_hint = detect_format(input_text)

    if format_hint == 'x64dbg':
        instructions, labels, module = parse_x64dbg_format(input_text)
    elif format_hint == 'cheatengine':
        instructions, labels, module = parse_cheat_engine_format(input_text)
    elif format_hint == 'hex':
        instructions, labels, module = parse_hex_format(input_text)
    else:
        raise ValueError(f"Unknown format: {format_hint}")

    return instructions, labels, format_hint, module


def calculate_stats(instructions: list[Instruction], labels: list[str]) -> ParseStats:
    """Calculate statistics from parsed instructions"""
    by_type: dict[str, int] = {}
    total_bytes = 0

    for inst in instructions:
        type_name = inst.type.value
        by_type[type_name] = by_type.get(type_name, 0) + 1
        total_bytes += inst.size

    return ParseStats(
        total=len(instructions),
        by_type=by_type,
        labeled=len(labels),
        total_bytes=total_bytes
    )
