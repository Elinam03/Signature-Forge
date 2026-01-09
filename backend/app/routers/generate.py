"""
Generate API Router

Endpoints for signature generation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.models.request import GenerateRequest, GenerateResponse, BatchRequest
from app.models.instruction import Instruction
from app.models.signature import SignatureOptions
from app.services.parser import parse_input, calculate_stats
from app.services.signature import generate_signatures, find_targets
from app.services.smart_analyzer import (
    analyze_instructions,
    SmartAnalysisResult,
    SmartTarget,
    StableRegion,
)


class SmartAnalyzeRequest(BaseModel):
    """Request for smart analysis"""
    instructions: list[Instruction]
    max_targets: int = 10


class SmartGenerateRequest(BaseModel):
    """Request for smart generation"""
    instructions: list[Instruction]
    options: SignatureOptions
    top_n: int = 3  # Generate for top N targets

router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
async def generate_signature(request: GenerateRequest):
    """
    Generate signature variants for specified targets.

    Targets can be:
    - List of label names or addresses
    - "all_jumps" - all jump instructions
    - "all_calls" - all call instructions
    - "all_labeled" - all labeled instructions
    - "all" - all instructions
    """
    try:
        instructions = request.instructions
        if not instructions:
            raise HTTPException(
                status_code=400,
                detail="No instructions provided"
            )

        # Find target indices
        targets = find_targets(instructions, request.targets)

        if not targets:
            raise HTTPException(
                status_code=400,
                detail="No targets found matching selection criteria"
            )

        # Generate signatures for each target
        all_signatures = {}
        total_variants = 0

        for target_idx, target_name in targets:
            variants = generate_signatures(
                instructions,
                target_idx,
                request.options
            )
            if variants:
                all_signatures[target_name] = variants
                total_variants += len(variants)

        return GenerateResponse(
            signatures=all_signatures,
            targets_processed=len(targets),
            total_variants=total_variants
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@router.post("/generate-targeted", response_model=GenerateResponse)
async def generate_targeted(request: GenerateRequest):
    """
    Generate signatures starting from the FIRST instruction (Target Mode).

    This is useful when you have specific assembly code pasted and want
    a signature starting from the very first line.
    """
    try:
        instructions = request.instructions
        if not instructions:
            raise HTTPException(
                status_code=400,
                detail="No instructions provided"
            )

        # Always use first instruction as target
        target_idx = 0
        target_name = instructions[0].label or f"target@{instructions[0].address}"

        # Generate signatures
        variants = generate_signatures(
            instructions,
            target_idx,
            request.options
        )

        all_signatures = {}
        if variants:
            all_signatures[target_name] = variants

        return GenerateResponse(
            signatures=all_signatures,
            targets_processed=1,
            total_variants=len(variants) if variants else 0
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Targeted generation error: {str(e)}")


@router.post("/batch", response_model=GenerateResponse)
async def batch_generate(request: BatchRequest):
    """
    Parse input and generate signatures in one call.

    Combines parse + generate for convenience.
    """
    try:
        # Parse input
        instructions, labels, detected_format, module = parse_input(
            request.input_text,
            request.format
        )

        if not instructions:
            raise HTTPException(
                status_code=400,
                detail="No valid instructions found in input"
            )

        # Find targets
        targets = find_targets(instructions, request.targets)

        if not targets:
            # If no targets found with selection, default to labeled or all jumps
            if labels:
                targets = find_targets(instructions, "all_labeled")
            else:
                targets = find_targets(instructions, "all_jumps")

        if not targets:
            raise HTTPException(
                status_code=400,
                detail="No targets found. Ensure input contains labels, jumps, or calls."
            )

        # Generate signatures
        all_signatures = {}
        total_variants = 0

        for target_idx, target_name in targets:
            variants = generate_signatures(
                instructions,
                target_idx,
                request.options
            )
            if variants:
                all_signatures[target_name] = variants
                total_variants += len(variants)

        return GenerateResponse(
            signatures=all_signatures,
            targets_processed=len(targets),
            total_variants=total_variants
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch error: {str(e)}")


@router.post("/smart-analyze", response_model=SmartAnalysisResult)
async def smart_analyze(request: SmartAnalyzeRequest):
    """
    Analyze instructions to find optimal signature anchor points.

    Returns scored targets with stability, uniqueness, and context ratings,
    plus identification of stable code regions.
    """
    try:
        if not request.instructions:
            raise HTTPException(
                status_code=400,
                detail="No instructions provided"
            )

        result = analyze_instructions(
            request.instructions,
            max_targets=request.max_targets
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.post("/smart-generate", response_model=GenerateResponse)
async def smart_generate(request: SmartGenerateRequest):
    """
    Automatically analyze instructions and generate signatures for the best targets.

    Combines smart analysis + signature generation for a fully automatic workflow.
    """
    try:
        instructions = request.instructions
        if not instructions:
            raise HTTPException(
                status_code=400,
                detail="No instructions provided"
            )

        # Analyze to find best targets
        analysis = analyze_instructions(instructions, max_targets=request.top_n * 2)

        if not analysis.top_targets:
            raise HTTPException(
                status_code=400,
                detail="No suitable signature targets found in input"
            )

        # Generate signatures for top N targets
        all_signatures = {}
        total_variants = 0
        targets_processed = 0

        for target in analysis.top_targets[:request.top_n]:
            # Skip low-scoring targets
            if target.score < 45:
                continue

            target_name = f"smart@{target.address}"
            if target.mnemonic:
                target_name = f"{target.mnemonic}@{target.address}"

            variants = generate_signatures(
                instructions,
                target.instruction_index,
                request.options
            )

            if variants:
                all_signatures[target_name] = variants
                total_variants += len(variants)
                targets_processed += 1

        if not all_signatures:
            raise HTTPException(
                status_code=400,
                detail="Could not generate signatures for any targets"
            )

        return GenerateResponse(
            signatures=all_signatures,
            targets_processed=targets_processed,
            total_variants=total_variants
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart generation error: {str(e)}")
