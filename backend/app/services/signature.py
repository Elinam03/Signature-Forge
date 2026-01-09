"""
Signature Generation Engine

Generates multiple signature variants with different strategies:
1. Minimal - Only wildcard jump/call offsets
2. Conservative - Add stack offsets and global addresses
3. Aggressive - Add immediates and struct offsets
4. Context variations - Different context lengths
5. Anchor shifting - Start from different stable instructions
"""

from typing import Optional
from app.models.instruction import Instruction, InstructionType
from app.models.signature import WildcardRules, SignatureOptions, GeneratedSignature, WildcardReason
from app.services.analyzer import (
    find_stack_displacement_positions,
    find_global_address_positions,
    find_immediate_positions,
    find_struct_offset_positions
)


def generate_signatures(
    instructions: list[Instruction],
    target_idx: int,
    options: SignatureOptions
) -> list[GeneratedSignature]:
    """
    Generate signature variants for a target instruction.

    Args:
        instructions: List of all parsed instructions
        target_idx: Index of the target instruction
        options: Signature generation options

    Returns:
        List of signature variants sorted by uniqueness
    """
    variants = []

    # ============================================
    # WILDCARD STRATEGY VARIANTS (9 strategies)
    # ============================================

    # Strategy 1: Minimal - Only jump/call offsets
    minimal_rules = WildcardRules(
        relative_jumps=True,
        relative_calls=True,
        stack_offsets=False,
        global_addresses=False,
        immediates=False,
        struct_offsets=False,
        memory_displacements=False
    )
    variant = generate_with_rules(instructions, target_idx, minimal_rules, options, "Minimal")
    if variant:
        variants.append(variant)

    # Strategy 2: Conservative (user's default settings)
    variant = generate_with_rules(instructions, target_idx, options.wildcard_rules, options, "Conservative")
    if variant:
        variants.append(variant)

    # Strategy 3: Balanced - Between Conservative and Aggressive
    balanced_rules = WildcardRules(
        relative_jumps=True,
        relative_calls=True,
        stack_offsets=True,
        global_addresses=True,
        immediates=False,
        struct_offsets=True,
        memory_displacements=False
    )
    variant = generate_with_rules(instructions, target_idx, balanced_rules, options, "Balanced")
    if variant:
        variants.append(variant)

    # Strategy 4: Aggressive - Everything wildcarded
    aggressive_rules = WildcardRules(
        relative_jumps=True,
        relative_calls=True,
        stack_offsets=True,
        global_addresses=True,
        immediates=True,
        struct_offsets=True,
        memory_displacements=True
    )
    variant = generate_with_rules(instructions, target_idx, aggressive_rules, options, "Aggressive")
    if variant:
        variants.append(variant)

    # Strategy 5: Stack Focus - Only stack offsets
    stack_focus_rules = WildcardRules(
        relative_jumps=True,
        relative_calls=True,
        stack_offsets=True,
        global_addresses=False,
        immediates=False,
        struct_offsets=False,
        memory_displacements=False
    )
    variant = generate_with_rules(instructions, target_idx, stack_focus_rules, options, "Stack Focus")
    if variant:
        variants.append(variant)

    # Strategy 6: Global Focus - Only global addresses
    global_focus_rules = WildcardRules(
        relative_jumps=True,
        relative_calls=True,
        stack_offsets=False,
        global_addresses=True,
        immediates=False,
        struct_offsets=False,
        memory_displacements=False
    )
    variant = generate_with_rules(instructions, target_idx, global_focus_rules, options, "Global Focus")
    if variant:
        variants.append(variant)

    # Strategy 7: Memory Heavy - All memory displacements
    memory_heavy_rules = WildcardRules(
        relative_jumps=True,
        relative_calls=True,
        stack_offsets=True,
        global_addresses=True,
        immediates=False,
        struct_offsets=True,
        memory_displacements=True
    )
    variant = generate_with_rules(instructions, target_idx, memory_heavy_rules, options, "Memory Heavy")
    if variant:
        variants.append(variant)

    # Strategy 8: Max Stability - Maximum wildcarding for version resilience
    max_stability_rules = WildcardRules(
        relative_jumps=True,
        relative_calls=True,
        stack_offsets=True,
        global_addresses=True,
        immediates=True,
        struct_offsets=True,
        memory_displacements=True
    )
    variant = generate_with_rules(instructions, target_idx, max_stability_rules, options, "Max Stability")
    if variant:
        variants.append(variant)

    # Strategy 9: Immediates Only - Wildcard immediate values
    immediates_only_rules = WildcardRules(
        relative_jumps=True,
        relative_calls=True,
        stack_offsets=False,
        global_addresses=False,
        immediates=True,
        struct_offsets=False,
        memory_displacements=False
    )
    variant = generate_with_rules(instructions, target_idx, immediates_only_rules, options, "Immediates Only")
    if variant:
        variants.append(variant)

    # ============================================
    # CONTEXT VARIATIONS (11 configurations)
    # ============================================
    context_variations = [
        # Forward only (good for finding code after target)
        (0, 10), (0, 15), (0, 20), (0, 30), (0, 40),
        # Mixed context (balanced approach)
        (2, 12), (3, 18), (5, 25),
        # More backward context (anchoring before target)
        (5, 10), (8, 15), (10, 20),
    ]
    for ctx_before, ctx_after in context_variations:
        modified_options = SignatureOptions(
            min_length=options.min_length,
            max_length=options.max_length,
            variants=options.variants,
            context_before=ctx_before,
            context_after=ctx_after,
            wildcard_rules=options.wildcard_rules
        )
        variant = generate_with_rules(
            instructions, target_idx, options.wildcard_rules,
            modified_options, f"Context {ctx_before}/{ctx_after}"
        )
        if variant:
            variants.append(variant)

    # ============================================
    # ANCHOR SHIFTING (expanded to ±4)
    # ============================================
    # Extended anchor types for more flexibility
    stable_anchor_types = [
        InstructionType.MOV,
        InstructionType.COMPARE,
        InstructionType.LOGIC,
        InstructionType.ARITHMETIC,
        InstructionType.STACK,
    ]

    for shift in [-4, -3, -2, -1, 1, 2, 3, 4]:
        shifted_idx = target_idx + shift
        if 0 <= shifted_idx < len(instructions):
            anchor = instructions[shifted_idx]
            if anchor.type in stable_anchor_types:
                variant = generate_with_rules(
                    instructions, shifted_idx, options.wildcard_rules,
                    options, f"Anchor {shift:+d}"
                )
                if variant:
                    variants.append(variant)

    # ============================================
    # SIMILARITY-BASED DEDUPLICATION
    # ============================================
    # Keep patterns that are >25% different (not just exact matches)
    unique_variants = similarity_deduplicate(variants, threshold=0.25)

    # Sort by uniqueness score (descending)
    unique_variants.sort(key=lambda x: x.uniqueness_score, reverse=True)

    # Return top N variants
    return unique_variants[:options.variants]


