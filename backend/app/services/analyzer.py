"""
Instruction Analyzer Service

Handles:
- Instruction classification by type
- Volatility analysis
- Wildcard position determination based on x86 encoding
"""

from app.models.instruction import Instruction, InstructionType, Volatility


# Instruction categories mapping
INSTRUCTION_CATEGORIES = {
    'conditional_jump': [
        'je', 'jne', 'jz', 'jnz', 'ja', 'jae', 'jb', 'jbe',
        'jg', 'jge', 'jl', 'jle', 'jo', 'jno', 'js', 'jns',
        'jp', 'jnp', 'jpe', 'jpo', 'jecxz', 'jcxz', 'loop',
        'loope', 'loopne', 'loopz', 'loopnz'
    ],
    'unconditional_jump': ['jmp'],
    'call': ['call'],
    'return': ['ret', 'retn', 'retf', 'iret', 'iretd'],
    'mov': [
        'mov', 'movzx', 'movsx', 'movss', 'movsd', 'movaps',
        'movups', 'movdqa', 'movdqu', 'lea', 'xchg', 'cmove',
        'cmovne', 'cmovz', 'cmovnz', 'cmova', 'cmovae', 'cmovb',
        'cmovbe', 'cmovg', 'cmovge', 'cmovl', 'cmovle', 'cmovo',
        'cmovno', 'cmovs', 'cmovns', 'cmovp', 'cmovnp', 'movsb',
        'movsw', 'movsd', 'movsq'
    ],
    'arithmetic': [
        'add', 'sub', 'mul', 'imul', 'div', 'idiv', 'inc',
        'dec', 'neg', 'adc', 'sbb', 'addss', 'subss', 'mulss',
        'divss', 'addsd', 'subsd', 'mulsd', 'divsd'
    ],
    'logic': [
        'and', 'or', 'xor', 'not', 'shl', 'shr', 'sal',
        'sar', 'rol', 'ror', 'rcl', 'rcr', 'bt', 'bts',
        'btr', 'btc', 'bsf', 'bsr'
    ],
    'compare': ['cmp', 'test', 'comiss', 'comisd', 'ucomiss', 'ucomisd'],
    'stack': [
        'push', 'pop', 'pusha', 'pushad', 'popa', 'popad',
        'pushf', 'pushfd', 'popf', 'popfd', 'enter', 'leave'
    ],
    'float': [
        'fld', 'fst', 'fstp', 'fadd', 'fsub', 'fmul', 'fdiv',
        'fcom', 'fcomp', 'fcompp', 'fcomi', 'fcomip', 'fucomi',
        'fucomip', 'fxch', 'fild', 'fist', 'fistp', 'finit',
        'fninit', 'fstsw', 'fnstsw', 'fstcw', 'fnstcw', 'fldcw',
        'addss', 'subss', 'mulss', 'divss', 'addsd', 'subsd',
        'mulsd', 'divsd', 'cvtsi2ss', 'cvtsi2sd', 'cvtss2si',
        'cvtsd2si', 'cvtss2sd', 'cvtsd2ss'
    ],
    'string': [
        'movs', 'cmps', 'scas', 'lods', 'stos', 'rep', 'repe',
        'repz', 'repne', 'repnz', 'movsb', 'movsw', 'movsd',
        'cmpsb', 'cmpsw', 'cmpsd', 'scasb', 'scasw', 'scasd',
        'lodsb', 'lodsw', 'lodsd', 'stosb', 'stosw', 'stosd'
    ]
}

# Short jump opcodes (1-byte offset)
SHORT_JUMP_OPCODES = [
    0xEB,  # JMP short
    0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77,  # Jcc short
    0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,  # Jcc short
    0xE0, 0xE1, 0xE2, 0xE3  # LOOPNE, LOOPE, LOOP, JECXZ
]

# Near conditional jump opcodes (0F 8x - 4-byte offset)
NEAR_CONDITIONAL_OPCODES = list(range(0x80, 0x90))  # 0x80 - 0x8F


def classify_instruction(mnemonic: str) -> InstructionType:
    """Classify an instruction by its mnemonic"""
    mnemonic_lower = mnemonic.lower()

    for category, mnemonics in INSTRUCTION_CATEGORIES.items():
        if mnemonic_lower in mnemonics:
            return InstructionType(category)

    return InstructionType.OTHER


