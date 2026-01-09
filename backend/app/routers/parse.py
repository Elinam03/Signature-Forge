"""
Parse API Router

Endpoints for parsing disassembly input.
"""

from fastapi import APIRouter, HTTPException

from app.models.request import ParseRequest, ParseResponse, AnalyzeResponse
from app.services.parser import parse_input, calculate_stats

router = APIRouter()


@router.post("/parse", response_model=ParseResponse)
async def parse_disassembly(request: ParseRequest):
    """
    Parse disassembly input and return structured instruction data.

    Supports formats:
    - x64dbg/OllyDbg (pipe-separated)
    - Cheat Engine (dash-separated, Module+Offset)
    - Raw hex bytes
    """
    try:
        instructions, labels, detected_format, module = parse_input(
            request.input_text,
            request.format
        )

        if not instructions:
            raise HTTPException(
                status_code=400,
                detail="No valid instructions found in input. Check format."
            )

        stats = calculate_stats(instructions, labels)

        return ParseResponse(
            instructions=instructions,
            labels=labels,
            format=detected_format,
            module=module,
            stats=stats
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_disassembly(request: ParseRequest):
    """
    Analyze disassembly input and return statistics and recommendations.
    """
    try:
        instructions, labels, detected_format, module = parse_input(
            request.input_text,
            request.format
        )

        if not instructions:
            raise HTTPException(
                status_code=400,
                detail="No valid instructions found in input."
            )

        stats = calculate_stats(instructions, labels)

        # Generate recommendations
        recommended_targets = []

        # Add all labeled instructions
        for inst in instructions:
            if inst.label:
                recommended_targets.append(inst.label)

        # If no labels, recommend jumps and calls
        if not recommended_targets:
            for inst in instructions:
                if inst.type.value in ['conditional_jump', 'unconditional_jump', 'call']:
                    recommended_targets.append(f"{inst.type.value}@{inst.address}")
                if len(recommended_targets) >= 10:
                    break

        return AnalyzeResponse(
            stats=stats,
            recommended_targets=recommended_targets,
            format=detected_format,
            module=module
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
