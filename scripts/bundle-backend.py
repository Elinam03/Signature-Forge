"""
Bundle the Python backend for Electron distribution.

This script creates a portable Python environment with all dependencies
that can be bundled with the Electron app.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
BUNDLE_DIR = FRONTEND_DIR / "backend-bundle"


def clean_bundle():
    """Remove existing bundle directory."""
    if BUNDLE_DIR.exists():
        print(f"Removing existing bundle: {BUNDLE_DIR}")
        shutil.rmtree(BUNDLE_DIR)


def create_bundle():
    """Create a minimal bundle of the backend."""
    print("Creating backend bundle...")

    # Create bundle directory
    BUNDLE_DIR.mkdir(parents=True, exist_ok=True)

    # Copy backend source files
    app_dir = BUNDLE_DIR / "app"
    shutil.copytree(
        BACKEND_DIR / "app",
        app_dir,
        ignore=shutil.ignore_patterns(
            "__pycache__",
            "*.pyc",
            ".pytest_cache",
        )
    )

    # Copy requirements.txt
    shutil.copy(BACKEND_DIR / "requirements.txt", BUNDLE_DIR / "requirements.txt")

    print(f"Backend bundled to: {BUNDLE_DIR}")


def create_requirements_frozen():
    """Create a frozen requirements file with specific versions."""
    print("Creating frozen requirements...")

    frozen = """# Frozen dependencies for SignatureForge backend
fastapi==0.115.0
uvicorn==0.30.6
pydantic==2.9.2
starlette==0.38.6
typing_extensions>=4.8.0
anyio>=3.7.1
"""

    frozen_path = BUNDLE_DIR / "requirements-frozen.txt"
    frozen_path.write_text(frozen)
    print(f"Created: {frozen_path}")


def main():
    print("=" * 50)
    print("SignatureForge Backend Bundler")
    print("=" * 50)

    clean_bundle()
    create_bundle()
    create_requirements_frozen()

    print("\n" + "=" * 50)
    print("Bundle complete!")
    print("=" * 50)
    print(f"\nBundle location: {BUNDLE_DIR}")
    print("\nFor the Electron app to work, users need Python installed.")
    print("The app will automatically install dependencies on first run.")


if __name__ == "__main__":
    main()
