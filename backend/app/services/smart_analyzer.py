"""
Smart Analyzer Service

Automatically analyzes assembly instructions to find optimal signature anchor points.
Uses scoring based on stability, uniqueness, and context quality.
"""

from typing import Optional
from pydantic import BaseModel
from ..models.instruction import Instruction, InstructionType


class SmartTarget(BaseModel):
    """A recommended signature target from smart analysis"""
    instruction_index: int
    address: str
    mnemonic: str
    operands: str
    score: float                      # 0-100 combined score
    stability_score: float            # How stable across versions
    uniqueness_score: float           # How unique/rare this pattern is
    context_score: float              # Quality of surrounding code
    reasons: list[str]                # Why this is a good target
    warnings: list[str]               # Any concerns


class StableRegion(BaseModel):
    """A contiguous region of stable instructions"""
    start_index: int
    end_index: int
    start_address: str
    end_address: str
    avg_score: float
    byte_count: int


class SmartAnalysisResult(BaseModel):
    """Result from smart analysis of instructions"""
    top_targets: list[SmartTarget]    # Best 5-10 anchor points
    stable_regions: list[StableRegion]  # Contiguous stable areas
    analysis_summary: str             # Overall assessment
    total_instructions: int
    avg_stability: float


# Instruction types that are generally stable across binary versions
STABLE_TYPES = {
    InstructionType.MOV,
    InstructionType.COMPARE,
    InstructionType.LOGIC,
    InstructionType.ARITHMETIC,
    InstructionType.STACK,
}

# Instruction types that are volatile (offsets change between versions)
VOLATILE_TYPES = {
    InstructionType.CONDITIONAL_JUMP,
    InstructionType.UNCONDITIONAL_JUMP,
    InstructionType.CALL,
}

# Mnemonics that are particularly rare and good anchors
RARE_MNEMONICS = {
    "xchg", "bswap", "rol", "ror", "shld", "shrd", "bt", "bts", "btr", "btc",
    "cpuid", "rdtsc", "prefetch", "lfence", "mfence", "sfence",
    "cvtsi2ss", "cvtsi2sd", "cvtss2sd", "cvtsd2ss", "cvttss2si", "cvttsd2si",
    "comiss", "comisd", "ucomiss", "ucomisd",
    "pxor", "por", "pand", "pandn", "pcmpeqb", "pcmpeqd", "pcmpgtb", "pcmpgtd",
    "movdqa", "movdqu", "movaps", "movups", "movss", "movsd",
    "shufps", "shufpd", "unpcklps", "unpckhps",
}

# Mnemonics that are very common (lower uniqueness)
COMMON_MNEMONICS = {
    "mov", "push", "pop", "add", "sub", "xor", "cmp", "test", "jmp", "je", "jne",
    "call", "ret", "lea", "nop",
}