def similarity_deduplicate(
    variants: list[GeneratedSignature],
    threshold: float = 0.25
) -> list[GeneratedSignature]:
    """
    Deduplicate variants based on pattern similarity.
    Keep patterns that are at least `threshold` (25%) different from each other.
    """
    if not variants:
        return []

    unique = [variants[0]]

    for candidate in variants[1:]:
        is_unique = True
        for existing in unique:
            similarity = calculate_pattern_similarity(candidate.pattern, existing.pattern)
            if similarity > (1 - threshold):  # If more than 75% similar, skip
                is_unique = False
                break
        if is_unique:
            unique.append(candidate)

    return unique


def calculate_pattern_similarity(pattern1: str, pattern2: str) -> float:
    """
    Calculate similarity between two patterns (0.0 = completely different, 1.0 = identical).
    Compares byte-by-byte, treating ?? as a wildcard that matches anything.
    """
    bytes1 = pattern1.split()
    bytes2 = pattern2.split()

    # Handle different lengths
    max_len = max(len(bytes1), len(bytes2))
    if max_len == 0:
        return 1.0

    # Pad shorter pattern
    while len(bytes1) < max_len:
        bytes1.append("??")
    while len(bytes2) < max_len:
        bytes2.append("??")

    matches = 0
    for b1, b2 in zip(bytes1, bytes2):
        if b1 == b2:
            matches += 1
        elif b1 == "??" or b2 == "??":
            matches += 0.5  # Partial match for wildcards

    return matches / max_len


