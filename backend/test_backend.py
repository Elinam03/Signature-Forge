"""
Quick test script for backend functionality.
"""

import sys
sys.path.insert(0, '.')

from app.services.parser import parse_input, calculate_stats
from app.services.signature import generate_signatures, find_targets
from app.models.signature import SignatureOptions

# Sample x64dbg format data (compact, no leading blank lines)
X64DBG_SAMPLE = """00B27AB0 | 0F84 79050000 | je apr24.2020.B2802F | Lawnmower_A
00B27AB6 | 8B8D 2CFEFFFF | mov ecx,dword ptr ss:[ebp-1D4] |
00B27ABC | 81C1 CC060000 | add ecx,6CC |
00B27AC2 | 898D 34FCFFFF | mov dword ptr ss:[ebp-3CC],ecx |
00B27AC8 | 8B95 34FCFFFF | mov edx,dword ptr ss:[ebp-3CC] |
00B27ACE | 81C2 D6660000 | add edx,66D6 |
00B27AD4 | 8B85 34FCFFFF | mov eax,dword ptr ss:[ebp-3CC] |
00B27ADA | 8B08 | mov ecx,dword ptr ds:[eax] |
00B27ADC | 2BCA | sub ecx,edx |
00B27ADE | 8339 01 | cmp dword ptr ds:[ecx],1 |
00B27AE1 | 0F85 48050000 | jne apr24.2020.B2802F | Lawnmower_B"""

# Sample Cheat Engine format data
CE_SAMPLE = """Apr24.2020.exe+46751D - 0F84 6D010000 - je Apr24.2020.exe+467690
Apr24.2020.exe+467523 - 83 65 F0 00 - and dword ptr [ebp-10],00
Apr24.2020.exe+467527 - 33 C0 - xor eax,eax"""

# Sample raw hex
HEX_SAMPLE = "0F 84 79 05 00 00 8B 8D 2C FE FF FF 81 C1 CC 06 00 00"


def test_parser():
    print("=" * 60)
    print("Testing Parser Service")
    print("=" * 60)

    # Test x64dbg format
    print("\n1. Testing x64dbg format...")
    instructions, labels, fmt, module = parse_input(X64DBG_SAMPLE)
    print(f"   Format detected: {fmt}")
    print(f"   Instructions parsed: {len(instructions)}")
    print(f"   Labels found: {labels}")

    if instructions:
        inst = instructions[0]
        print(f"   First instruction: {inst.mnemonic} {inst.operands}")
        print(f"   Type: {inst.type.value}")
        print(f"   Bytes: {' '.join(inst.bytes)}")
        print(f"   Wildcard positions: {inst.wildcard_positions}")

    # Test CE format
    print("\n2. Testing Cheat Engine format...")
    instructions, labels, fmt, module = parse_input(CE_SAMPLE)
    print(f"   Format detected: {fmt}")
    print(f"   Instructions parsed: {len(instructions)}")
    print(f"   Module: {module}")

    if instructions:
        inst = instructions[0]
        print(f"   First instruction: {inst.mnemonic} {inst.operands}")
        print(f"   Raw address: {inst.raw_address}")

    # Test raw hex
    print("\n3. Testing raw hex format...")
    instructions, labels, fmt, module = parse_input(HEX_SAMPLE)
    print(f"   Format detected: {fmt}")
    print(f"   Instructions parsed: {len(instructions)}")

    for inst in instructions:
        print(f"   - {inst.address}: {inst.mnemonic} {inst.operands} ({inst.type.value})")

    return True


def test_signature_generation():
    print("\n" + "=" * 60)
    print("Testing Signature Generation")
    print("=" * 60)

    # Parse sample data
    instructions, labels, fmt, module = parse_input(X64DBG_SAMPLE)
    print(f"\nTotal instructions: {len(instructions)}")
    print(f"Total bytes available: {sum(i.size for i in instructions)}")

    # Find targets
    targets = find_targets(instructions, "all_labeled")
    print(f"Targets found: {[t[1] for t in targets]}")

    # Generate signatures for first target
    if targets:
        target_idx, target_name = targets[0]
        print(f"\nGenerating signatures for: {target_name} (index {target_idx})")

        options = SignatureOptions(
            min_length=15,  # Lower min_length for testing
            max_length=50,
            variants=5
        )

        variants = generate_signatures(instructions, target_idx, options)

        print(f"Variants generated: {len(variants)}")

        for i, sig in enumerate(variants, 1):
            print(f"\n   Variant {i}:")
            print(f"   Pattern: {sig.pattern}")
            print(f"   Mask: {sig.mask}")
            print(f"   Uniqueness: {sig.uniqueness_score*100:.0f}%")
            print(f"   Stability: {sig.stability}")
            print(f"   Strategy: {sig.strategy}")

    return True


def test_stats():
    print("\n" + "=" * 60)
    print("Testing Statistics")
    print("=" * 60)

    instructions, labels, fmt, module = parse_input(X64DBG_SAMPLE)
    stats = calculate_stats(instructions, labels)

    print(f"\nTotal instructions: {stats.total}")
    print(f"Total bytes: {stats.total_bytes}")
    print(f"Labeled: {stats.labeled}")
    print(f"By type: {stats.by_type}")

    return True


if __name__ == "__main__":
    try:
        test_parser()
        test_signature_generation()
        test_stats()
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED!")
        print("=" * 60)
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
