# SignatureForge

> **Intelligent x86 Binary Signature Generator**

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/ZxPwdz/Signature-Forge)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-yellow)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue)](https://typescriptlang.org)

**Created by [ZxPwd](https://github.com/ZxPwdz)**

A sophisticated desktop application for generating version-resilient byte signatures from x86 disassembly. Designed for reverse engineers, game modders, security researchers, and cheat/trainer developers who need signatures that survive compiler changes and code updates.

---

## Preview

![SignatureForge Demo](preview.gif)

---

## What is SignatureForge?

SignatureForge is a tool that helps you create **byte pattern signatures** that can locate specific code in executable files - even after the software has been updated.

### The Problem

When reverse engineering or modding software, you often need to find specific functions or code blocks. You might find a function at address `0x00AB1000` today, but after an update, that same function could be at `0x00CD2000`. Hardcoded addresses break.

### The Solution

Instead of using addresses, you use **byte patterns** (signatures) that describe the actual machine code. SignatureForge analyzes your assembly code and creates smart patterns with **wildcards** (`??`) for bytes that are likely to change between versions.

**Example:**
```
Hardcoded:  0F 84 79 05 00 00 8B 8D 2C FE FF FF   (breaks on update)
Smart:      0F 84 ?? ?? ?? ?? 8B 8D ?? ?? ?? ??   (survives updates)
```

---

## Example: From Disassembler to Signature

### Step 1: Copy from your disassembler (x64dbg, IDA, Ghidra, etc.)

```asm
00AB1000 | 56                   | push esi                         | esi:"LdrpInitializeProcess"
00AB1001 | 8B70 08              | mov esi,dword ptr ds:[eax+8]     | esi:"LdrpInitializeProcess"
00AB1004 | 8BD1                 | mov edx,ecx                      |
00AB1006 | 57                   | push edi                         | edi:"minkernel\ntdll\ldrinit.c"
00AB1007 | 8B78 14              | mov edi,dword ptr ds:[eax+14]    | edi:"minkernel\ntdll\ldrinit.c"
00AB100A | C1EA 08              | shr edx,8                        |
00AB100D | 88143E               | mov byte ptr ds:[esi+edi],dl     |
00AB1010 | 8B50 14              | mov edx,dword ptr ds:[eax+14]    |
00AB1013 | 8B70 08              | mov esi,dword ptr ds:[eax+8]     | esi:"LdrpInitializeProcess"
00AB1016 | 42                   | inc edx                          |
00AB1017 | 8950 14              | mov dword ptr ds:[eax+14],edx    |
00AB101A | 880C32               | mov byte ptr ds:[edx+esi],cl     | edx+esi*1:"LdrpInitializeProcess"
00AB101D | 8B48 14              | mov ecx,dword ptr ds:[eax+14]    |
00AB1020 | 41                   | inc ecx                          |
00AB1021 | 5F                   | pop edi                          | edi:"minkernel\ntdll\ldrinit.c"
00AB1022 | 8948 14              | mov dword ptr ds:[eax+14],ecx    |
00AB1025 | 5E                   | pop esi                          | esi:"LdrpInitializeProcess"
00AB1026 | C3                   | ret                              |
```

### Step 2: Paste into SignatureForge

Simply paste the assembly listing into the editor panel.

### Step 3: Generate Signatures

Click **Generate** or press `Ctrl+G`. SignatureForge will:
- Parse the assembly automatically (supports x64dbg, Cheat Engine, and raw hex formats)
- Analyze each instruction for volatility
- Generate multiple signature variants with intelligent wildcarding
- Score each variant by uniqueness and stability

### Step 4: Use Your Signature

Copy the generated pattern and use it in your scanner, trainer, or mod. The signature will find the same code even after the target software is updated!

---

## Use Cases

| Use Case | Description |
|----------|-------------|
| **Game Modding** | Create trainers and mods that survive game updates |
| **Cheat Development** | Find game functions reliably across patches |
| **Security Research** | Track malware variants or vulnerable code patterns |
| **Binary Analysis** | Identify code across different builds and versions |
| **Reverse Engineering** | Document and relocate code patterns efficiently |
| **Anti-Cheat Research** | Study how signatures are used for detection |

---

## Features

### Three Signature Generation Modes

| Mode | Button | Description |
|------|--------|-------------|
| **Click-to-Target** | `Generate` | Select a target from dropdown, click Generate |
| **Target Mode** | `Start` | Generate from the first instruction in your paste |
| **Smart Mode** | `Smart` | AI-powered analysis finds optimal anchor points automatically |

### Intelligent Wildcarding

SignatureForge understands x86 semantics and applies smart wildcarding:

- **Relative Jumps/Calls** - Automatically wildcarded (offsets change when code relocates)
- **Stack Offsets** - `[ebp-XX]`, `[esp+XX]` frames vary between builds
- **Global Addresses** - Affected by ASLR and relocation
- **Struct Offsets** - `[reg+XX]` layouts may change
- **Immediate Values** - Constants that may be tuned between versions

### 9 Wildcard Strategies

Each generation produces variants using different strategies:

1. **Minimal** - Only jump/call offsets (maximum uniqueness)
2. **Conservative** - User's default settings (balanced)
3. **Balanced** - Between conservative and aggressive
4. **Aggressive** - Everything wildcarded (maximum stability)
5. **Stack Focus** - Only stack frame offsets
6. **Global Focus** - Only global addresses
7. **Memory Heavy** - All memory displacements
8. **Max Stability** - Maximum version resilience
9. **Immediates Only** - Only immediate values

### Smart Analysis Engine

The Smart Mode analyzes your entire input and:

- Scores each instruction for stability, uniqueness, and context quality
- Identifies stable regions ideal for signatures
- Recommends the best anchor points with explanations
- Generates signatures for top-scoring targets automatically

### Advanced Features

- **11 Context Variations** - Different before/after context windows
- **Anchor Shifting** - Uses nearby stable instructions as anchors
- **Similarity Deduplication** - Keeps patterns >25% different
- **Auto-Format Detection** - x64dbg, Cheat Engine, or raw hex
- **One-Click Copy** - Pattern, mask, or IDA format
- **Keyboard Shortcuts** - `Ctrl+G` generate, `Ctrl+K` options, etc.

---

## Installation

### Option 1: Standalone Desktop App (Windows)

1. Download from the [Releases](https://github.com/ZxPwdz/Signature-Forge/releases) page
2. Extract and run `SignatureForge.exe`
3. No installation required

### Option 2: Development Setup

#### Prerequisites
- Python 3.11+
- Node.js 18+
- npm

#### Backend Setup
```bash
cd signature-forge/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd signature-forge/frontend
npm install
npm run dev
```

#### Electron Desktop (Development)
```bash
cd signature-forge/frontend
npm run electron:dev
```

#### Build Standalone Executable
```bash
cd signature-forge/frontend
npm run electron:build:win
```

---

## Usage

### Supported Input Formats

#### x64dbg / OllyDbg Format
```
00B27AB0 | 0F84 79050000 | je apr24.2020.B2802F | Lawnmower_A
00B27AB6 | 8B8D 2CFEFFFF | mov ecx,[ebp-1D4]
```

#### Cheat Engine Format
```
Apr24.2020.exe+46751D - 0F84 85020000 - je Apr24.2020.exe+4677A8
Apr24.2020.exe+467523 - 8B91 88010000 - mov edx,[ecx+00000188]
```

#### Raw Hex
```
0F 84 79 05 00 00 8B 8D 2C FE FF FF 81 C1 CC 06 00 00
```

### Workflow

1. **Paste** disassembly into the editor (left panel)
2. **Select** a target from the dropdown or use Smart Mode
3. **Click** Generate (or press `Ctrl+G`)
4. **Review** variants sorted by uniqueness score
5. **Copy** your preferred signature pattern

---

## Technical Architecture

```
+-----------------------------------------------------+
|            FRONTEND (React + TypeScript)            |
|  +-----------+ +--------------+ +--------------+    |
|  |   Monaco  | |  Signature   | |   Smart      |    |
|  |   Editor  | |   Panel      | |   Analysis   |    |
|  +-----------+ +--------------+ +--------------+    |
+--------------------------+--------------------------+
|                Electron (Desktop Shell)             |
|     Custom Title Bar - Window Controls - IPC        |
+--------------------------+--------------------------+
                           | REST API
+--------------------------v--------------------------+
|              BACKEND (Python + FastAPI)             |
|  +-----------+ +--------------+ +--------------+    |
|  |Disassembly| |  Signature   | |   Smart      |    |
|  |  Parser   | |   Engine     | |  Analyzer    |    |
|  | (Capstone)| | (9 Strats)   | |  (Scoring)   |    |
|  +-----------+ +--------------+ +--------------+    |
+-----------------------------------------------------+
```

### Tech Stack

**Frontend**
- React 19 + TypeScript + Vite
- Monaco Editor (VS Code's editor)
- TailwindCSS (dark cyberpunk theme)
- Zustand (state management)
- Electron (desktop wrapper)

**Backend**
- Python 3.11 + FastAPI
- Capstone (x86 disassembly engine)
- Pydantic (data validation)

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parse` | POST | Parse disassembly input into structured instructions |
| `/api/generate` | POST | Generate signatures for specified targets |
| `/api/generate-targeted` | POST | Generate from first instruction (Target Mode) |
| `/api/smart-analyze` | POST | Analyze instructions and score anchor points |
| `/api/smart-generate` | POST | Smart analysis + automatic signature generation |
| `/api/health` | GET | Health check endpoint |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+G` | Generate signatures |
| `Ctrl+K` | Open options panel |
| `Ctrl+H` | Open history panel |
| `Ctrl+/` | Show shortcuts help |
| `Escape` | Close panels |

---

## Project Structure

```
signature-forge/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── models/              # Pydantic models
│   │   │   ├── instruction.py   # Instruction types
│   │   │   └── signature.py     # Signature models
│   │   ├── routers/             # API endpoints
│   │   │   └── generate.py      # Generation routes
│   │   └── services/
│   │       ├── parser.py        # Input parsing
│   │       ├── analyzer.py      # Byte analysis
│   │       ├── signature.py     # Generation engine
│   │       └── smart_analyzer.py # Smart scoring
│   └── requirements.txt
│
├── frontend/
│   ├── electron/
│   │   ├── main.cjs             # Electron main process
│   │   └── preload.cjs          # Preload script
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # API client
│   │   ├── stores/              # Zustand state
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## Signature Quality Metrics

### Uniqueness Score (0-100%)
- Higher = less likely to have false matches
- Based on ratio of concrete bytes vs wildcards
- Bonus for longer patterns
- Penalty for consecutive wildcards

### Stability Rating
- **High** - Many wildcards on volatile bytes, survives updates
- **Medium** - Balanced wildcarding
- **Low** - Few wildcards, may break between versions

---

## Wildcard Rules

| Byte Type | Volatility | Default Action | Reason |
|-----------|------------|----------------|--------|
| Relative JMP/CALL | High | Wildcard | Target addresses change |
| Stack offsets `[ebp-X]` | High | Wildcard | Local variable layout varies |
| Global addresses | High | Wildcard | ASLR/relocation affects |
| Struct offsets `[reg+X]` | Medium | Configurable | Struct layouts may change |
| Immediate values | Medium | Configurable | Constants may be tuned |
| Register operations | Low | Keep | Opcodes are stable |
| Simple opcodes | Low | Keep | Single-byte instructions |

---

## Building for Distribution

This section explains how to build SignatureForge into a standalone desktop application that can be distributed to end users.

### Prerequisites

Before building, ensure you have the following installed:

| Requirement | Version | Download |
|-------------|---------|----------|
| **Node.js** | 18.0 or higher | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0 or higher | Included with Node.js |
| **Python** | 3.11 or higher | [python.org](https://www.python.org/) |
| **Git** | Any recent version | [git-scm.com](https://git-scm.com/) |

Verify your installations:
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
python --version  # Should show Python 3.11.x or higher
```

---

### Step-by-Step Build Process

#### Step 1: Clone the Repository

```bash
git clone https://github.com/ZxPwdz/Signature-Forge.git
cd Signature-Forge
```

#### Step 2: Install Backend Dependencies

The backend uses Python with FastAPI and Capstone for x86 disassembly.

```bash
cd backend
pip install -r requirements.txt
```

**What gets installed:**
- `fastapi` - Modern Python web framework for the API
- `uvicorn` - ASGI server to run FastAPI
- `capstone` - Disassembly engine for x86/x64 instructions
- `pydantic` - Data validation and serialization

#### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

**What gets installed:**
- React 19 + TypeScript
- Vite (build tool)
- Electron (desktop framework)
- electron-builder (packaging tool)
- Monaco Editor (code editor)
- TailwindCSS (styling)
- And other dependencies...

This may take a few minutes depending on your internet speed.

#### Step 4: Build the Frontend

This compiles TypeScript and bundles the React application:

```bash
npm run build
```

**What happens:**
1. TypeScript compiler checks for type errors
2. Vite bundles and minifies the code
3. Output is placed in `frontend/dist/`

#### Step 5: Build the Electron Application

Now build the standalone desktop application:

**For Windows:**
```bash
npm run electron:build:win
```

**For macOS:**
```bash
npm run electron:build:mac
```

**For Linux:**
```bash
npm run electron:build:linux
```

**For all platforms (if building on each OS):**
```bash
npm run electron:build
```

---

### Build Output

After a successful build, you'll find the output in `frontend/release/`:

```
frontend/release/
├── win-unpacked/                    # Windows portable version
│   ├── SignatureForge.exe           # Main executable
│   ├── resources/
│   │   ├── app.asar                 # Bundled frontend code
│   │   └── backend/                 # Python backend source
│   │       ├── app/
│   │       │   ├── main.py
│   │       │   ├── models/
│   │       │   ├── routers/
│   │       │   └── services/
│   │       └── requirements.txt
│   ├── *.dll                        # Chromium/Electron DLLs
│   └── locales/                     # Language files
│
├── SignatureForge Setup X.X.X.exe   # Windows installer (NSIS)
└── SignatureForge-X.X.X-portable.exe # Windows portable single-file
```

---

### How the Bundled Application Works

SignatureForge is a **hybrid Electron + Python application**. Here's how it works when distributed:

```
┌─────────────────────────────────────────────────────────────┐
│                    SignatureForge.exe                        │
│                     (Electron Shell)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. On startup, Electron checks if Python is available       │
│                                                              │
│  2. Spawns Python backend process:                           │
│     python -m uvicorn app.main:app --port 8000              │
│                                                              │
│  3. Waits for backend to be ready (health check)            │
│                                                              │
│  4. Loads the React frontend in the Electron window          │
│                                                              │
│  5. Frontend communicates with backend via REST API          │
│     (localhost:8000)                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Important:** End users need Python 3.11+ installed on their system. The application will:
1. Detect Python installation
2. Auto-install required pip packages on first run
3. Start the backend server automatically

---

### Distribution Options

#### Option A: Portable Folder (Recommended for Testing)

Distribute the entire `win-unpacked/` folder:

```
SignatureForge-Portable/
├── SignatureForge.exe
├── resources/
├── *.dll
└── locales/
```

**Pros:** No installation required, just run the exe
**Cons:** Larger folder size (~200MB)

#### Option B: NSIS Installer

Use the generated `SignatureForge Setup X.X.X.exe`:

**Pros:** Professional installer experience, creates Start Menu shortcuts
**Cons:** Requires installation

#### Option C: Single Portable Executable

Use `SignatureForge-X.X.X-portable.exe`:

**Pros:** Single file distribution
**Cons:** Slower startup (extracts on each run)

---

### End User Requirements

Users who download your built application need:

| Requirement | Notes |
|-------------|-------|
| **Windows 10/11** | 64-bit recommended |
| **Python 3.11+** | Must be in PATH |
| **pip** | Included with Python |
| **Internet** | Only for first run (pip install) |

**First Run Experience:**
1. User launches `SignatureForge.exe`
2. App detects Python and installs dependencies (~30 seconds)
3. Backend starts, frontend loads
4. Ready to use!

---

### Troubleshooting Build Issues

#### "npm run build" fails with TypeScript errors

```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

#### "electron-builder" fails

```bash
# Ensure you have the latest electron-builder
npm install electron-builder@latest --save-dev
npm run electron:build:win
```

#### Python dependencies fail to install

```bash
# Upgrade pip first
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### Backend won't start (port 8000 in use)

```bash
# Check what's using port 8000
netstat -ano | findstr :8000

# Kill the process or change the port in electron/main.cjs
```

#### Build output is too large

The build includes Chromium (~150MB). This is normal for Electron apps. To reduce size:
- Use `electron-builder`'s ASAR compression (enabled by default)
- Consider using `electron-builder`'s `--dir` flag for testing

---

### Development vs Production

| Aspect | Development | Production Build |
|--------|-------------|------------------|
| **Frontend** | Vite dev server (hot reload) | Bundled static files |
| **Backend** | Manual start required | Auto-started by Electron |
| **Port** | 5173 (Vite) + 8000 (API) | 8000 (API only) |
| **Debug** | DevTools available | DevTools hidden |
| **Size** | Source files | Minified + compressed |

---

### Build Scripts Reference

All build scripts are defined in `frontend/package.json`:

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start Vite dev server |
| `build` | `tsc -b && vite build` | TypeScript check + bundle |
| `electron:dev` | `concurrently ...` | Dev mode with Electron |
| `electron:build` | `electron-builder` | Build for current OS |
| `electron:build:win` | `electron-builder --win` | Build Windows version |
| `electron:build:mac` | `electron-builder --mac` | Build macOS version |
| `electron:build:linux` | `electron-builder --linux` | Build Linux version |

---

### Creating a GitHub Release

After building, create a release on GitHub:

1. Go to your repository → Releases → "Create a new release"
2. Tag version: `v1.0.0`
3. Upload these files:
   - `SignatureForge Setup X.X.X.exe` (Windows installer)
   - `SignatureForge-X.X.X-portable.exe` (Windows portable)
   - `SignatureForge-Portable.zip` (zipped win-unpacked folder)
4. Add release notes describing features

---

## Credits & Acknowledgments

**Author:** [ZxPwd](https://github.com/ZxPwdz)

Built with:
- [Capstone](https://www.capstone-engine.org/) - Disassembly framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [FastAPI](https://fastapi.tiangolo.com/) - Python API framework
- [Electron](https://www.electronjs.org/) - Desktop framework
- [React](https://react.dev/) - UI framework
- [TailwindCSS](https://tailwindcss.com/) - Styling

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<p align="center">
  <b>SignatureForge</b> - Making binary signatures that actually work.
</p>
