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
  ShieldCheck,
  Strikethrough,
  Underline,
  Undo2,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import type { SyllabusStatus } from "@/types/syllabus.types";
import { MarginRuler } from "@/components/syllabus/margin-ruler";
import {
  DEFAULT_MARGINS,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type Margins,
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

export default function RichTextEditor() {
  const [pageIds, setPageIds] = React.useState<string[]>(() => [newPageId()]);
  const [formats, setFormats] = React.useState<ActiveFormats>(EMPTY_FORMATS);
  const [margins, setMargins] = React.useState<Margins>(DEFAULT_MARGINS);
  const lastEditorRef = React.useRef<HTMLDivElement | null>(null);
  const editorsRef = React.useRef<Map<string, HTMLDivElement>>(new Map());

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

  // Re-run pagination after the page list changes (e.g. a page was just added)
  // or the margins change (resizing the writable area reflows content) so
  // multi-page spills converge over successive renders.
  React.useLayoutEffect(() => {
    paginate();
  }, [paginate, margins]);

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
    document.addEventListener("selectionchange", refreshFormats);
    return () =>
      document.removeEventListener("selectionchange", refreshFormats);
  }, [refreshFormats]);

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

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            aria-label="Print"
            title="Print syllabus"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => window.print()}
          >
            <Printer />
            Print
          </Button>
        </div>

        {/* Horizontal ruler, pinned directly beneath the toolbar. */}
        <div className="flex justify-center bg-muted px-6 pt-2">
          <MarginRuler
            orientation="horizontal"
            length={PAGE_WIDTH}
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
          length={PAGE_HEIGHT}
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
  registerEditor,
  lastEditorRef,
  onInput,
}: {
  id: string;
  index: number;
  margins: Margins;
  registerEditor: (id: string, el: HTMLDivElement | null) => void;
  lastEditorRef: React.RefObject<HTMLDivElement | null>;
  onInput: () => void;
}) {
  return (
    <div
      data-print-page
      className="relative flex h-letter w-letter flex-col overflow-hidden bg-white shadow-xl ring-1 ring-black/5"
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
