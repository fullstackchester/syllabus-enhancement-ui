import * as React from "react";

import {
  MIN_CONTENT,
  PPI,
  TICK,
  clamp,
} from "@/components/syllabus/page-geometry";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Margin ruler                                                               */
/* -------------------------------------------------------------------------- */

// A draggable ruler aligned to a page edge. `start`/`end` are the leading and
// trailing margins in px (left/right for horizontal, top/bottom for vertical),
// measured inward from each end of `length`. Dragging or arrow-keying a handle
// reports the new margin through `onChange`.
export function MarginRuler({
  orientation,
  length,
  start,
  end,
  startLabel,
  endLabel,
  onChange,
  className,
}: {
  orientation: "horizontal" | "vertical";
  length: number;
  start: number;
  end: number;
  startLabel: string;
  endLabel: string;
  onChange: (next: { start?: number; end?: number }) => void;
  className?: string;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const horizontal = orientation === "horizontal";

  // Snap a position to the nearest ruler line (every quarter-inch tick) so a
  // margin can only ever land on a drawn line, never between them.
  const snap = (n: number) => Math.round(n / TICK) * TICK;

  // Convert a margin position to a clamped value that keeps both handles apart
  // by at least MIN_CONTENT and inside the page. Bounds are tick multiples too,
  // so clamping a snapped position stays on a line.
  const clampStart = (pos: number) => clamp(pos, 0, length - end - MIN_CONTENT);
  const clampEnd = (pos: number) =>
    clamp(length - pos, 0, length - start - MIN_CONTENT);

  const startDrag = (edge: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      const offset = horizontal
        ? ev.clientX - rect.left
        : ev.clientY - rect.top;
      const pos = clamp(snap(offset), 0, length);
      onChange(
        edge === "start" ? { start: clampStart(pos) } : { end: clampEnd(pos) }
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onKey = (edge: "start" | "end") => (e: React.KeyboardEvent) => {
    // Toward the page center grows the margin; away shrinks it.
    const grow = horizontal ? "ArrowRight" : "ArrowDown";
    const shrink = horizontal ? "ArrowLeft" : "ArrowUp";
    const inward = edge === "start" ? grow : shrink;
    const outward = edge === "start" ? shrink : grow;
    // One line per press; Shift jumps a full inch. Both stay on tick lines.
    const step = e.shiftKey ? PPI : TICK;
    let delta: number;
    if (e.key === inward) delta = step;
    else if (e.key === outward) delta = -step;
    else return;
    e.preventDefault();
    const value = snap((edge === "start" ? start : end) + delta);
    const pos = edge === "start" ? value : length - value;
    onChange(
      edge === "start" ? { start: clampStart(pos) } : { end: clampEnd(pos) }
    );
  };

  const ticks: number[] = [];
  for (let pos = 0; pos <= length + 0.5; pos += TICK) ticks.push(pos);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-sm border bg-background shadow-sm select-none print:hidden",
        horizontal ? "h-6" : "w-6",
        className
      )}
      style={horizontal ? { width: length } : { height: length }}
    >
      {/* Inch / quarter-inch ticks. */}
      {ticks.map((pos) => {
        const major = pos % PPI < 0.5;
        const len = major ? 10 : 5;
        return (
          <React.Fragment key={pos}>
            <span
              className="pointer-events-none absolute bg-border"
              style={
                horizontal
                  ? { left: pos, bottom: 0, width: 1, height: len }
                  : { top: pos, right: 0, height: 1, width: len }
              }
            />
            {major && pos > 0.5 && pos < length - 0.5 && (
              <span
                className="pointer-events-none absolute text-[8px] leading-none text-muted-foreground"
                style={
                  horizontal
                    ? { left: pos + 2, top: 2 }
                    : { top: pos + 2, left: 3 }
                }
              >
                {pos / PPI}
              </span>
            )}
          </React.Fragment>
        );
      })}

      <MarginHandle
        horizontal={horizontal}
        position={start}
        label={startLabel}
        value={start}
        onPointerDown={startDrag("start")}
        onKeyDown={onKey("start")}
      />
      <MarginHandle
        horizontal={horizontal}
        position={length - end}
        label={endLabel}
        value={end}
        onPointerDown={startDrag("end")}
        onKeyDown={onKey("end")}
      />
    </div>
  );
}

function MarginHandle({
  horizontal,
  position,
  label,
  value,
  onPointerDown,
  onKeyDown,
}: {
  horizontal: boolean;
  position: number;
  label: string;
  value: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <button
      type="button"
      role="slider"
      aria-label={label}
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      aria-valuenow={Math.round(value)}
      title={`${label}: ${Math.round(value)}px`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "group absolute z-10 touch-none",
        horizontal
          ? "top-0 bottom-0 w-3 -translate-x-1/2 cursor-ew-resize"
          : "right-0 left-0 h-3 -translate-y-1/2 cursor-ns-resize"
      )}
      style={horizontal ? { left: position } : { top: position }}
    >
      {/* Boundary line. */}
      <span
        className={cn(
          "absolute bg-primary",
          horizontal
            ? "inset-y-0 left-1/2 w-px -translate-x-1/2"
            : "inset-x-0 top-1/2 h-px -translate-y-1/2"
        )}
      />
      {/* Grip dot. */}
      <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background transition-transform group-hover:scale-125" />
    </button>
  );
}
