"""
Instruction-related Pydantic models
"""

from pydantic import BaseModel
from typing import Optional, Literal
from enum import Enum


class InstructionType(str, Enum):
    """Classification of x86 instructions"""
    CONDITIONAL_JUMP = "conditional_jump"
    UNCONDITIONAL_JUMP = "unconditional_jump"
    CALL = "call"
    RETURN = "return"
    MOV = "mov"
    ARITHMETIC = "arithmetic"
    LOGIC = "logic"
    COMPARE = "compare"
    STACK = "stack"
    FLOAT = "float"
    STRING = "string"
    OTHER = "other"


class Volatility(BaseModel):
    """Volatility levels for instruction components"""
    opcode: Literal["low", "medium", "high"]
    operand: Literal["low", "medium", "high"]


class Instruction(BaseModel):
    """Represents a single x86 instruction"""
    address: str
    raw_address: Optional[str] = None  # Original format (e.g., "Module+Offset" for CE)
    bytes: list[str]
    mnemonic: str
    operands: str
    operands_normalized: Optional[str] = None  # Standardized memory refs
    label: Optional[str] = None
    comment: Optional[str] = None
    type: InstructionType
    size: int
    volatility: Volatility
    wildcard_positions: list[int] = []  # Byte positions that should be wildcarded


class ParseStats(BaseModel):
    """Statistics from parsing"""
    total: int
    by_type: dict[str, int]
    labeled: int
    total_bytes: int
