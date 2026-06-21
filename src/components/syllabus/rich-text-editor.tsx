import * as React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarClock,
  CalendarDays,
  Clock,
  Baseline,
  Heading1,
  Heading2,
  Heading3,
  Info,
  Italic,
  List,
  ListOrdered,
  MessagesSquare,
  Printer,
  Redo2,
  Save,
  ShieldCheck,
  Strikethrough,
  Type,
  Underline,
  Undo2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import type {
  SyllabusDocument,
  SyllabusFormatting,
  SyllabusPageContent,
  SyllabusStatus,
} from "@/types/syllabus.types";
import { MarginRuler } from "@/components/syllabus/margin-ruler";
import {
  DEFAULT_MARGINS,
  DEFAULT_PAPER_SIZE,
  PAPER_SIZES,
  type Margins,
  type PaperSize,
} from "@/components/syllabus/page-geometry";

type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
  block: string;
};

const EMPTY_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  justifyFull: false,
  block: "p",
};

// Web-safe families that render consistently across browsers/OSes without any
// web-font loading. `value` is the full stack passed to execCommand("fontName").
const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Sans Serif", value: "Helvetica, Arial, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Garamond", value: 'Garamond, "Times New Roman", serif' },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Comic Sans MS", value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: "Impact", value: "Impact, Charcoal, sans-serif" },
];

const LINE_HEIGHTS: { label: string; value: string }[] = [
  { label: "Single", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "Double", value: "2" },
  { label: "2.5", value: "2.5" },
  { label: "3", value: "3" },
];

let pageCounter = 0;
const newPageId = () => `page-${++pageCounter}`;

const isEditor = (el: Element | null): el is HTMLElement =>
  !!el && (el as HTMLElement).getAttribute?.("contenteditable") === "true";

/* -------------------------------------------------------------------------- */
/* Pagination helpers                                                         */
/* -------------------------------------------------------------------------- */

// A page editor overflows when its content is taller than its (fixed) box.
// The 1px slack avoids thrashing on sub-pixel rounding.
const isOverflowing = (el: HTMLElement) =>
  el.scrollHeight - el.clientHeight > 1;

// A page is empty when it has no block elements and no visible text.
const isEmptyEditor = (el: HTMLElement) =>
  el.childElementCount === 0 && (el.textContent ?? "").trim() === "";

const editorOf = (node: Node | null): HTMLElement | null => {
  const el = node?.nodeType === 1 ? (node as Element) : node?.parentElement;
  const editor = el?.closest<HTMLElement>('[contenteditable="true"]');
  return editor && editor.isContentEditable ? editor : null;
};

type CaretMarkers = { start: HTMLElement; end: HTMLElement } | null;

// Drop invisible marker elements at the current selection boundaries so the
// caret/selection can be restored after blocks are shuffled between pages.
function placeCaretMarkers(): CaretMarkers {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!editorOf(range.startContainer)) return null;

  const start = document.createElement("span");
  start.setAttribute("data-caret-start", "");
  const end = document.createElement("span");
  end.setAttribute("data-caret-end", "");

  // Insert the end boundary first so placing the start marker doesn't shift it.
  const endRange = range.cloneRange();
  endRange.collapse(false);
  endRange.insertNode(end);
  const startRange = range.cloneRange();
  startRange.collapse(true);
  startRange.insertNode(start);

  return { start, end };
}