def get_volatility(inst_type: InstructionType, operands: str) -> Volatility:
    """
    Determine volatility based on instruction type and operands.

    Opcode volatility: How likely the opcode bytes change
    Operand volatility: How likely the operand bytes change
    """
    # Default volatility
    opcode_vol = "low"
    operand_vol = "low"

    # Jumps and calls have high operand volatility (relative offsets change)
    if inst_type in [InstructionType.CONDITIONAL_JUMP, InstructionType.UNCONDITIONAL_JUMP, InstructionType.CALL]:
        operand_vol = "high"

    # MOV instructions - check for memory references
    elif inst_type == InstructionType.MOV:
        if 'ebp' in operands or 'esp' in operands:
            operand_vol = "high"  # Stack frame references
        elif 'ds:' in operands or '[' in operands:
            if '+' in operands and 'ebp' not in operands and 'esp' not in operands:
                operand_vol = "medium"  # Struct offsets
            else:
                operand_vol = "high"  # Global addresses

    # Arithmetic with immediate values
    elif inst_type == InstructionType.ARITHMETIC:
        if any(c.isdigit() for c in operands):
            operand_vol = "medium"

    return Volatility(opcode=opcode_vol, operand=operand_vol)


def analyze_wildcard_positions(inst: Instruction) -> list[int]:
    """
    Analyze an instruction and return byte positions that should be wildcarded.

    This is the core logic for understanding x86 instruction encoding.
    """
    positions = []
    bytes_list = inst.bytes
    mnemonic = inst.mnemonic.lower()

    if not bytes_list:
        return positions

    first_byte = int(bytes_list[0], 16)

    # === RELATIVE JUMPS AND CALLS ===

    # Short jump (2 bytes: opcode + 1-byte offset)
    if first_byte in SHORT_JUMP_OPCODES and len(bytes_list) == 2:
        positions.append(1)  # Wildcard the 1-byte offset

    # Near call E8 (5 bytes: opcode + 4-byte offset)
    elif first_byte == 0xE8 and len(bytes_list) == 5:
        positions.extend([1, 2, 3, 4])  # Wildcard the 4-byte offset

    # Near jump E9 (5 bytes: opcode + 4-byte offset)
    elif first_byte == 0xE9 and len(bytes_list) == 5:
        positions.extend([1, 2, 3, 4])  # Wildcard the 4-byte offset

    # Near conditional jump 0F 8x (6 bytes: 0F + opcode + 4-byte offset)
    elif first_byte == 0x0F and len(bytes_list) >= 2:
        second_byte = int(bytes_list[1], 16)
        if second_byte in NEAR_CONDITIONAL_OPCODES and len(bytes_list) == 6:
            positions.extend([2, 3, 4, 5])  # Wildcard the 4-byte offset

    # === MEMORY REFERENCES ===

    # Check for stack frame references [ebp-X] or [esp+X]
    if 'ebp' in inst.operands or 'esp' in inst.operands:
        stack_positions = find_stack_displacement_positions(inst)
        positions.extend(stack_positions)

    # Check for absolute/global addresses
    elif 'ds:[' in inst.operands or ('ds:' in inst.operands and '[' in inst.operands):
        # Look for global data references like A1 XX XX XX XX or 8B 05/0D/15 XX XX XX XX
        global_positions = find_global_address_positions(inst)
        positions.extend(global_positions)

    return list(set(positions))  # Remove duplicates


def find_stack_displacement_positions(inst: Instruction) -> list[int]:
    """
    Find byte positions containing stack frame displacements.

    For [ebp-XXX] or [esp+XXX], we need to find the ModR/M byte
    and determine where the displacement starts.
    """
    positions = []
    bytes_list = inst.bytes

    if len(bytes_list) < 3:
        return positions

    # Skip prefix bytes and opcode to find ModR/M
    start_idx = 1  # Usually ModR/M is at index 1

    # Handle 2-byte opcodes starting with 0F
    if int(bytes_list[0], 16) == 0x0F:
        start_idx = 2

    # Handle instructions with prefixes (F2, F3, 66)
    first_byte = int(bytes_list[0], 16)
    if first_byte in [0xF2, 0xF3, 0x66]:
        start_idx = 2
        if len(bytes_list) > 2 and int(bytes_list[1], 16) == 0x0F:
            start_idx = 3

    if start_idx >= len(bytes_list):
        return positions

    # Parse ModR/M byte
    modrm = int(bytes_list[start_idx], 16)
    mod = (modrm >> 6) & 0x03
    rm = modrm & 0x07

    # Calculate displacement position
    disp_start = start_idx + 1

    # Check for SIB byte (needed when R/M = 100 in 32-bit mode)
    has_sib = (mod != 3) and (rm == 4)
    if has_sib:
        disp_start += 1

    # Determine displacement size based on Mod
    if mod == 1:  # 8-bit displacement
        if disp_start < len(bytes_list):
            positions.append(disp_start)
    elif mod == 2:  # 32-bit displacement
        for i in range(4):
            if disp_start + i < len(bytes_list):
                positions.append(disp_start + i)
    elif mod == 0 and rm == 5:  # Special case: disp32 without base
        for i in range(4):
            if disp_start + i < len(bytes_list):
                positions.append(disp_start + i)

    return positions