def score_instruction(
    inst: Instruction,
    context_before: list[Instruction],
    context_after: list[Instruction],
    all_instructions: list[Instruction]
) -> tuple[float, float, float, list[str], list[str]]:
    """
    Score an instruction as a potential signature anchor.

    Returns:
        (total_score, stability_score, uniqueness_score, reasons, warnings)
    """
    stability_score = 50.0  # Start at neutral
    uniqueness_score = 50.0
    context_score = 50.0
    reasons = []
    warnings = []

    # === STABILITY SCORING ===

    # Instruction type stability
    if inst.type in STABLE_TYPES:
        stability_score += 20
        reasons.append(f"{inst.type.value} instructions are version-stable")
    elif inst.type in VOLATILE_TYPES:
        stability_score -= 25
        warnings.append(f"{inst.type.value} has volatile offsets")

    # Operand volatility
    if inst.volatility.operand == "low":
        stability_score += 15
        reasons.append("Operands are stable (registers/small immediates)")
    elif inst.volatility.operand == "high":
        stability_score -= 20
        warnings.append("Operands contain volatile addresses")
    elif inst.volatility.operand == "medium":
        stability_score -= 5

    # Opcode volatility
    if inst.volatility.opcode == "low":
        stability_score += 10
    elif inst.volatility.opcode == "high":
        stability_score -= 15
        warnings.append("Opcode encoding may vary")

    # Check for wildcards needed
    wildcard_count = len(inst.wildcard_positions)
    if wildcard_count == 0:
        stability_score += 15
        reasons.append("No wildcards needed in this instruction")
    elif wildcard_count <= 2:
        stability_score += 5
    else:
        stability_score -= wildcard_count * 3
        warnings.append(f"Needs {wildcard_count} wildcards")

    # === UNIQUENESS SCORING ===

    mnemonic_lower = inst.mnemonic.lower()

    # Rare mnemonics are more unique
    if mnemonic_lower in RARE_MNEMONICS:
        uniqueness_score += 25
        reasons.append(f"{inst.mnemonic} is a rare/distinctive instruction")
    elif mnemonic_lower in COMMON_MNEMONICS:
        uniqueness_score -= 10

    # Instruction size affects uniqueness (longer = more unique pattern)
    if inst.size >= 6:
        uniqueness_score += 15
        reasons.append(f"Long instruction ({inst.size} bytes) provides unique pattern")
    elif inst.size >= 4:
        uniqueness_score += 8
    elif inst.size <= 2:
        uniqueness_score -= 10

    # Count occurrences in the input (fewer = more unique)
    same_mnemonic_count = sum(1 for i in all_instructions if i.mnemonic.lower() == mnemonic_lower)
    if same_mnemonic_count == 1:
        uniqueness_score += 20
        reasons.append("Only occurrence of this instruction type")
    elif same_mnemonic_count <= 3:
        uniqueness_score += 10
    elif same_mnemonic_count > 10:
        uniqueness_score -= 15
        warnings.append(f"Common pattern ({same_mnemonic_count} similar instructions)")

    # === CONTEXT SCORING ===

    # Stable neighbors improve context
    stable_before = sum(1 for i in context_before if i.type in STABLE_TYPES)
    stable_after = sum(1 for i in context_after if i.type in STABLE_TYPES)

    if stable_before >= 2:
        context_score += 10
        reasons.append("Good stable context before")
    if stable_after >= 3:
        context_score += 15
        reasons.append("Strong stable context after")

    # Volatile neighbors are concerning
    volatile_after = sum(1 for i in context_after if i.type in VOLATILE_TYPES)
    if volatile_after >= 3:
        context_score -= 15
        warnings.append("Many volatile instructions follow")

    # Check for continuous bytes (no gaps)
    total_context_bytes = sum(i.size for i in context_after[:5])
    if total_context_bytes >= 15:
        context_score += 10
        reasons.append(f"Good byte density ({total_context_bytes} bytes in next 5 instructions)")

    # Penalty if near start or end (less context available)
    if len(context_before) < 2:
        context_score -= 10
        warnings.append("Limited context before")
    if len(context_after) < 3:
        context_score -= 15
        warnings.append("Limited context after")

    # === FINAL SCORE ===

    # Clamp individual scores
    stability_score = max(0, min(100, stability_score))
    uniqueness_score = max(0, min(100, uniqueness_score))
    context_score = max(0, min(100, context_score))

    # Weighted combination
    total_score = (
        stability_score * 0.45 +   # Stability is most important
        uniqueness_score * 0.30 +  # Uniqueness second
        context_score * 0.25       # Context third
    )

    return total_score, stability_score, uniqueness_score, reasons, warnings