function restoreCaretMarkers(markers: CaretMarkers) {
  if (!markers) return;
  const { start, end } = markers;
  const sel = window.getSelection();
  const editor = editorOf(start);

  if (sel && start.parentNode && end.parentNode) {
    // Focus first; setting the range afterwards keeps it authoritative.
    editor?.focus({ preventScroll: true });
    const range = document.createRange();
    range.setStartAfter(start);
    range.setEndBefore(end);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Remove the later marker first; the live selection clamps to the same spot.
  end.remove();
  start.remove();
}

// Walk every page's DOM and record which formatting is actually in use:
// distinct font families / sizes / line heights / alignments / headings, plus
// presence flags for the inline marks. execCommand emits both styled spans
// (style.*) and legacy <font face/size> attributes, so we check both.
function collectFormatting(editors: HTMLElement[]): SyllabusFormatting {
  const fontFamilies = new Set<string>();
  const fontSizes = new Set<string>();
  const lineHeights = new Set<string>();
  const alignments = new Set<string>();
  const headings = new Set<string>();
  const flags = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    unorderedList: false,
    orderedList: false,
    links: false,
  };

  for (const editor of editors) {
    editor.querySelectorAll<HTMLElement>("*").forEach((node) => {
      const ff = node.style.fontFamily || node.getAttribute("face");
      if (ff) fontFamilies.add(ff);
      const fs = node.style.fontSize || node.getAttribute("size");
      if (fs) fontSizes.add(fs);
      if (node.style.lineHeight) lineHeights.add(node.style.lineHeight);
      if (node.style.textAlign) alignments.add(node.style.textAlign);

      switch (node.tagName.toLowerCase()) {
        case "h1":
        case "h2":
        case "h3":
          headings.add(node.tagName.toLowerCase());
          break;
        case "b":
        case "strong":
          flags.bold = true;
          break;
        case "i":
        case "em":
          flags.italic = true;
          break;
        case "u":
          flags.underline = true;
          break;
        case "s":
        case "strike":
        case "del":
          flags.strikethrough = true;
          break;
        case "ul":
          flags.unorderedList = true;
          break;
        case "ol":
          flags.orderedList = true;
          break;
        case "a":
          flags.links = true;
          break;
      }

      if (node.style.fontWeight === "bold" || +node.style.fontWeight >= 600)
        flags.bold = true;
      if (node.style.fontStyle === "italic") flags.italic = true;
      const deco = node.style.textDecorationLine || node.style.textDecoration;
      if (deco.includes("underline")) flags.underline = true;
      if (deco.includes("line-through")) flags.strikethrough = true;
    });
  }

  return {
    fontFamilies: [...fontFamilies],
    fontSizes: [...fontSizes],
    lineHeights: [...lineHeights],
    alignments: [...alignments],
    headings: [...headings],
    ...flags,
  };
}

