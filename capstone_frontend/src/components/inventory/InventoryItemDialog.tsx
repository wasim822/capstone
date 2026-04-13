"use client";

/**
 * InventoryItemDialog.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A modal dialog used to CREATE or EDIT a single inventory item.
 *
 * Key responsibilities:
 *  1. Render a controlled form with all product fields.
 *  2. Enforce strict input rules at the keystroke level (block bad characters
 *     before they ever reach the field value).
 *  3. Run full validation before allowing the user to submit.
 *  4. Ask for confirmation on both "Submit" and "Cancel" to prevent accidents.
 *  5. Build the correct API payload and delegate the actual HTTP call to the
 *     parent component via the `onSubmit` callback.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import {
  Button,
  Chip,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalDialog,
  Stack,
  Typography,
} from "@mui/joy";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";

import type { InventoryItemDTO } from "@/services/api/inventory/inventory.types";
import { InventoryItemStatusEnum } from "@/services/api/inventory/inventory.types";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// Edit these values in ONE place and the rest of the component updates itself.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum number of characters allowed for standard text fields.
 * Applies to: Product Name, Category, Location.
 */
const MAX_CHARS_DEFAULT = 50;

/**
 * Description gets a much larger limit because it is a free-text notes field.
 * 500 characters ≈ roughly 80–100 words.
 */
const MAX_CHARS_DESCRIPTION = 500;

/**
 * SKU character limits.
 *
 * About SKUs (Stock Keeping Units):
 *  - Internally created codes that uniquely identify a product variant.
 *  - Typically 8–12 alphanumeric characters (human-readable sweet spot).
 *  - Maximum recommended by most systems: 32 characters.
 *  - Allowed separators: dash (-) or underscore (_) only.
 *  - NO spaces, NO special characters like * / @ # etc.
 *  - Structure goes from general → specific: BRAND-STYLE-COLOR-SIZE
 *
 * Our internal format: PROX-XXX-0001
 *  ┌──────┬─────┬──────┐
 *  │ PROX │ ABC │ 0001 │
 *  └──────┴─────┴──────┘
 *    brand  3-letter  4-digit
 *    prefix  variant   sequence
 *
 * Total length with dashes: 13 characters — well within the 8–32 range.
 *
 * Difference from other codes:
 *  - UPC: always exactly 12 numeric digits (external, universal).
 *  - SKU: alphanumeric, customizable, unique to the business (internal).
 */
const SKU_MIN_CHARS = 8;
const SKU_MAX_CHARS = 32; // hard ceiling; optimal is 8–12

/**
 * Regex that enforces our exact SKU format: PROX-XXX-0001
 *  ^PROX-        → must start with the literal prefix "PROX-"
 *  [A-Z]{3}-     → exactly 3 uppercase letters followed by a dash
 *  \d{4}$        → exactly 4 digits at the end
 *
 * Examples that PASS:  PROX-ABC-0001  PROX-XYZ-9999
 * Examples that FAIL:  PRO-ABC-0001   PROX-AB-0001   PROX-ABC-001
 *                      PROX-abc-0001  PROX_ABC_0001
 */
const SKU_REGEX = /^PROX-[A-Z]{3}-\d{4}$/;

/**
 * Regex used to BLOCK invalid keystrokes in the SKU field in real time.
 * Only uppercase letters (A–Z), digits (0–9), dash (-), and underscore (_)
 * are allowed. Everything else is silently dropped.
 */
const SKU_ALLOWED_CHARS_REGEX = /^[A-Z0-9\-_]*$/;

/** Quantity boundaries */
const QUANTITY_MIN = 0;
const QUANTITY_MAX = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG MODE TYPE
// ─────────────────────────────────────────────────────────────────────────────

/** Controls whether the dialog creates a new item or edits an existing one. */
type Mode = "create" | "edit";

// ─────────────────────────────────────────────────────────────────────────────
// FORM VALUE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All form fields are stored as strings so controlled <Input> elements work
 * correctly. Numeric fields (Quantity, UnitPrice) are converted to numbers
 * only when building the final API payload.
 */