def find_global_address_positions(inst: Instruction) -> list[int]:
    """
    Find byte positions containing global/absolute addresses.

    Common patterns:
    - A1 XX XX XX XX        MOV EAX, [moffs32]
    - A3 XX XX XX XX        MOV [moffs32], EAX
    - 8B 05 XX XX XX XX     MOV EAX, [disp32]
    - 8B 0D XX XX XX XX     MOV ECX, [disp32]
    - 8B 15 XX XX XX XX     MOV EDX, [disp32]
    - 8B 1D XX XX XX XX     MOV EBX, [disp32]
    - 8B 35 XX XX XX XX     MOV ESI, [disp32]
    - 8B 3D XX XX XX XX     MOV EDI, [disp32]
    """
    positions = []
    bytes_list = inst.bytes

    if not bytes_list:
        return positions

    first_byte = int(bytes_list[0], 16)

    # MOV EAX, moffs32 (A1) or MOV moffs32, EAX (A3)
    if first_byte in [0xA1, 0xA3] and len(bytes_list) == 5:
        positions.extend([1, 2, 3, 4])
        return positions

    # Check for MOV with ModR/M byte indicating [disp32]
    if len(bytes_list) >= 6:
        # Instructions like 8B 05 XX XX XX XX (MOV reg, [disp32])
        modrm_idx = 1
        if first_byte == 0x0F:
            modrm_idx = 2

        if modrm_idx < len(bytes_list):
            modrm = int(bytes_list[modrm_idx], 16)
            mod = (modrm >> 6) & 0x03
            rm = modrm & 0x07

            # Mod=00 and R/M=101 means [disp32] (no base register)
            if mod == 0 and rm == 5:
                disp_start = modrm_idx + 1
                for i in range(4):
                    if disp_start + i < len(bytes_list):
                        positions.append(disp_start + i)

    return positions


def find_immediate_positions(inst: Instruction) -> list[int]:
    """
    Find byte positions containing immediate values.

    This is used for the optional 'immediates' wildcard rule.
    """
    positions = []
    bytes_list = inst.bytes

    # This is complex because we need to know the instruction encoding
    # to determine where the immediate starts.
    # For simplicity, we'll look for common patterns.

    mnemonic = inst.mnemonic.lower()

    # ADD/SUB/CMP/etc with immediate
    if mnemonic in ['add', 'sub', 'cmp', 'and', 'or', 'xor', 'test']:
        # Check if operand contains a hex number (immediate)
        if ',' in inst.operands:
            parts = inst.operands.split(',')
            if len(parts) == 2:
                imm_part = parts[1].strip()
                # If second operand looks like an immediate (not a register or memory)
                if imm_part.isdigit() or imm_part.startswith('0x') or imm_part.startswith('-'):
                    # Immediate is typically at the end
                    # Size depends on the opcode
                    if len(bytes_list) > 2:
                        # Guess: last 1-4 bytes are immediate
                        if len(bytes_list) >= 6:  # 32-bit immediate
                            positions.extend(list(range(len(bytes_list) - 4, len(bytes_list))))
                        elif len(bytes_list) >= 3:  # 8-bit immediate
                            positions.append(len(bytes_list) - 1)

    return positions


def find_struct_offset_positions(inst: Instruction) -> list[int]:
    """
    Find byte positions containing struct/object offsets like [reg+offset].

    This is used for the optional 'struct_offsets' wildcard rule.
    Patterns: [eax+10], [edx+188], [ecx+2EC]
    """
    positions = []

    # Check if operands contain [reg+offset] pattern (not stack frame)
    operands = inst.operands
    if '[' in operands and '+' in operands:
        # Exclude stack frame references
        if 'ebp' not in operands and 'esp' not in operands:
            # This is likely a struct offset - use same logic as stack displacement
            positions = find_stack_displacement_positions(inst)

    return positions
