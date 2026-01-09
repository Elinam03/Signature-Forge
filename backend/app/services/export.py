"""
Export Service

Exports signatures in multiple formats:
1. AOB (Array of Bytes) - Standard format
2. Mask format - Pattern + mask string
3. IDA Python script
4. Cheat Engine AOB
5. C/C++ header
6. x64dbg pattern format
"""

from datetime import datetime
from app.models.signature import GeneratedSignature


def export_aob(signatures: dict[str, list[GeneratedSignature]]) -> str:
    """Export as standard AOB (Array of Bytes) format."""
    lines = ["// SignatureForge - AOB Export", f"// Generated: {datetime.now().isoformat()}", ""]

    for target_name, variants in signatures.items():
        lines.append(f"// === {target_name} ===")
        for i, sig in enumerate(variants, 1):
            lines.append(f"// Variant {i} ({sig.uniqueness_score*100:.0f}% unique, {sig.stability} stability)")
            lines.append(sig.pattern)
            lines.append("")

    return "\n".join(lines)


def export_mask(signatures: dict[str, list[GeneratedSignature]]) -> str:
    """Export as Pattern + Mask format."""
    lines = ["// SignatureForge - Mask Format Export", f"// Generated: {datetime.now().isoformat()}", ""]

    for target_name, variants in signatures.items():
        lines.append(f"// === {target_name} ===")
        for i, sig in enumerate(variants, 1):
            # Convert pattern to hex string without spaces and wildcards as 00
            pattern_bytes = sig.pattern.replace(" ", "").replace("??", "00")
            lines.append(f"// Variant {i} ({sig.uniqueness_score*100:.0f}% unique)")
            lines.append(f"Pattern: {pattern_bytes}")
            lines.append(f"Mask:    {sig.mask}")
            lines.append("")

    return "\n".join(lines)


def export_ida(signatures: dict[str, list[GeneratedSignature]], module_name: str = "game.exe") -> str:
    """Export as IDA Python script."""
    lines = [
        '"""',
        'SignatureForge Generated IDA Python Script',
        f'Generated: {datetime.now().isoformat()}',
        '',
        'Usage: Run in IDA with File -> Script File',
        '"""',
        '',
        'import idc',
        'import idaapi',
        '',
        '',
        'def find_pattern(pattern):',
        '    """',
        '    Search for byte pattern in IDA.',
        '    Pattern format: "0F 84 ? ? ? ? 8B"',
        '    """',
        '    # Convert pattern to IDA format (? instead of ??)',
        '    ida_pattern = pattern.replace("??", "?")',
        '    ',
        '    addr = idc.find_binary(0, idc.SEARCH_DOWN, ida_pattern)',
        '    results = []',
        '    ',
        '    while addr != idc.BADADDR:',
        '        results.append(addr)',
        '        addr = idc.find_binary(addr + 1, idc.SEARCH_DOWN, ida_pattern)',
        '    ',
        '    return results',
        '',
        '',
        '# ========== PATTERNS ==========',
        ''
    ]

    for target_name, variants in signatures.items():
        # Use first variant as primary
        if variants:
            sig = variants[0]
            safe_name = target_name.replace(" ", "_").replace("-", "_")

            lines.append(f'# {target_name}')
            lines.append(f'# Uniqueness: {sig.uniqueness_score*100:.0f}%, Stability: {sig.stability}')
            lines.append(f'{safe_name.upper()}_PATTERN = "{sig.pattern}"')
            lines.append('')
            lines.append(f'def find_{safe_name.lower()}():')
            lines.append(f'    """Find {target_name} in the binary."""')
            lines.append(f'    return find_pattern({safe_name.upper()}_PATTERN)')
            lines.append('')
            lines.append('')

    lines.append('# ========== MAIN ==========')
    lines.append('')
    lines.append('if __name__ == "__main__":')
    lines.append('    print("SignatureForge Pattern Scanner")')
    lines.append('    print("=" * 40)')

    for target_name, variants in signatures.items():
        if variants:
            safe_name = target_name.replace(" ", "_").replace("-", "_")
            lines.append(f'    ')
            lines.append(f'    matches = find_{safe_name.lower()}()')
            lines.append(f'    print(f"{target_name}: {{len(matches)}} match(es)")')
            lines.append(f'    for addr in matches:')
            lines.append(f'        print(f"  0x{{addr:08X}}")')

    return "\n".join(lines)


def export_cheatengine(signatures: dict[str, list[GeneratedSignature]], module_name: str = "game.exe") -> str:
    """Export as Cheat Engine AOB script."""
    lines = [
        '[ENABLE]',
        '// SignatureForge Generated Cheat Engine Script',
        f'// Generated: {datetime.now().isoformat()}',
        '',
    ]

    for target_name, variants in signatures.items():
        if variants:
            sig = variants[0]
            safe_name = target_name.replace(" ", "_").replace("-", "_")

            lines.append(f'// {target_name} ({sig.uniqueness_score*100:.0f}% unique)')
            lines.append(f'aobscanmodule({safe_name},{module_name},{sig.pattern.replace(" ", "")})')
            lines.append(f'registersymbol({safe_name})')
            lines.append('')

    lines.append('// ========== CODE CHANGES ==========')
    lines.append('')

    for target_name, variants in signatures.items():
        if variants:
            safe_name = target_name.replace(" ", "_").replace("-", "_")
            lines.append(f'{safe_name}:')
            lines.append(f'  // Add your code modifications here')
            lines.append(f'  // db 90 90 90 90 90 90  // NOP')
            lines.append('')

    lines.append('')
    lines.append('[DISABLE]')
    lines.append('')

    for target_name, variants in signatures.items():
        if variants:
            sig = variants[0]
            safe_name = target_name.replace(" ", "_").replace("-", "_")

            # Get original bytes for restoration
            original_bytes = sig.pattern.replace(" ", " ").replace("??", "XX")

            lines.append(f'{safe_name}:')
            lines.append(f'  // Restore original bytes')
            lines.append(f'  // db {original_bytes[:23]}...')
            lines.append('')
            lines.append(f'unregistersymbol({safe_name})')
            lines.append('')

    return "\n".join(lines)