def generate_with_rules(
    instructions: list[Instruction],
    target_idx: int,
    rules: WildcardRules,
    options: SignatureOptions,
    strategy: str
) -> Optional[GeneratedSignature]:
    """
    Generate a single signature with specific wildcard rules.
    """
    if target_idx < 0 or target_idx >= len(instructions):
        return None

    # Calculate instruction range
    start_idx = max(0, target_idx - options.context_before)

    # Collect bytes until we reach min_length or max_length
    all_bytes: list[tuple[int, str, int, Instruction]] = []  # (byte_value, byte_str, position_in_inst, instruction)

    idx = start_idx
    while idx < len(instructions) and len(all_bytes) < options.max_length:
        inst = instructions[idx]
        for pos, byte_str in enumerate(inst.bytes):
            if len(all_bytes) >= options.max_length:
                break
            byte_val = int(byte_str, 16)
            all_bytes.append((byte_val, byte_str, pos, inst))
        idx += 1

    if len(all_bytes) < options.min_length:
        return None

    # Trim to min_length (or slightly more for complete instructions)
    target_length = max(options.min_length, min(len(all_bytes), options.max_length))
    all_bytes = all_bytes[:target_length]

    # Apply wildcard rules
    pattern_bytes: list[Optional[int]] = []
    wildcard_positions: list[int] = []
    wildcard_reasons: list[WildcardReason] = []

    for i, (byte_val, byte_str, pos_in_inst, inst) in enumerate(all_bytes):
        should_wildcard = False
        reason_type = ""
        reason_detail = ""

        # Check each rule
        if rules.relative_jumps or rules.relative_calls:
            if pos_in_inst in inst.wildcard_positions:
                # Check if this is a jump/call
                if inst.type in [InstructionType.CONDITIONAL_JUMP, InstructionType.UNCONDITIONAL_JUMP]:
                    if rules.relative_jumps:
                        should_wildcard = True
                        reason_type = "relative_jump"
                        reason_detail = f"Relative jump offset - changes when code moves"
                elif inst.type == InstructionType.CALL:
                    if rules.relative_calls:
                        should_wildcard = True
                        reason_type = "relative_call"
                        reason_detail = f"Relative call offset - target address changes between builds"

        if rules.stack_offsets and not should_wildcard:
            stack_positions = find_stack_displacement_positions(inst)
            if pos_in_inst in stack_positions:
                should_wildcard = True
                reason_type = "stack_offset"
                reason_detail = f"Stack frame offset [ebp/esp+X] - varies with local variables"

        if rules.global_addresses and not should_wildcard:
            global_positions = find_global_address_positions(inst)
            if pos_in_inst in global_positions:
                should_wildcard = True
                reason_type = "global_address"
                reason_detail = f"Global/absolute address - changes due to ASLR or relocation"

        if rules.immediates and not should_wildcard:
            imm_positions = find_immediate_positions(inst)
            if pos_in_inst in imm_positions:
                should_wildcard = True
                reason_type = "immediate"
                reason_detail = f"Immediate value - may change between versions"

        if rules.struct_offsets and not should_wildcard:
            struct_positions = find_struct_offset_positions(inst)
            if pos_in_inst in struct_positions:
                should_wildcard = True
                reason_type = "struct_offset"
                reason_detail = f"Structure offset [reg+X] - changes if struct layout changes"

        if should_wildcard:
            pattern_bytes.append(None)
            wildcard_positions.append(i)
            wildcard_reasons.append(WildcardReason(
                position=i,
                reason=reason_type,
                detail=reason_detail,
                instruction_address=inst.address
            ))
        else:
            pattern_bytes.append(byte_val)

    # Build pattern string
    pattern_parts = []
    for byte in pattern_bytes:
        if byte is None:
            pattern_parts.append("??")
        else:
            pattern_parts.append(f"{byte:02X}")
    pattern = " ".join(pattern_parts)

    # Build mask string
    mask = "".join("?" if b is None else "x" for b in pattern_bytes)

    # Calculate scores
    wildcard_count = len(wildcard_positions)
    total_bytes = len(pattern_bytes)
    concrete_bytes = total_bytes - wildcard_count

    uniqueness_score = calculate_uniqueness(pattern_bytes)
    stability = calculate_stability(wildcard_count, total_bytes, instructions[target_idx])

    # Get addresses
    start_address = None
    end_address = None
    if all_bytes:
        start_address = all_bytes[0][3].address
        end_address = all_bytes[-1][3].address

    # Generate description
    description = generate_description(strategy, rules, wildcard_count, total_bytes)

    # Generate summary explaining wildcards
    summary = generate_wildcard_summary(wildcard_reasons, strategy)

    return GeneratedSignature(
        pattern=pattern,
        mask=mask,
        bytes=pattern_bytes,
        description=description,
        length=total_bytes,
        wildcard_count=wildcard_count,
        wildcard_positions=wildcard_positions,
        wildcard_reasons=wildcard_reasons,
        uniqueness_score=uniqueness_score,
        stability=stability,
        start_address=start_address,
        end_address=end_address,
        strategy=strategy,
        summary=summary
    )


