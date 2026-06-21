/* -------------------------------------------------------------------------- */
/* Page geometry & margins                                                    */
/* -------------------------------------------------------------------------- */

// Letter paper at 96 PPI — keep in sync with --width-letter / --height-letter.
export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;

/* -------------------------------------------------------------------------- */
/* Paper sizes                                                                */
/* -------------------------------------------------------------------------- */

export type PaperSize = "letter" | "legal" | "a4" | "a3";

// On-screen dimensions are px at 96 PPI (kept in sync with the --width-*/
// --height-* CSS vars). `print` is the physical @page size used when printing.
export const PAPER_SIZES: Record<
  PaperSize,
  { label: string; width: number; height: number; print: string }
> = {
  letter: { label: 'Letter · 8.5" × 11"', width: 816, height: 1056, print: "8.5in 11in" },
  legal: { label: 'Legal · 8.5" × 14"', width: 816, height: 1344, print: "8.5in 14in" },
  a4: { label: "A4 · 210 × 297 mm", width: 794, height: 1123, print: "210mm 297mm" },
  a3: { label: "A3 · 297 × 420 mm", width: 1123, height: 1587, print: "297mm 420mm" },
};

export const DEFAULT_PAPER_SIZE: PaperSize = "letter";

export const PPI = 96; // CSS px per inch
export const TICK = PPI / 4; // minor ruler tick every quarter inch
export const MIN_CONTENT = 144; // never let margins squeeze below 1.5in of writing space

export type Margins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

// Defaults sit on ruler tick lines: 1in left/right, 0.75in top/bottom.
export const DEFAULT_MARGINS: Margins = {
  top: 72,
  right: 96,
  bottom: 72,
  left: 96,
};

export const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);
