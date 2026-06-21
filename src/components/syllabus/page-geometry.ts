/* -------------------------------------------------------------------------- */
/* Page geometry & margins                                                    */
/* -------------------------------------------------------------------------- */

// Letter paper at 96 PPI — keep in sync with --width-letter / --height-letter.
export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;

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