export default function RichTextEditor() {
  const [pageIds, setPageIds] = React.useState<string[]>(() => [newPageId()]);
  const [formats, setFormats] = React.useState<ActiveFormats>(EMPTY_FORMATS);
  const [margins, setMargins] = React.useState<Margins>(DEFAULT_MARGINS);
  const [paperSize, setPaperSize] = React.useState<PaperSize>(DEFAULT_PAPER_SIZE);
  const lastEditorRef = React.useRef<HTMLDivElement | null>(null);
  const editorsRef = React.useRef<Map<string, HTMLDivElement>>(new Map());
  // The most recent selection that lived inside an editor. Opening a dropdown
  // (font, line height) moves focus out and collapses the live selection, so we
  // stash it here and restore it before applying the command.
  const savedRangeRef = React.useRef<Range | null>(null);

  const paper = PAPER_SIZES[paperSize];

  const registerEditor = React.useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) editorsRef.current.set(id, el);
      else editorsRef.current.delete(id);
    },
    []
  );

  // Reflow content so each page holds exactly what fits, spilling overflow onto
  // the next page (adding one when needed) and pulling content back up when a
  // page has room. Runs on every edit and after pages are added/removed.
  const paginate = React.useCallback(() => {
    const editors = pageIds
      .map((id) => editorsRef.current.get(id))
      .filter((el): el is HTMLDivElement => !!el);
    if (editors.length === 0) return;

    // Fast path: a single page that still has room needs no reflow, so skip the
    // caret-marker churn entirely (the common case while writing page one).
    if (editors.length === 1 && !isOverflowing(editors[0])) return;

    const markers = placeCaretMarkers();
    let needPage = false;

    // Push overflow down: move trailing blocks onto the following page.
    pushDown: for (let i = 0; i < editors.length; i++) {
      const cur = editors[i];
      let guard = 0;
      while (isOverflowing(cur) && cur.childElementCount > 1) {
        const next = editors[i + 1];
        if (!next) {
          needPage = true;
          break pushDown;
        }
        next.insertBefore(cur.lastElementChild!, next.firstChild);
        if (++guard > 1000) break;
      }
    }

    // Pull up: backfill each page with leading blocks from the next one, as
    // long as they still fit. Skipped while we're waiting on a new page.
    if (!needPage) {
      for (let i = 0; i < editors.length - 1; i++) {
        const cur = editors[i];
        const next = editors[i + 1];
        let guard = 0;
        while (next.firstElementChild) {
          cur.appendChild(next.firstElementChild);
          if (isOverflowing(cur)) {
            // Didn't fit — put it back and stop filling this page.
            next.insertBefore(cur.lastElementChild!, next.firstChild);
            break;
          }
          if (++guard > 1000) break;
        }
      }
    }

    restoreCaretMarkers(markers);

    if (needPage) {
      setPageIds((ids) => [...ids, newPageId()]);
      return;
    }

    // Drop trailing empty pages (always keep at least one).
    let lastNonEmpty = editors.length - 1;
    while (lastNonEmpty > 0 && isEmptyEditor(editors[lastNonEmpty]))
      lastNonEmpty--;
    const keep = lastNonEmpty + 1;
    if (keep < pageIds.length) setPageIds((ids) => ids.slice(0, keep));
  }, [pageIds]);

  // Re-run pagination after the page list changes (e.g. a page was just added),
  // the margins change, or the paper size changes — each resizes the writable
  // area and reflows content, so multi-page spills converge over renders.
  React.useLayoutEffect(() => {
    paginate();
  }, [paginate, margins, paper.width, paper.height]);

  // Match the printed @page box to the selected paper size so the browser's
  // print preview paginates against the same dimensions shown on screen.
  React.useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-paper-size", "");
    style.textContent = `@media print { @page { size: ${paper.print}; margin: 0; } }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [paper.print]);

  // Merge a partial margin update, rounding to whole pixels to avoid jitter.
  const updateMargins = React.useCallback((patch: Partial<Margins>) => {
    setMargins((m) => ({
      ...m,
      ...(patch.top !== undefined && { top: Math.round(patch.top) }),
      ...(patch.right !== undefined && { right: Math.round(patch.right) }),
      ...(patch.bottom !== undefined && { bottom: Math.round(patch.bottom) }),
      ...(patch.left !== undefined && { left: Math.round(patch.left) }),
    }));
  }, []);

  // Keep block structure predictable so we can move whole blocks between pages.
  React.useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      /* not supported — non-fatal */
    }
  }, []);

  const refreshFormats = React.useCallback(() => {
    if (!isEditor(document.activeElement)) return;
    const block = (
      document.queryCommandValue("formatBlock") || "p"
    ).toLowerCase();
    setFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
      block: block || "p",
    });
  }, []);

  React.useEffect(() => {
    const onSelectionChange = () => {
      // Remember the caret/selection while it's still inside an editor so a
      // dropdown can restore it after focus moves to the popup.
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorOf(range.startContainer)) {
          savedRangeRef.current = range.cloneRange();
        }
      }
      refreshFormats();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [refreshFormats]);

  // Re-focus the editor and reinstate the stashed selection. Used by controls
  // that steal focus (the font / line-height dropdowns) before they run a
  // command, so the command lands on the text the user had selected.
  const restoreSelection = React.useCallback(() => {
    const range = savedRangeRef.current;
    const editor = range && editorOf(range.startContainer);
    if (!range || !editor) return false;
    editor.focus({ preventScroll: true });
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return true;
  }, []);

  const applyFontFamily = React.useCallback(
    (value: string) => {
      if (!restoreSelection()) return;
      document.execCommand("fontName", false, value);
      refreshFormats();
      paginate();
    },
    [restoreSelection, refreshFormats, paginate]
  );

  // There's no execCommand for line height, so style the block elements the
  // selection touches directly. Top-level blocks cascade to nested content
  // (list items, etc.), which is what we want.
  const applyLineHeight = React.useCallback(
    (value: string) => {
      if (!restoreSelection()) return;
      const range = savedRangeRef.current;
      const editor = range && editorOf(range.startContainer);
      if (!range || !editor) return;

      const blocks = Array.from(editor.children).filter(
        (el): el is HTMLElement =>
          el instanceof HTMLElement && range.intersectsNode(el)
      );
      if (blocks.length === 0) {
        // No wrapping block (e.g. bare first line) — fall back to the page.
        editor.style.lineHeight = value;
      } else {
        blocks.forEach((block) => (block.style.lineHeight = value));
      }
      paginate();
    },
    [restoreSelection, paginate]
  );

  const exec = React.useCallback(
    (command: string, value?: string) => {
      // Keep edits flowing into the editor the user last worked in, even if
      // focus briefly slipped to the toolbar.
      if (!isEditor(document.activeElement)) lastEditorRef.current?.focus();
      document.execCommand(command, false, value);
      refreshFormats();
    },
    [refreshFormats]
  );

  const toggleHeading = (tag: "h1" | "h2" | "h3") =>
    exec("formatBlock", formats.block === tag ? "p" : tag);

  const handleInput = React.useCallback(() => {
    refreshFormats();
    paginate();
  }, [refreshFormats, paginate]);

  // Gather the full document — geometry, every formatting option in use, the
  // page count, and the content of each page — into a single serialisable
  // object, persist it, and confirm with a snackbar.
  const handleSave = React.useCallback(() => {
    const editors = pageIds
      .map((id) => editorsRef.current.get(id))
      .filter((el): el is HTMLDivElement => !!el);

    const pages: SyllabusPageContent[] = editors.map((el, i) => ({
      index: i + 1,
      html: el.innerHTML,
      text: (el.textContent ?? "").trim(),
    }));

    const doc: SyllabusDocument = {
      savedAt: new Date().toISOString(),
      paper: {
        size: paperSize,
        label: paper.label,
        width: paper.width,
        height: paper.height,
        print: paper.print,
      },
      margins,
      pageCount: pages.length,
      pages,
      formatting: collectFormatting(editors),
    };

    try {
      localStorage.setItem("syllabus-document", JSON.stringify(doc));
      // Surface the captured object for inspection while the backend is wired up.
      console.log("Saved syllabus document:", doc);
      toast("Syllabus saved successfully", 
        // {
        // description: `${doc.pageCount} page${
        //   doc.pageCount === 1 ? "" : "s"
        // } saved successfully.`,
      // }
    );
    } catch (error) {
      console.error("Failed to save syllabus document:", error);
      toast.error("Couldn't save syllabus", {
        description: "Something went wrong while saving. Please try again.",
      });
    }
  }, [pageIds, paperSize, paper, margins]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-muted">
      <div className="sticky top-0 z-20 print:hidden">
        <div
          data-print-toolbar
          className="flex flex-wrap items-center gap-0.5 border-b bg-background/80 px-4 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70"
        >
          <ToolbarButton label="Undo" onClick={() => exec("undo")}>
            <Undo2 />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => exec("redo")}>
            <Redo2 />
          </ToolbarButton>

          <ToolbarDivider />

          <Select onValueChange={applyFontFamily}>
            <SelectTrigger
              size="sm"
              aria-label="Font family"
              title="Font family"
              className="w-36"
            >
              <Type className="size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem
                  key={font.label}
                  value={font.value}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToolbarDivider />

          <ToolbarToggle
            label="Heading 1"
            pressed={formats.block === "h1"}
            onPressedChange={() => toggleHeading("h1")}
          >
            <Heading1 />
          </ToolbarToggle>
          <ToolbarToggle
            label="Heading 2"
            pressed={formats.block === "h2"}
            onPressedChange={() => toggleHeading("h2")}
          >
            <Heading2 />
          </ToolbarToggle>
          <ToolbarToggle
            label="Heading 3"
            pressed={formats.block === "h3"}
            onPressedChange={() => toggleHeading("h3")}
          >
            <Heading3 />
          </ToolbarToggle>

          <ToolbarDivider />

          <ToolbarToggle
            label="Bold"
            pressed={formats.bold}
            onPressedChange={() => exec("bold")}
          >
            <Bold />
          </ToolbarToggle>
          <ToolbarToggle
            label="Italic"
            pressed={formats.italic}
            onPressedChange={() => exec("italic")}
          >
            <Italic />
          </ToolbarToggle>
          <ToolbarToggle
            label="Underline"
            pressed={formats.underline}
            onPressedChange={() => exec("underline")}
          >
            <Underline />
          </ToolbarToggle>
          <ToolbarToggle
            label="Strikethrough"
            pressed={formats.strikeThrough}
            onPressedChange={() => exec("strikeThrough")}
          >
            <Strikethrough />
          </ToolbarToggle>

          <ToolbarDivider />

          <ToolbarToggle
            label="Bulleted list"
            pressed={formats.insertUnorderedList}
            onPressedChange={() => exec("insertUnorderedList")}
          >
            <List />
          </ToolbarToggle>
          <ToolbarToggle
            label="Numbered list"
            pressed={formats.insertOrderedList}
            onPressedChange={() => exec("insertOrderedList")}
          >
            <ListOrdered />
          </ToolbarToggle>

          <ToolbarDivider />

          <ToolbarToggle
            label="Align left"
            pressed={formats.justifyLeft}
            onPressedChange={() => exec("justifyLeft")}
          >
            <AlignLeft />
          </ToolbarToggle>
          <ToolbarToggle
            label="Align center"
            pressed={formats.justifyCenter}
            onPressedChange={() => exec("justifyCenter")}
          >
            <AlignCenter />
          </ToolbarToggle>
          <ToolbarToggle
            label="Align right"
            pressed={formats.justifyRight}
            onPressedChange={() => exec("justifyRight")}
          >
            <AlignRight />
          </ToolbarToggle>
          <ToolbarToggle
            label="Justify"
            pressed={formats.justifyFull}
            onPressedChange={() => exec("justifyFull")}
          >
            <AlignJustify />
          </ToolbarToggle>

          <ToolbarDivider />

          <Select onValueChange={applyLineHeight}>
            <SelectTrigger
              size="sm"
              aria-label="Line height"
              title="Line spacing"
              className="w-28"
            >
              <Baseline className="size-3.5 text-muted-foreground" />
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent>
              {LINE_HEIGHTS.map((lh) => (
                <SelectItem key={lh.value} value={lh.value}>
                  {lh.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={paperSize}
            onValueChange={(value) => setPaperSize(value as PaperSize)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Paper size"
              title="Paper size"
              className="ml-auto w-44"
            >
              <SelectValue placeholder="Paper size" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PAPER_SIZES) as PaperSize[]).map((size) => (
                <SelectItem key={size} value={size}>
                  {PAPER_SIZES[size].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Print"
            title="Print syllabus"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => window.print()}
          >
            <Printer />
            Print
          </Button>

          <Button
            type="button"
            size="sm"
            aria-label="Save"
            title="Save syllabus"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSave}
          >
            <Save />
            Save
          </Button>
        </div>

        {/* Horizontal ruler, pinned directly beneath the toolbar. */}
        <div className="flex justify-center bg-muted px-6 pt-2">
          <MarginRuler
            orientation="horizontal"
            length={paper.width}
            start={margins.left}
            end={margins.right}
            startLabel="Left margin"
            endLabel="Right margin"
            onChange={(n) =>
              updateMargins({
                ...(n.start !== undefined && { left: n.start }),
                ...(n.end !== undefined && { right: n.end }),
              })
            }
          />
        </div>
      </div>

      <div className="relative flex flex-1 items-start justify-center gap-6 px-6 py-10">
        {/* Vertical ruler pinned to the far-left edge of the editing area. */}
        <MarginRuler
          orientation="vertical"
          length={paper.height}
          start={margins.top}
          end={margins.bottom}
          startLabel="Top margin"
          endLabel="Bottom margin"
          className="absolute top-10 left-2"
          onChange={(n) =>
            updateMargins({
              ...(n.start !== undefined && { top: n.start }),
              ...(n.end !== undefined && { bottom: n.end }),
            })
          }
        />

        <CommentsPanel />

        <div
          id="syllabus-print-root"
          data-print-root
          className="flex flex-col items-center gap-6"
        >
          {pageIds.map((id, i) => (
            <Page
              key={id}
              id={id}
              index={i}
              margins={margins}
              width={paper.width}
              height={paper.height}
              registerEditor={registerEditor}
              lastEditorRef={lastEditorRef}
              onInput={handleInput}
            />
          ))}
        </div>

        <SyllabusInfoPanel />
      </div>
    </div>
  );
}

function ToolbarDivider() {
  return (
    <Separator
      orientation="vertical"
      className="mx-1 data-[orientation=vertical]:h-5"
    />
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      // Prevent the toolbar from stealing focus / collapsing the selection.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ToolbarToggle({
  label,
  pressed,
  onPressedChange,
  children,
}: {
  label: string;
  pressed: boolean;
  onPressedChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <Toggle
      aria-label={label}
      title={label}
      className="size-7 px-0"
      pressed={pressed}
      onPressedChange={onPressedChange}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </Toggle>
  );
}

function Page({
  id,
  index,
  margins,
  width,
  height,
  registerEditor,
  lastEditorRef,
  onInput,
}: {
  id: string;
  index: number;
  margins: Margins;
  width: number;
  height: number;
  registerEditor: (id: string, el: HTMLDivElement | null) => void;
  lastEditorRef: React.RefObject<HTMLDivElement | null>;
  onInput: () => void;
}) {
  return (
    <div
      data-print-page
      style={{ width, height }}
      className="relative flex flex-col overflow-hidden bg-white shadow-xl ring-1 ring-black/5"
    >
      <div
        ref={(el) => registerEditor(id, el)}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        role="textbox"
        aria-multiline="true"
        aria-label={`Page ${index + 1}`}
        data-placeholder={
          index === 0 ? "Start writing your syllabus…" : "Continue writing…"
        }
        onFocus={(e) => {
          lastEditorRef.current = e.currentTarget;
        }}
        onInput={onInput}
        style={{
          paddingTop: margins.top,
          paddingRight: margins.right,
          paddingBottom: margins.bottom,
          paddingLeft: margins.left,
        }}
        className={cn(
          "min-h-0 w-full flex-1 overflow-hidden text-sm leading-relaxed text-neutral-900 outline-none",
          "[&:empty]:before:text-neutral-400 [&:empty]:before:content-[attr(data-placeholder)]",
          "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-bold",
          "[&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-semibold",
          "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-xl [&_h3]:font-semibold",
          "[&_p]:my-2",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_a]:text-primary [&_a]:underline"
        )}
      />
      <span className="pointer-events-none absolute right-4 bottom-3 text-[0.625rem] font-medium text-neutral-400 select-none print:hidden">
        Page {index + 1}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Side panels                                                                */
/* -------------------------------------------------------------------------- */

// Dummy data — replace with real syllabus + comment data once the backend is
// wired up. This is here purely to visualize the panel layout.
const SYLLABUS_INFO = {
  title: "Introduction to Software Engineering",
  courseCode: "CS 401",
  schoolYear: { start: 2024, end: 2025 },
  status: "pending" as SyllabusStatus,
  author: { name: "Dr. Elena Reyes", initials: "ER" },
  coAuthors: [
    { name: "Prof. Marcus Lee", initials: "ML" },
    { name: "Dr. Aisha Khan", initials: "AK" },
  ],
  createdAt: "May 12, 2026",
  lastModifiedAt: "Jun 18, 2026",
  deadline: "Jun 30, 2026",
  reviewers: ["Prof. Daniel Cruz", "Dr. Sophia Tan"],
  approvers: ["Dean Robert Santos"],
};

type Comment = {
  id: string;
  name: string;
  initials: string;
  role: "Reviewer" | "Approver";
  timestamp: string;
  body: string;
};

const COMMENTS: Comment[] = [
  {
    id: "c1",
    name: "Prof. Daniel Cruz",
    initials: "DC",
    role: "Reviewer",
    timestamp: "Jun 17, 2026 · 2:41 PM",
    body: "The learning outcomes in section 2 are clear, but please align them with the program-level outcomes before final submission.",
  },
  {
    id: "c2",
    name: "Dr. Sophia Tan",
    initials: "ST",
    role: "Reviewer",
    timestamp: "Jun 18, 2026 · 9:05 AM",
    body: "Grading breakdown adds up to 105%. Double-check the weight on the midterm exam.",
  },
  {
    id: "c3",
    name: "Dean Robert Santos",
    initials: "RS",
    role: "Approver",
    timestamp: "Jun 18, 2026 · 4:20 PM",
    body: "Looks solid overall. Holding approval until the reviewer comments above are addressed.",
  },
];

const STATUS_BADGE: Record<
  SyllabusStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
};

function SidePanel({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "sticky top-20 hidden w-72 shrink-0 self-start xl:block print:hidden",
        className
      )}
      {...props}
    />
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <div className="text-xs text-foreground">{children}</div>
      </div>
    </div>
  );
}