def export_cpp(signatures: dict[str, list[GeneratedSignature]], module_name: str = "game.exe") -> str:
    """Export as C/C++ header file."""
    lines = [
        '/*',
        ' * SignatureForge Generated C/C++ Header',
        f' * Generated: {datetime.now().isoformat()}',
        ' *',
        ' * Usage:',
        ' *   void* addr = FindPattern(module, Pattern_Name, Mask_Name, Size_Name);',
        ' */',
        '',
        '#ifndef SIGNATUREFORGE_PATTERNS_H',
        '#define SIGNATUREFORGE_PATTERNS_H',
        '',
        '#include <stdint.h>',
        '',
    ]

    for target_name, variants in signatures.items():
        if variants:
            sig = variants[0]
            safe_name = target_name.replace(" ", "_").replace("-", "_").upper()

            # Convert pattern to byte array
            byte_array_parts = []
            for byte_str in sig.pattern.split():
                if byte_str == "??":
                    byte_array_parts.append("0x00")
                else:
                    byte_array_parts.append(f"0x{byte_str}")

            # Format byte array nicely (8 bytes per line)
            byte_lines = []
            for i in range(0, len(byte_array_parts), 8):
                chunk = byte_array_parts[i:i+8]
                byte_lines.append("    " + ", ".join(chunk))

            lines.append(f'// {target_name}')
            lines.append(f'// Uniqueness: {sig.uniqueness_score*100:.0f}%, Stability: {sig.stability}')
            lines.append(f'static const unsigned char {safe_name}_PATTERN[] = {{')
            lines.append(",\n".join(byte_lines))
            lines.append('};')
            lines.append('')
            lines.append(f'static const char {safe_name}_MASK[] = "{sig.mask}";')
            lines.append('')
            lines.append(f'#define {safe_name}_SIZE {sig.length}')
            lines.append('')
            lines.append('')

    lines.append('/*')
    lines.append(' * Example pattern scanner function:')
    lines.append(' *')
    lines.append(' * void* FindPattern(HMODULE module, const unsigned char* pattern,')
    lines.append(' *                   const char* mask, size_t size) {')
    lines.append(' *     MODULEINFO info;')
    lines.append(' *     GetModuleInformation(GetCurrentProcess(), module, &info, sizeof(info));')
    lines.append(' *     ')
    lines.append(' *     unsigned char* base = (unsigned char*)info.lpBaseOfDll;')
    lines.append(' *     size_t moduleSize = info.SizeOfImage;')
    lines.append(' *     ')
    lines.append(' *     for (size_t i = 0; i < moduleSize - size; i++) {')
    lines.append(' *         bool found = true;')
    lines.append(' *         for (size_t j = 0; j < size; j++) {')
    lines.append(' *             if (mask[j] == \'x\' && base[i + j] != pattern[j]) {')
    lines.append(' *                 found = false;')
    lines.append(' *                 break;')
    lines.append(' *             }')
    lines.append(' *         }')
    lines.append(' *         if (found) return base + i;')
    lines.append(' *     }')
    lines.append(' *     return nullptr;')
    lines.append(' * }')
    lines.append(' */')
    lines.append('')
    lines.append('#endif // SIGNATUREFORGE_PATTERNS_H')

    return "\n".join(lines)


def export_x64dbg(signatures: dict[str, list[GeneratedSignature]]) -> str:
    """Export as x64dbg pattern format."""
    lines = [
        '// SignatureForge - x64dbg Pattern Export',
        f'// Generated: {datetime.now().isoformat()}',
        '//',
        '// Usage: Ctrl+B (Search for Pattern) in x64dbg',
        '// Paste the pattern without spaces',
        '',
    ]

    for target_name, variants in signatures.items():
        lines.append(f'// === {target_name} ===')
        for i, sig in enumerate(variants, 1):
            # x64dbg uses ?? for wildcards, no spaces
            x64dbg_pattern = sig.pattern.replace(" ", "")
            lines.append(f'// Variant {i} ({sig.uniqueness_score*100:.0f}% unique)')
            lines.append(x64dbg_pattern)
            lines.append('')

    return "\n".join(lines)


def export_signatures(
    signatures: dict[str, list[GeneratedSignature]],
    format_type: str,
    module_name: str = "game.exe"
) -> str:
    """
    Export signatures in the specified format.

    Args:
        signatures: Dict of target_name -> list of signature variants
        format_type: One of 'aob', 'mask', 'ida', 'cheatengine', 'cpp', 'x64dbg'
        module_name: Module name for formats that need it

    Returns:
        Formatted export string
    """
    exporters = {
        'aob': lambda s: export_aob(s),
        'mask': lambda s: export_mask(s),
        'ida': lambda s: export_ida(s, module_name),
        'cheatengine': lambda s: export_cheatengine(s, module_name),
        'cpp': lambda s: export_cpp(s, module_name),
        'x64dbg': lambda s: export_x64dbg(s),
    }

    exporter = exporters.get(format_type)
    if not exporter:
        raise ValueError(f"Unknown export format: {format_type}")

    return exporter(signatures)