def find_stable_regions(
    instructions: list[Instruction],
    min_region_size: int = 3,
    stability_threshold: float = 60.0
) -> list[StableRegion]:
    """
    Find contiguous regions of stable instructions.
    """
    regions = []
    current_region_start = None
    current_scores = []

    for i, inst in enumerate(instructions):
        # Simple stability check
        is_stable = (
            inst.type in STABLE_TYPES and
            inst.volatility.operand != "high" and
            len(inst.wildcard_positions) <= 2
        )

        if is_stable:
            if current_region_start is None:
                current_region_start = i
                current_scores = [70.0]  # Base score for stable
            else:
                current_scores.append(70.0)
        else:
            # End current region if it meets minimum size
            if current_region_start is not None and len(current_scores) >= min_region_size:
                avg_score = sum(current_scores) / len(current_scores)
                if avg_score >= stability_threshold:
                    byte_count = sum(
                        instructions[j].size
                        for j in range(current_region_start, current_region_start + len(current_scores))
                    )
                    regions.append(StableRegion(
                        start_index=current_region_start,
                        end_index=current_region_start + len(current_scores) - 1,
                        start_address=instructions[current_region_start].address,
                        end_address=instructions[current_region_start + len(current_scores) - 1].address,
                        avg_score=avg_score,
                        byte_count=byte_count,
                    ))
            current_region_start = None
            current_scores = []

    # Check final region
    if current_region_start is not None and len(current_scores) >= min_region_size:
        avg_score = sum(current_scores) / len(current_scores)
        if avg_score >= stability_threshold:
            byte_count = sum(
                instructions[j].size
                for j in range(current_region_start, current_region_start + len(current_scores))
            )
            regions.append(StableRegion(
                start_index=current_region_start,
                end_index=current_region_start + len(current_scores) - 1,
                start_address=instructions[current_region_start].address,
                end_address=instructions[current_region_start + len(current_scores) - 1].address,
                avg_score=avg_score,
                byte_count=byte_count,
            ))

    return regions


def analyze_instructions(
    instructions: list[Instruction],
    max_targets: int = 10
) -> SmartAnalysisResult:
    """
    Analyze all instructions and find the best signature anchor points.
    """
    if not instructions:
        return SmartAnalysisResult(
            top_targets=[],
            stable_regions=[],
            analysis_summary="No instructions to analyze",
            total_instructions=0,
            avg_stability=0.0,
        )

    # Score all instructions
    scored_targets = []
    all_stability_scores = []

    for i, inst in enumerate(instructions):
        context_before = instructions[max(0, i-5):i]
        context_after = instructions[i+1:i+10]

        total, stability, uniqueness, reasons, warnings = score_instruction(
            inst, context_before, context_after, instructions
        )

        all_stability_scores.append(stability)

        # Skip very low scoring instructions
        if total < 40:
            continue

        scored_targets.append(SmartTarget(
            instruction_index=i,
            address=inst.address,
            mnemonic=inst.mnemonic,
            operands=inst.operands,
            score=round(total, 1),
            stability_score=round(stability, 1),
            uniqueness_score=round(uniqueness, 1),
            context_score=round(total - stability * 0.45 - uniqueness * 0.30, 1) / 0.25,  # Back-calculate
            reasons=reasons,
            warnings=warnings,
        ))

    # Sort by score and take top N
    scored_targets.sort(key=lambda t: t.score, reverse=True)
    top_targets = scored_targets[:max_targets]

    # Find stable regions
    stable_regions = find_stable_regions(instructions)

    # Calculate average stability
    avg_stability = sum(all_stability_scores) / len(all_stability_scores) if all_stability_scores else 0.0

    # Generate summary
    summary_parts = []

    if top_targets:
        best = top_targets[0]
        summary_parts.append(
            f"Best anchor: {best.mnemonic} at {best.address} (score: {best.score:.0f}/100)"
        )

    if stable_regions:
        summary_parts.append(f"Found {len(stable_regions)} stable region(s)")
        largest = max(stable_regions, key=lambda r: r.byte_count)
        summary_parts.append(
            f"Largest stable region: {largest.byte_count} bytes ({largest.start_address} to {largest.end_address})"
        )

    high_score_count = sum(1 for t in top_targets if t.score >= 70)
    if high_score_count >= 3:
        summary_parts.append(f"{high_score_count} excellent anchor candidates found")
    elif high_score_count == 0:
        summary_parts.append("Warning: No high-confidence anchors found. Consider providing more context.")

    if avg_stability < 50:
        summary_parts.append("Overall code stability is low - signatures may need frequent updates")
    elif avg_stability >= 70:
        summary_parts.append("Code appears stable - signatures should be resilient")

    return SmartAnalysisResult(
        top_targets=top_targets,
        stable_regions=stable_regions,
        analysis_summary=". ".join(summary_parts),
        total_instructions=len(instructions),
        avg_stability=round(avg_stability, 1),
    )
