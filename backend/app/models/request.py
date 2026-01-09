"""
API Request/Response models
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, Union

from app.models.instruction import Instruction, ParseStats
from app.models.signature import SignatureOptions, GeneratedSignature, WildcardRules


# Input format types
InputFormat = Literal["x64dbg", "cheatengine", "hex", "auto"]

# Target selection types
TargetSelection = Union[list[str], Literal["all_jumps", "all_calls", "all_labeled", "all"]]


class ParseRequest(BaseModel):
    """Request to parse disassembly input"""
    input_text: str
    format: InputFormat = "auto"


class ParseResponse(BaseModel):
    """Response from parsing"""
    instructions: list[Instruction]
    labels: list[str]
    format: str  # Detected format
    module: Optional[str] = None  # For CE format
    stats: ParseStats


class GenerateRequest(BaseModel):
    """Request to generate signatures"""
    instructions: list[Instruction]
    targets: TargetSelection  # List of labels/addresses OR "all_jumps", "all_calls", etc.
    options: SignatureOptions = Field(default_factory=SignatureOptions)


class GenerateResponse(BaseModel):
    """Response with generated signatures"""
    signatures: dict[str, list[GeneratedSignature]]  # target -> variants
    targets_processed: int
    total_variants: int


class BatchRequest(BaseModel):
    """Request to parse and generate in one call"""
    input_text: str
    format: InputFormat = "auto"
    targets: TargetSelection = "all_labeled"
    options: SignatureOptions = Field(default_factory=SignatureOptions)


class AnalyzeResponse(BaseModel):
    """Response with analysis and recommendations"""
    stats: ParseStats
    recommended_targets: list[str]
    format: str
    module: Optional[str] = None


class ExportRequest(BaseModel):
    """Request to export signatures"""
    signatures: dict[str, list[GeneratedSignature]]
    format: Literal["aob", "mask", "ida", "cheatengine", "cpp", "x64dbg"]
    module_name: str = "game.exe"