def calculate_uniqueness(pattern_bytes: list[Optional[int]]) -> float:
    """
    Calculate uniqueness score (0.0 - 1.0).

    Higher concrete byte ratio = higher uniqueness.
    Penalties for consecutive wildcards.
    """
    total = len(pattern_bytes)
    if total == 0:
        return 0.0

    wildcards = sum(1 for b in pattern_bytes if b is None)
    concrete = total - wildcards

    # Base uniqueness: ratio of concrete bytes
    base_uniqueness = concrete / total

    # Bonus for longer patterns
    length_bonus = min(total / 50, 0.2)

    # Penalty for consecutive wildcards
    max_consecutive = get_max_consecutive_wildcards(pattern_bytes)
    consecutive_penalty = min(max_consecutive / 10, 0.3)

    # Final score clamped to 0.0 - 1.0
    score = base_uniqueness + length_bonus - consecutive_penalty
    return round(max(0.0, min(1.0, score)), 2)


def get_max_consecutive_wildcards(pattern_bytes: list[Optional[int]]) -> int:
    """Count maximum consecutive wildcards in pattern."""
    max_consecutive = 0
    current = 0

    for byte in pattern_bytes:
        if byte is None:
            current += 1
            max_consecutive = max(max_consecutive, current)
        else:
            current = 0

    return max_consecutive


def calculate_stability(
    wildcard_count: int,
    total_bytes: int,
    target_inst: Instruction
) -> str:
    """
    Calculate stability rating based on what's wildcarded.

    High: Many wildcards on volatile bytes
    Medium: Some wildcards
    Low: Few wildcards on volatile bytes
    """
    wildcard_ratio = wildcard_count / total_bytes if total_bytes > 0 else 0

    # Check target instruction volatility
    operand_volatility = target_inst.volatility.operand

    if wildcard_ratio >= 0.3 and operand_volatility == "high":
        return "high"
    elif wildcard_ratio >= 0.15 or operand_volatility == "high":
        return "medium"
    else:
        return "low"


def generate_description(
    strategy: str,
    rules: WildcardRules,
    wildcard_count: int,
    total_bytes: int
) -> str:
    """Generate human-readable description of the signature."""
    parts = [strategy]

    wildcarded = []
    if rules.relative_jumps:
        wildcarded.append("jumps")
    if rules.relative_calls:
        wildcarded.append("calls")
    if rules.stack_offsets:
        wildcarded.append("stack")
    if rules.global_addresses:
        wildcarded.append("globals")
    if rules.immediates:
        wildcarded.append("immediates")
    if rules.struct_offsets:
        wildcarded.append("structs")

    if wildcarded:
        parts.append(f"wildcards: {', '.join(wildcarded)}")

    parts.append(f"{wildcard_count}/{total_bytes} bytes wildcarded")

    return " - ".join(parts)


