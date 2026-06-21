import type { Margins, PaperSize } from "@/components/syllabus/page-geometry";

export type Syllabus = {
  id: string;
};

/* -------------------------------------------------------------------------- */
/* Saved document snapshot                                                    */
/* -------------------------------------------------------------------------- */

// A full, self-contained snapshot of an edited syllabus: its page geometry,
// every formatting option in use, the page count, and the content of each page.
// Produced by the editor's Save action so the document can be persisted and
// later restored exactly as authored.
export type SyllabusDocument = {
  // ISO timestamp of when this snapshot was captured.
  savedAt: string;
  // Page geometry the document was laid out against.
  paper: SyllabusPaper;
  margins: Margins;
  // How many pages the content currently flows onto.
  pageCount: number;
  // The content of every page, in order.
  pages: SyllabusPageContent[];
  // Every distinct formatting value/mark detected across the content.
  formatting: SyllabusFormatting;
};

export type SyllabusPaper = {
  size: PaperSize;
  label: string;
  // On-screen dimensions in px at 96 PPI.
  width: number;
  height: number;
  // Physical @page size used when printing (e.g. "8.5in 11in").
  print: string;
};

export type SyllabusPageContent = {
  // 1-based page number.
  index: number;
  // The page's rich HTML, carrying all inline formatting.
  html: string;
  // Plain-text fallback of the same content.
  text: string;
};

// Aggregated record of which formatting the document actually uses. Distinct
// values (font families, sizes, line heights, alignments) are de-duplicated;
// inline marks and block types are simple presence flags / lists.
export type SyllabusFormatting = {
  fontFamilies: string[];
  fontSizes: string[];
  lineHeights: string[];
  alignments: string[];
  headings: string[];
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  links: boolean;
};

export type SyllabusPrototype = {
  uid: string;
  createdAt: string;
  lastModifiedAt: string;
  author: string;
  coAuthors: string[];
  metaData: SyllabusMetaData;
  status: SyllabusStatus;
  approvers: string[];
  approveDate: string;
  reviewers: string[];
  deadline: string;
  schoolYear: SyllabusSchoolYear;
};

export type SyllabusMetaData = {};

export type SyllabusStatus = "pending" | "approved" | "overdue";

export type SyllabusSchoolYear = {
  start: number;
  end: number;
};