type FormValues = {
  ProductName: string;
  Sku:         string;
  Category:    string;
  Quantity:    string;
  UnitPrice:   string;
  Location:    string;
  Description: string;
};

/**
 * Converts an optional InventoryItemDTO (coming from the backend) into the
 * string-based FormValues shape used by the form.
 * Falls back to empty strings / empty quantity when no initial data is given.
 */
function toFormValues(dto?: Partial<InventoryItemDTO> | null): FormValues {
  return {
    ProductName: String(dto?.ProductName ?? ""),
    Sku:         String(dto?.Sku         ?? ""),
    Category:    String(dto?.Category    ?? ""),
    Quantity:    dto?.Quantity  == null   ? "" : String(dto.Quantity),
    UnitPrice:   dto?.UnitPrice == null   ? "" : String(dto.UnitPrice),
    Location:    String(dto?.Location    ?? ""),
    Description: String(dto?.Description ?? ""),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS LOGIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derives the stock status from a raw quantity value.
 * This intentionally mirrors the backend logic so the frontend preview always
 * matches what the server will persist.
 *
 *  qty <= 0  →  Out of Stock  (enum OutStock)
 *  qty 1–5   →  Low Stock     (enum LowStock)
 *  qty 6+    →  In Stock      (enum InStock)
 */
function computeStatus(qty: number): number {
  if (qty <= 0) return Number(InventoryItemStatusEnum.OutStock);
  if (qty <= 5) return Number(InventoryItemStatusEnum.LowStock);
  return Number(InventoryItemStatusEnum.InStock);
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StatusPreview
 * Displays a colour-coded MUI Joy Chip that reacts live to whatever quantity
 * the user has typed so far. No submit required to see the status update.
 */
function StatusPreview({ quantity }: { quantity: string }) {
  const n = Number(quantity);

  // Show a neutral placeholder while the field is empty or invalid
  if (!quantity.trim() || isNaN(n)) {
    return <Chip color="neutral" size="sm" variant="soft">— enter quantity</Chip>;
  }

  if (n <= 0) return <Chip color="danger"  size="sm" variant="soft">Out of Stock</Chip>;
  if (n <= 5) return <Chip color="warning" size="sm" variant="soft">Low Stock</Chip>;
  return           <Chip color="success" size="sm" variant="soft">In Stock</Chip>;
}

/**
 * CharCounter
 * A small helper text placed under text inputs to show the user how many
 * characters they have used vs the maximum allowed.
 * Turns red automatically when the value exceeds `max`.
 */
function CharCounter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <FormHelperText sx={{ color: over ? "danger.500" : "text.tertiary" }}>
      {value.length} / {max} characters{over ? " — exceeds limit" : ""}
    </FormHelperText>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * validate()
 * Runs all field-level rules against the current form values and returns a
 * map of { fieldName → errorMessage } for every field that fails.
 * An empty object means the form is valid and safe to submit.
 *
 * Called once when the user clicks the submit button. Inline errors then
 * clear individually as the user corrects each field (see setField()).
 */
function validate(v: FormValues): Record<string, string> {
  const e: Record<string, string> = {};

  // ── Product Name ──────────────────────────────────────────────────────────
  if (!v.ProductName.trim()) {
    e.ProductName = "Product name is required.";
  } else if (v.ProductName.length > MAX_CHARS_DEFAULT) {
    e.ProductName = `Product name must not exceed ${MAX_CHARS_DEFAULT} characters.`;
  }

  // ── SKU ───────────────────────────────────────────────────────────────────
  // Three layers of SKU validation:
  //  1. Not empty
  //  2. Length within the 8–32 character range
  //  3. Must exactly match our PROX-XXX-0001 pattern
  if (!v.Sku.trim()) {
    e.Sku = "SKU is required.";
  } else if (v.Sku.length < SKU_MIN_CHARS) {
    e.Sku = `SKU must be at least ${SKU_MIN_CHARS} characters (recommended: 8–12).`;
  } else if (v.Sku.length > SKU_MAX_CHARS) {
    e.Sku = `SKU cannot exceed ${SKU_MAX_CHARS} characters.`;
  } else if (!SKU_REGEX.test(v.Sku.trim())) {
    e.Sku = "SKU must follow the format PROX-XXX-0001 — 3 uppercase letters then 4 digits.";
  }

  // ── Category ──────────────────────────────────────────────────────────────
  if (!v.Category.trim()) {
    e.Category = "Category is required.";
  } else if (v.Category.length > MAX_CHARS_DEFAULT) {
    e.Category = `Category must not exceed ${MAX_CHARS_DEFAULT} characters.`;
  }

  // ── Location ──────────────────────────────────────────────────────────────
  if (!v.Location.trim()) {
    e.Location = "Location is required.";
  } else if (v.Location.length > MAX_CHARS_DEFAULT) {
    e.Location = `Location must not exceed ${MAX_CHARS_DEFAULT} characters.`;
  }

  // ── Quantity ──────────────────────────────────────────────────────────────
  // Must be a whole number (no decimals) within 0–10,000.
  // Alphabetic input is blocked at the keystroke level (see handleQuantityKey),
  // but we validate here as a safety net.
  if (!v.Quantity.trim()) {
    e.Quantity = "Quantity is required.";
  } else {
    const n = Number(v.Quantity);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      e.Quantity = "Quantity must be a whole number (no decimals or letters).";
    } else if (n < QUANTITY_MIN) {
      e.Quantity = `Quantity cannot be less than ${QUANTITY_MIN}.`;
    } else if (n > QUANTITY_MAX) {
      e.Quantity = `Quantity cannot exceed ${QUANTITY_MAX.toLocaleString()}.`;
    }
  }

  // ── Unit Price ────────────────────────────────────────────────────────────
  // Must be a non-negative number. Decimals (e.g. 9.99) are allowed.
  if (!v.UnitPrice.trim()) {
    e.UnitPrice = "Unit price is required.";
  } else {
    const n = Number(v.UnitPrice);
    if (!Number.isFinite(n)) e.UnitPrice = "Unit price must be a valid number.";
    else if (n < 0)          e.UnitPrice = "Unit price cannot be negative.";
  }

  // ── Description ───────────────────────────────────────────────────────────
  // Optional field — only validated if the user has typed something.
  if (v.Description.length > MAX_CHARS_DESCRIPTION) {
    e.Description = `Description must not exceed ${MAX_CHARS_DESCRIPTION} characters.`;
  }

  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMATION DIALOG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ConfirmDialog
 * A reusable modal that prompts "Are you sure?" before a destructive or
 * irreversible action. Used for both Submit and Cancel in this form.
 *
 * Props:
 *  open         — controls visibility
 *  message      — the question shown to the user
 *  confirmLabel — text on the confirm button (defaults to "Yes, Proceed")
 *  confirmColor — button colour; use "danger" for destructive actions
 *  onConfirm    — called when the user clicks the confirm button
 *  onCancel     — called when the user clicks "Go Back"
 */
function ConfirmDialog({
  open,
  message,
  confirmLabel = "Yes, Proceed",
  confirmColor = "primary",
  onConfirm,
  onCancel,
}: {
  open:          boolean;
  message:       string;
  confirmLabel?: string;
  confirmColor?: "primary" | "danger" | "neutral";
  onConfirm:     () => void;
  onCancel:      () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel}>
      <ModalDialog variant="outlined" role="alertdialog" sx={{ maxWidth: 420 }}>

        {/* Title row with a warning icon for visual clarity */}
        <DialogTitle>
          <WarningRoundedIcon sx={{ mr: 1, color: "warning.400" }} />
          Confirm Action
        </DialogTitle>

        <Divider />

        {/* The actual question text passed by the parent */}
        <DialogContent sx={{ mt: 1 }}>
          <Typography level="body-md">{message}</Typography>
        </DialogContent>

        {/* Action buttons — "Go Back" is always on the left, confirm on right */}
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 2 }}>
          <Button variant="plain" color="neutral" onClick={onCancel}>
            Go Back
          </Button>
          <Button color={confirmColor} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Stack>

      </ModalDialog>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * InventoryItemDialog
 *
 * Props:
 *  open        — whether the modal is visible
 *  mode        — "create" shows "Add Product", "edit" shows "Save Changes"
 *  initial     — pre-populated DTO when editing an existing item; null for new
 *  onClose     — parent callback to close the dialog
 *  onSubmit    — async callback that receives the validated payload and sends
 *                it to the backend; errors it throws are shown in the form
 *  submitting  — set to true by the parent while the API call is in flight;
 *                disables the form to prevent double-submission
 */
export function InventoryItemDialog({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  open:       boolean;
  mode:       Mode;
  initial?:   Partial<InventoryItemDTO> | null;
  onClose:    () => void;
  onSubmit:   (payload: Omit<InventoryItemDTO, "Id">) => Promise<void>;
  submitting: boolean;
}) {
  // ── Local state ───────────────────────────────────────────────────────────

  /** The live values of every form field */
  const [values, setValues] = useState<FormValues>(() => toFormValues(initial));

  /** Field-level validation error messages; keyed by field name */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Error message returned by the backend API (shown as a banner) */
  const [apiError, setApiError] = useState<string | null>(null);

  /** Whether to show the "confirm submit" confirmation dialog */
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  /** Whether to show the "confirm cancel / discard" confirmation dialog */
  const [confirmCancel, setConfirmCancel] = useState(false);

  // ── Reset form on open ────────────────────────────────────────────────────
  /**
   * Every time the dialog opens (or the item being edited changes),
   * reset everything to a clean state so stale data from a previous
   * session never bleeds through.
   */
  React.useEffect(() => {
    if (open) {
      setValues(toFormValues(initial));
      setErrors({});
      setApiError(null);
      setConfirmSubmit(false);
      setConfirmCancel(false);
    }
  }, [open, initial]);

  // ── Generic field updater ─────────────────────────────────────────────────
  /**
   * setField()
   * Updates a single field value and simultaneously clears that field's
   * inline error so the red message disappears as soon as the user starts
   * correcting their input. This gives immediate, positive feedback.
   */
  function setField(key: keyof FormValues, raw: string) {
    setValues((prev) => ({ ...prev, [key]: raw }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // ── SKU keystroke filter + auto-dash formatter ────────────────────────────
  /**
   * handleSkuChange()
   * Processes every character the user types into the SKU field and
   * auto-inserts dashes at the correct positions so the user never has
   * to type them manually.
   *
   * Steps:
   *  1. Force the value to uppercase (SKUs are always uppercase).
   *  2. Strip any character that is NOT alphanumeric or a dash (dashes are
   *     kept here so we can detect whether the user is backspacing through
   *     an auto-inserted one).
   *  3. Remove ALL dashes to get just the raw alphanumeric segments.
   *  4. Re-assemble with dashes injected at the correct positions:
   *       - After the 4-char prefix  → "PROX-"
   *       - After the 3-letter block → "PROX-ABC-"
   *  5. Enforce the 32-character hard ceiling.
   *
   * Auto-dash behaviour:
   *  User types "PROX"    → field shows "PROX-"
   *  User types "PROXABC" → field shows "PROX-ABC-"
   *  User types "PROXABC0001" → field shows "PROX-ABC-0001"
   *
   * Backspace works naturally: removing the last real character also causes
   * the trailing auto-dash to disappear because the dash is only injected
   * when the preceding segment is full.
   */
  function handleSkuChange(raw: string) {
    const upper   = raw.toUpperCase();
    const cleaned = upper.replace(/[^A-Z0-9]/g, ""); // strip everything except letters & digits

    // Split the raw alphanumeric string into the three named segments:
    //   seg1 → up to 4 chars  ("PROX")
    //   seg2 → up to 3 chars  ("ABC")
    //   seg3 → up to 4 chars  ("0001")
    const seg1 = cleaned.slice(0, 4);
    const seg2 = cleaned.slice(4, 7);
    const seg3 = cleaned.slice(7, 11);

    // Re-assemble with dashes injected automatically:
    //   dash after seg1 only when seg1 is complete (4 chars)
    //   dash after seg2 only when seg2 is complete (3 chars)
    let formatted = seg1;
    if (seg1.length === 4) formatted += "-";
    if (seg2)              formatted += seg2;
    if (seg2.length === 3) formatted += "-";
    if (seg3)              formatted += seg3;

    const capped = formatted.slice(0, SKU_MAX_CHARS);
    setField("Sku", capped);
  }

  // ── Quantity keystroke filter ─────────────────────────────────────────────
  /**
   * handleQuantityChange()
   * Prevents the user from typing anything that isn't a digit.
   *
   * Why not just rely on type="number"?
   * Browsers allow "e", "+", "-", and "." in number inputs by default.
   * We strip them here so:
   *  - Alphabetic characters (a–z) are blocked entirely.
   *  - Negative sign (-) is blocked — quantity can never go below 0.
   *  - Decimal point (.) is blocked — quantity must be a whole number.
   *
   * The regex /[^0-9]/g removes everything that is NOT a digit 0–9.
   */
  function handleQuantityChange(raw: string) {
    const digitsOnly = raw.replace(/[^0-9]/g, ""); // keep only 0–9
    setField("Quantity", digitsOnly);
  }

  // ── Submit flow ───────────────────────────────────────────────────────────
  /**
   * handleAddClick()
   * Called when the user clicks "Add Product" or "Save Changes".
   * Runs full validation first. If any field fails, the errors are shown
   * inline and we stop. If everything is valid, we open the confirmation
   * dialog before actually sending anything to the backend.
   */
  function handleAddClick() {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setApiError(null);

    // Stop here and show inline errors — don't open confirm dialog yet
    if (Object.keys(nextErrors).length > 0) return;

    // All fields are valid — ask the user to confirm before submitting
    setConfirmSubmit(true);
  }

  /**
   * handleConfirmedSubmit()
   * Called after the user clicks "Yes" in the confirmation dialog.
   * Builds the final API payload and calls the parent's onSubmit callback.
   *
   * Note:
   *  - QR code value is auto-generated from the SKU in the background.
   *    The QR Code field was removed from the UI per product requirements.
   *  - ImageUrl is sent as null — the image URL field was also removed.
   *  - Status is computed from quantity, not chosen manually by the user.
   */
  async function handleConfirmedSubmit() {
    setConfirmSubmit(false);

    const sku         = values.Sku.trim();
    const productName = values.ProductName.trim();
    const quantity    = Number(values.Quantity);

    const payload: Omit<InventoryItemDTO, "Id"> = {
      ProductName: productName,
      Sku:         sku,
      Category:    values.Category.trim(),
      Location:    values.Location.trim(),
      Description: values.Description.trim() || null,

      // QR code is auto-generated in the background using the SKU.
      // Falls back to product name if SKU is somehow empty.
      QrCodeValue: sku || productName || null,

      // Image URL has been removed from the form — always null.
      ImageUrl: null,

      Quantity:  quantity,
      UnitPrice: Number(values.UnitPrice),

      // Status is always derived from quantity — never set manually.
      // This ensures perfect consistency with the backend's own logic.
      Status: computeStatus(quantity),
    };

    try {
      await onSubmit(payload);
      onClose(); // close the dialog on success
    } catch (e: unknown) {
      // Show backend errors as a banner at the top of the form
      setApiError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  /** Dialog title changes based on whether we are creating or editing */
  const title = mode === "create" ? "Add New Product" : "Edit Product";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          MAIN FORM DIALOG
      ════════════════════════════════════════════════════════════════════ */}
      <Modal open={open} onClose={() => setConfirmCancel(true)}>
        <ModalDialog size="lg" sx={{ width: { xs: "95vw", sm: 760 }, borderRadius: "lg" }}>

          {/* Header: title + subtitle hint */}
          <DialogTitle>
            <Stack spacing={0.5}>
              <Typography level="h3">{title}</Typography>
              <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                Text fields: max {MAX_CHARS_DEFAULT} chars · SKU format: PROX-XXX-0001 · Qty: 0–{QUANTITY_MAX.toLocaleString()}
              </Typography>
            </Stack>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>

              {/* ── API error banner ────────────────────────────────────── */}
              {/* Only visible when the backend returns an error after submit */}
              {apiError && (
                <Typography
                  level="body-sm"
                  color="danger"
                  sx={{ p: 1.5, borderRadius: "sm", bgcolor: "danger.softBg" }}
                >
                  ⚠ {apiError}
                </Typography>
              )}

              {/* ── Row 1: Product Name + SKU ────────────────────────────── */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>

                {/* Product Name — plain text, capped at MAX_CHARS_DEFAULT */}
                <FormControl error={Boolean(errors.ProductName)} sx={{ flex: 1 }}>
                  <FormLabel>Product Name</FormLabel>
                  <Input
                    value={values.ProductName}
                    onChange={(e) => setField("ProductName", e.target.value)}
                    placeholder="Enter product name"
                    // maxLength stops input at the hard limit — no typing past 50
                    slotProps={{ input: { maxLength: MAX_CHARS_DEFAULT } }}
                  />
                  {/* Show error OR live character counter, never both */}
                  {errors.ProductName
                    ? <FormHelperText>{errors.ProductName}</FormHelperText>
                    : <CharCounter value={values.ProductName} max={MAX_CHARS_DEFAULT} />
                  }
                </FormControl>

                {/* SKU — auto-formatted input, format PROX-XXX-0001 */}
                <FormControl error={Boolean(errors.Sku)} sx={{ flex: 1 }}>
                  <FormLabel>SKU</FormLabel>
                  <Input
                    value={values.Sku}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    placeholder="PROX-ABC-0001"
                  />
                  {errors.Sku
                    ? <FormHelperText>{errors.Sku}</FormHelperText>
                    : (
                      <FormHelperText>
                         Format: PROX-XXX-0001
                      </FormHelperText>
                    )
                  }
                </FormControl>

              </Stack>

              {/* ── Row 2: Category + Location ──────────────────────────── */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>

                {/* Category */}
                <FormControl error={Boolean(errors.Category)} sx={{ flex: 1 }}>
                  <FormLabel>Category</FormLabel>
                  <Input
                    value={values.Category}
                    onChange={(e) => setField("Category", e.target.value)}
                    placeholder="Electronics, Furniture…"
                    slotProps={{ input: { maxLength: MAX_CHARS_DEFAULT } }}
                  />
                  {errors.Category
                    ? <FormHelperText>{errors.Category}</FormHelperText>
                    : <CharCounter value={values.Category} max={MAX_CHARS_DEFAULT} />
                  }
                </FormControl>

                {/* Location */}
                <FormControl error={Boolean(errors.Location)} sx={{ flex: 1 }}>
                  <FormLabel>Location</FormLabel>
                  <Input
                    value={values.Location}
                    onChange={(e) => setField("Location", e.target.value)}
                    placeholder="Warehouse A – Shelf B3"
                    slotProps={{ input: { maxLength: MAX_CHARS_DEFAULT } }}
                  />
                  {errors.Location
                    ? <FormHelperText>{errors.Location}</FormHelperText>
                    : <CharCounter value={values.Location} max={MAX_CHARS_DEFAULT} />
                  }
                </FormControl>

              </Stack>

              {/* ── Row 3: Quantity + Unit Price ─────────────────────────── */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>

                {/* Quantity — digits only, 0 to 10,000 */}
                <FormControl error={Boolean(errors.Quantity)} sx={{ flex: 1 }}>
                  <FormLabel>Quantity</FormLabel>
                  <Input
                    // type="text" so we have full control over what characters
                    // are allowed. type="number" would still allow "e" and "-".
                    type="text"
                    inputMode="numeric"  // shows numeric keyboard on mobile
                    value={values.Quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="0"
                  />
                  {errors.Quantity
                    ? <FormHelperText>{errors.Quantity}</FormHelperText>
                    : <FormHelperText>
                      </FormHelperText>
                  }
                </FormControl>

                {/* Unit Price — decimals allowed, no negatives */}
                <FormControl error={Boolean(errors.UnitPrice)} sx={{ flex: 1 }}>
                  <FormLabel>Unit Price ($)</FormLabel>
                  <Input
                    type="number"
                    value={values.UnitPrice}
                    onChange={(e) => setField("UnitPrice", e.target.value)}
                    placeholder="0.00"
                    // min=0 prevents the browser spinner from going below zero
                    slotProps={{ input: { min: 0, step: "0.01" } }}
                  />
                  
                </FormControl>

              </Stack>

              {/* ── Stock Status (read-only preview) ─────────────────────── */}
              {/*
                Status is NOT a user-editable field.
                It is computed entirely from the quantity value the user enters,
                matching the backend's own computeStatus() logic.
                Showing it here as a live preview avoids confusion about what
                status will be saved.
              */}
              <FormControl>
                <FormLabel>Stock Status</FormLabel>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ height: 36 }}>
                  <StatusPreview quantity={values.Quantity} />
                  <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                    Automatically set by the system based on quantity
                  </Typography>
                </Stack>
              </FormControl>

              {/* ── Description (optional, 500 chars) ────────────────────── */}
              <FormControl error={Boolean(errors.Description)}>
                <FormLabel>
                  Description{" "}
                  <Typography level="body-xs" component="span" sx={{ color: "text.tertiary" }}>
                    (optional)
                  </Typography>
                </FormLabel>
                <Input
                  value={values.Description}
                  onChange={(e) => setField("Description", e.target.value)}
                  placeholder="Optional product description"
                  // 500-char limit for description — more generous than other fields
                  slotProps={{ input: { maxLength: MAX_CHARS_DESCRIPTION } }}
                />
                {errors.Description
                  ? <FormHelperText>{errors.Description}</FormHelperText>
                  : <CharCounter value={values.Description} max={MAX_CHARS_DESCRIPTION} />
                }
              </FormControl>

              {/* ── Action buttons ────────────────────────────────────────── */}
              {/*
                Cancel → opens the "discard changes?" confirmation dialog.
                Submit → runs validation, then opens the "confirm submit" dialog.
                Both actions require an explicit "yes" from the user before
                anything irreversible happens.
              */}
              <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={() => setConfirmCancel(true)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddClick} loading={submitting}>
                  {mode === "create" ? "Add Product" : "Save Changes"}
                </Button>
              </Stack>

            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          CONFIRM SUBMIT DIALOG
          Shown after the user clicks "Add Product" or "Save Changes" and
          all validation has passed. The user must explicitly confirm before
          the API call is made.
      ════════════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={confirmSubmit}
        message={
          mode === "create"
            ? "Are you sure you want to add this product to the inventory?"
            : "Are you sure you want to save the changes made to this product?"
        }
        confirmLabel={mode === "create" ? "Yes, Add Product" : "Yes, Save Changes"}
        confirmColor="primary"
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />

      {/* ════════════════════════════════════════════════════════════════════
          CONFIRM CANCEL DIALOG
          Shown when the user clicks "Cancel" or closes the dialog.
          Prevents accidental loss of work.
      ════════════════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={confirmCancel}
        message="Are you sure you want to cancel? Any unsaved changes will be lost."
        confirmLabel="Yes, Discard Changes"
        confirmColor="danger"
        onConfirm={() => { setConfirmCancel(false); onClose(); }}
        onCancel={() => setConfirmCancel(false)}
      />
    </>
  );
}