def find_targets(
    instructions: list[Instruction],
    target_selection
) -> list[tuple[int, str]]:
    """
    Find target instruction indices based on selection criteria.

    Returns: List of (index, target_name) tuples
    """
    targets = []

    if isinstance(target_selection, list):
        # List of specific labels, addresses, or jump@/call@ prefixed addresses
        for target in target_selection:
            # Handle jump@address or call@address format
            if target.startswith("jump@") or target.startswith("call@"):
                addr = target.split("@", 1)[1]
                for i, inst in enumerate(instructions):
                    if inst.address == addr:
                        name = target
                        targets.append((i, name))
                        break
            else:
                # Regular label or address
                for i, inst in enumerate(instructions):
                    if inst.label == target or inst.address == target:
                        name = inst.label or inst.address
                        targets.append((i, name))
                        break

    elif target_selection == "all_jumps":
        for i, inst in enumerate(instructions):
            if inst.type in [InstructionType.CONDITIONAL_JUMP, InstructionType.UNCONDITIONAL_JUMP]:
                name = inst.label or f"jump_{inst.address}"
                targets.append((i, name))

    elif target_selection == "all_calls":
        for i, inst in enumerate(instructions):
            if inst.type == InstructionType.CALL:
                name = inst.label or f"call_{inst.address}"
                targets.append((i, name))

    elif target_selection == "all_labeled":
        for i, inst in enumerate(instructions):
            if inst.label:
                targets.append((i, inst.label))

    elif target_selection == "all":
        for i, inst in enumerate(instructions):
            name = inst.label or f"inst_{inst.address}"
            targets.append((i, name))

    return targets


def generate_wildcard_summary(reasons: list[WildcardReason], strategy: str) -> str:
    """
    Generate a human-readable summary explaining why bytes were wildcarded.
    """
    if not reasons:
        return "No wildcards needed - all bytes are stable across builds."

    # Count by reason type
    reason_counts: dict[str, int] = {}
    for r in reasons:
        reason_counts[r.reason] = reason_counts.get(r.reason, 0) + 1

    parts = []

    # Strategy description
    strategy_descriptions = {
        "Minimal": "Uses minimal wildcarding for maximum uniqueness.",
        "Conservative": "Balances stability with uniqueness.",
        "Aggressive": "Wildcards aggressively for maximum stability across updates.",
    }

    if strategy in strategy_descriptions:
        parts.append(strategy_descriptions[strategy])
    elif strategy.startswith("Context"):
        parts.append("Adjusted context window for better anchoring.")
    elif strategy.startswith("Anchor"):
        parts.append("Shifted anchor point to a more stable instruction.")

    # Explain each wildcard type
    explanations = []

    if "relative_jump" in reason_counts:
        n = reason_counts["relative_jump"]
        explanations.append(f"{n} byte{'s' if n > 1 else ''} for relative jump offsets (change when code is relocated)")

    if "relative_call" in reason_counts:
        n = reason_counts["relative_call"]
        explanations.append(f"{n} byte{'s' if n > 1 else ''} for relative call targets (function addresses vary)")

    if "stack_offset" in reason_counts:
        n = reason_counts["stack_offset"]
        explanations.append(f"{n} byte{'s' if n > 1 else ''} for stack offsets (local variable positions may change)")

    if "global_address" in reason_counts:
        n = reason_counts["global_address"]
        explanations.append(f"{n} byte{'s' if n > 1 else ''} for global addresses (affected by ASLR/relocation)")

    if "immediate" in reason_counts:
        n = reason_counts["immediate"]
        explanations.append(f"{n} byte{'s' if n > 1 else ''} for immediate values (constants that may change)")

    if "struct_offset" in reason_counts:
        n = reason_counts["struct_offset"]
        explanations.append(f"{n} byte{'s' if n > 1 else ''} for struct offsets (structure layouts may differ)")

    if explanations:
        parts.append("Wildcarded: " + "; ".join(explanations) + ".")

    return " ".join(parts)
