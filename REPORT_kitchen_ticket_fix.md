# Kitchen Ticket Fix Report

## Bug 1: Separator Line Overflow

**Root cause:** `chars_per_line` was set to 48 for 80mm paper, but standard Epson TM-T88 thermal printers fit 42 characters per line at Font A. Divider lines of 48 identical characters wrapped on hardware, producing garbled stacked output.

**Changes:**

| File | Line | Change |
|------|------|--------|
| `backend/app/printing/escpos_formatter.py` | 66 | `chars_per_line`: 48 -> 42 for 80mm paper |
| `backend/app/printing/templates/base_template.py` | 15 | `chars_per_line`: 48 -> 42 for 80mm paper |
| `backend/app/printing/escpos_formatter.py` | 160-162 | Added `_print_mode_byte()` + `ALIGN_LEFT` reset before divider bytes to prevent double-width mode leakage |

## Bug 2: Modifier Prefix Detection Broken for Production Data

**Root cause:** `_render_modifier()` checked `mod.get('type', '')` for prefix detection, but production modifier dicts from the event projection use `action` as the field name (values: `"add"`, `"remove"`, `"substitute"`). Because `type` was never present in production data, `_default_prefix()` was never called, and dict modifiers rendered as plain text without `[ADD]`, `[NO]`, `[SUB]` prefix labels.

**Change:**

| File | Line | Change |
|------|------|--------|
| `backend/app/printing/templates/kitchen_ticket.py` | 277 | `mod.get('type', '')` -> `mod.get('type') or mod.get('action', '')` |

## Tests Added

| File | Test | Verifies |
|------|------|----------|
| `backend/tests/test_escpos_formatter.py` | `test_divider` | Divider produces exactly 42 chars (updated from 48) |
| `backend/tests/test_escpos_formatter.py` | `test_divider_resets_print_mode` | ESC ! 0x00 reset appears before divider bytes |
| `backend/tests/test_print_templates.py` | `test_kitchen_ticket_modifiers_string` | String modifiers render with auto-detected `[NO]`/`[ADD]`/`[SUB]` prefixes |
| `backend/tests/test_print_templates.py` | `test_kitchen_ticket_modifiers_dict` | Dict modifiers (production format with `action` field) render with correct prefixes |
| `backend/tests/test_print_templates.py` | `test_kitchen_ticket_no_modifiers_clean` | Empty modifiers produce no blank lines or artifacts |
| `backend/tests/test_print_templates.py` | `test_separator_width_80mm` | 80mm dividers produce exactly 42 chars through full formatter pipeline |
| `backend/tests/test_print_templates.py` | `test_separator_width_58mm` | 58mm dividers produce exactly 32 chars through full formatter pipeline |

## Test Results

- **523 passed**, 0 failures, 0 errors
- All existing tests continue to pass with no regressions
