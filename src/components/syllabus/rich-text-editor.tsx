import * as React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Plus,
  Printer,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

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

export default function RichTextEditor() {
  const [pageIds, setPageIds] = React.useState<string[]>(() => [newPageId()]);
  const [formats, setFormats] = React.useState<ActiveFormats>(EMPTY_FORMATS);
  const lastEditorRef = React.useRef<HTMLDivElement | null>(null);

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

  const addPage = () => setPageIds((ids) => [...ids, newPageId()]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-muted">
      <div
        data-print-toolbar
        className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b bg-background/80 px-4 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70 print:hidden"
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

      <div
        id="syllabus-print-root"
        data-print-root
        className="flex flex-col items-center gap-6 px-6 py-10"
      >
        {pageIds.map((id, i) => (
          <Page
            key={id}
            index={i}
            lastEditorRef={lastEditorRef}
            onInput={refreshFormats}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-2 bg-background print:hidden"
          onClick={addPage}
        >
          <Plus />
          New Page
        </Button>
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
  index,
  lastEditorRef,
  onInput,
}: {
  index: number;
  lastEditorRef: React.RefObject<HTMLDivElement | null>;
  onInput: () => void;
}) {
  return (
    <div
      data-print-page
      className="relative flex w-letter min-h-letter flex-col bg-white shadow-xl ring-1 ring-black/5"
    >
      <div
        contentEditable
        suppressContentEditableWarning
        spellCheck
        role="textbox"
        aria-multiline="true"
        aria-label={`Page ${index + 1}`}
        data-placeholder={
          index === 0
            ? "Start writing your syllabus…"
            : "Continue writing…"
        }
        onFocus={(e) => {
          lastEditorRef.current = e.currentTarget;
        }}
        onInput={onInput}
        className={cn(
          "w-full flex-1 px-24 py-20 text-sm leading-relaxed text-neutral-900 outline-none",
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
