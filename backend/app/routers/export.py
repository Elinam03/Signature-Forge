"""
Export API Router

Endpoints for exporting signatures in various formats.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.request import ExportRequest
from app.services.export import export_signatures

router = APIRouter()


@router.post("/export", response_class=PlainTextResponse)
async def export_signature(request: ExportRequest):
    """
    Export signatures in the specified format.

    Formats:
    - aob: Standard Array of Bytes
    - mask: Pattern + mask string
    - ida: IDA Python script
    - cheatengine: Cheat Engine AOB script
    - cpp: C/C++ header file
    - x64dbg: x64dbg pattern format
    """
    try:
        if not request.signatures:
            raise HTTPException(
                status_code=400,
                detail="No signatures provided for export"
            )

        exported = export_signatures(
            request.signatures,
            request.format,
            request.module_name
        )

        return PlainTextResponse(
            content=exported,
            media_type="text/plain"
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")


@router.get("/export/formats")
async def get_export_formats():
    """
    Get list of available export formats.
    """
    return {
        "formats": [
            {
                "id": "aob",
                "name": "Standard AOB",
                "description": "Array of Bytes format (0F 84 ?? ?? ?? ??)",
                "extension": ".txt"
            },
            {
                "id": "mask",
                "name": "Mask Format",
                "description": "Pattern + mask string (xx????xx)",
                "extension": ".txt"
            },
            {
                "id": "ida",
                "name": "IDA Python",
                "description": "Ready-to-use IDA Pro script",
                "extension": ".py"
            },
            {
                "id": "cheatengine",
                "name": "Cheat Engine",
                "description": "Cheat Engine AOB script",
                "extension": ".CT"
            },
            {
                "id": "cpp",
                "name": "C/C++ Header",
                "description": "C/C++ header file with pattern arrays",
                "extension": ".h"
            },
            {
                "id": "x64dbg",
                "name": "x64dbg",
                "description": "x64dbg pattern format (no spaces)",
                "extension": ".txt"
            }
        ]
    }