function SyllabusInfoPanel() {
  const info = SYLLABUS_INFO;
  const status = STATUS_BADGE[info.status];

  return (
    <SidePanel>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-muted-foreground" />
            Proposal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <div className="flex flex-col gap-1 pb-1">
            <span className="text-sm font-semibold text-foreground">
              {info.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {info.courseCode}
            </span>
          </div>

          <Separator className="my-1" />

          <InfoRow icon={CalendarDays} label="School Year">
            {info.schoolYear.start} – {info.schoolYear.end}
          </InfoRow>

          <InfoRow icon={Info} label="Status">
            <Badge variant={status.variant}>{status.label}</Badge>
          </InfoRow>

          <InfoRow icon={Users} label="Author">
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <AvatarFallback>{info.author.initials}</AvatarFallback>
              </Avatar>
              <span>{info.author.name}</span>
            </div>
          </InfoRow>

          <InfoRow icon={Users} label="Co-Authors">
            <AvatarGroup data-size="sm">
              {info.coAuthors.map((person) => (
                <Avatar key={person.name} size="sm" title={person.name}>
                  <AvatarFallback>{person.initials}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
          </InfoRow>

          <Separator className="my-1" />

          <InfoRow icon={Clock} label="Created">
            {info.createdAt}
          </InfoRow>

          <InfoRow icon={Clock} label="Last Modified">
            {info.lastModifiedAt}
          </InfoRow>

          <InfoRow icon={CalendarClock} label="Deadline">
            {info.deadline}
          </InfoRow>

          <Separator className="my-1" />

          <InfoRow icon={ShieldCheck} label="Reviewers">
            <ul className="flex flex-col gap-0.5">
              {info.reviewers.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </InfoRow>

          <InfoRow icon={ShieldCheck} label="Approvers">
            <ul className="flex flex-col gap-0.5">
              {info.approvers.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </InfoRow>
        </CardContent>
      </Card>
    </SidePanel>
  );
}

function CommentsPanel() {
  return (
    <SidePanel>
      <Card className="max-h-[calc(100vh-7rem)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessagesSquare className="size-4 text-muted-foreground" />
            Comments
            <Badge variant="secondary" className="ml-auto">
              {COMMENTS.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 overflow-y-auto">
          {COMMENTS.map((comment) => (
            <div key={comment.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback>{comment.initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium text-foreground">
                    {comment.name}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground">
                    {comment.timestamp}
                  </span>
                </div>
                <Badge
                  variant={comment.role === "Approver" ? "default" : "outline"}
                  className="ml-auto"
                >
                  {comment.role}
                </Badge>
              </div>
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs leading-relaxed text-foreground">
                {comment.body}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </SidePanel>
  );
}
