"""
Signature-related Pydantic models
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal


class WildcardRules(BaseModel):
    """Configuration for what bytes to wildcard"""
    relative_jumps: bool = True      # Wildcard relative jump offsets
    relative_calls: bool = True      # Wildcard relative call offsets
    stack_offsets: bool = True       # Wildcard [ebp-X] and [esp+X] displacements
    global_addresses: bool = True    # Wildcard absolute addresses like ds:[XXXXXXXX]
    immediates: bool = False         # Wildcard immediate values
    struct_offsets: bool = False     # Wildcard [reg+X] style offsets
    memory_displacements: bool = False  # Wildcard all memory displacements


class SignatureOptions(BaseModel):
    """Options for signature generation"""
    min_length: int = Field(default=20, ge=8, le=100)
    max_length: int = Field(default=50, ge=20, le=200)
    variants: int = Field(default=25, ge=1, le=50)  # Increased default for expanded strategies
    context_before: int = Field(default=0, ge=0, le=20)  # Instructions before target
    context_after: int = Field(default=10, ge=0, le=50)  # Bytes after target
    wildcard_rules: WildcardRules = Field(default_factory=WildcardRules)


class WildcardReason(BaseModel):
    """Reason why a byte position was wildcarded"""
    position: int                         # Byte position in signature
    reason: str                           # e.g., "relative_jump", "stack_offset"
    detail: str                           # Human-readable explanation
    instruction_address: Optional[str] = None  # Address of the instruction


class GeneratedSignature(BaseModel):
    """A generated signature variant"""
    pattern: str                          # "0F 84 ?? ?? ?? ?? 8B 8D"
    mask: str                             # "xx????xx"
    bytes: list[Optional[int]]            # [0x0F, 0x84, None, None, None, None, 0x8B, 0x8D]
    description: str                      # Human-readable description
    length: int                           # Total byte count
    wildcard_count: int                   # Number of wildcards
    wildcard_positions: list[int]         # Positions of wildcards
    wildcard_reasons: list[WildcardReason] = []  # Detailed reasons for each wildcard
    uniqueness_score: float               # 0.0 - 1.0 (higher = more unique)
    stability: Literal["high", "medium", "low"]
    start_address: Optional[str] = None
    end_address: Optional[str] = None
    strategy: str = ""                    # Which strategy generated this
    summary: str = ""                     # Brief summary explaining wildcards
