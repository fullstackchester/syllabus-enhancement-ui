---
name: tailwind-css
description: >
  Specialized skill for adding, editing, and optimizing UI components that use Tailwind CSS.
  Invoke this skill whenever the user wants to build a new UI component, style or restyle an existing one,
  fix Tailwind-related warnings or errors, audit classes in a file, or optimize/clean up existing
  Tailwind markup. Also trigger when the user says things like "fix the styling", "update the UI",
  "make it look better", "add a button/card/table/modal", "clean up the classes", "there's a Tailwind
  warning", or any request that will result in writing or modifying className strings in JSX/TSX.
  Use this skill even when Tailwind is only mentioned in passing — if className props will be touched, this skill applies.
---

## Project Context

This project uses **Tailwind CSS v4** (imported via `@import "tailwindcss"` in `src/styles/index.css`),
**shadcn/ui** components, and a custom `@theme inline {}` block that maps CSS variables to Tailwind
token names (e.g. `--color-primary`, `--color-muted-foreground`, `--radius-lg`).

Always prefer the project's semantic color tokens over raw color scales:
- Use `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`,
  `text-primary-foreground`, `bg-secondary`, `bg-accent`, `bg-destructive`, `border-border`, etc.
- Use `ring-ring`, `outline-ring/50`, `bg-sidebar`, `bg-sidebar-accent`, etc. for sidebar-specific areas.
- Use `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` etc. (mapped to the project's `--radius` scale).

Dark mode is handled automatically by these tokens — do **not** hard-code `dark:bg-gray-900` etc. when
a semantic token already adapts to dark mode.

---

## Core Principles

### 1. Tailwind-first, arbitrary-last

Always exhaust the Tailwind utility scale before reaching for `[]` arbitrary values.

| Instead of | Use |
|---|---|
| `w-[32px]` | `w-8` (8 × 4px = 32px) |
| `text-[14px]` | `text-sm` (14px) |
| `gap-[24px]` | `gap-6` |
| `p-[12px]` | `p-3` |
| `mt-[20px]` | `mt-5` |
| `rounded-[8px]` | `rounded-lg` (project token) |
| `bg-[#fff]` | `bg-background` or `bg-white` |

**Arbitrary values are only justified when:**
- The value is a brand/design-spec pixel that has no Tailwind equivalent (e.g., a logo container of exactly 56px)
- The value comes from a dynamic variable that must be inlined (e.g., `w-[var(--sidebar-width)]`)
- The property itself has no Tailwind utility (e.g., `[clip-path:polygon(...)]`)

### 2. Maximize utility composition

Before adding a custom CSS class or `@apply` rule, try composing from utilities:

```tsx
// Avoid
<div className="card-style">…</div>

// Prefer
<div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6">…</div>
```

### 3. Logical class ordering

Group classes consistently so they are scannable:

```
layout → sizing → spacing → display/flex/grid → typography → color → border → ring/outline → shadow → transition → interactive states → responsive → dark
```

Example:
```tsx
className="relative flex flex-col w-full max-w-sm gap-4 p-6 text-sm font-medium text-foreground bg-card border border-border rounded-lg shadow-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:max-w-md"
```

---

## Warning Audit Checklist

Before finishing any component work, scan every `className` prop in the changed files for these issues:

### Unknown / deprecated utilities
- Catch typos: `felx` → `flex`, `itmes` → `items`, `truncat` → `truncate`
- Tailwind v4 removed some v3 utilities — check for `decoration-clone`, `bg-opacity-*`, `text-opacity-*`
  - v4 replaces `bg-opacity-50` with `bg-black/50` (slash opacity syntax)
  - v4 replaces `border-opacity-*` with `border-black/50`

### Arbitrary values that could be standard
- `text-[16px]` → `text-base`, `text-[12px]` → `text-xs`, `text-[20px]` → `text-xl`
- `p-[16px]` → `p-4`, `gap-[8px]` → `gap-2`, `mt-[4px]` → `mt-1`
- `w-[100%]` → `w-full`, `h-[100vh]` → `h-screen`, `min-h-[100vh]` → `min-h-screen`
- `rounded-[4px]` → `rounded`, `rounded-[9999px]` → `rounded-full`
- `opacity-[0.5]` → `opacity-50`
- `z-[10]` → `z-10`, `z-[100]` → `z-[100]` (no standard scale match, OK to keep)

### Conflicting utilities
- `flex` + `block` (pick one)
- `hidden` + any display utility
- `w-full` + a specific `w-*` on the same element
- `text-left` + `text-center` (pick one)

### Missing semantic concerns
- Hardcoded color like `text-gray-500` inside a component → prefer `text-muted-foreground`
- `bg-white` inside a component → usually should be `bg-background` or `bg-card`
- `text-black` → `text-foreground`
- `border-gray-200` → `border-border`

### Accessibility utilities
- Interactive elements (buttons, links) need `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` unless the shadcn/ui component already provides it
- Don't remove `sr-only` from icon-only buttons — keep screen-reader text

### Responsive & state variants
- Ensure responsive breakpoints use mobile-first order: `base → sm: → md: → lg: → xl:`
- Hover/focus states should always be paired: if `hover:bg-accent` exists, ensure `focus-visible:` is also handled

---

## Common Patterns for This Project

### Buttons (use shadcn/ui `<Button>` — avoid raw `<button>` with custom styling)
```tsx
<Button variant="default">Primary</Button>
<Button variant="outline" size="sm">Secondary</Button>
<Button variant="ghost" size="icon"><Icon className="size-4" /></Button>
```

### Cards
```tsx
<div className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
  <div className="p-6 flex flex-col gap-4">…</div>
</div>
```

### Table cells — lean on shadcn/ui `<TableCell>` and use utilities for state
```tsx
<TableRow className="hover:bg-muted/50 data-[state=selected]:bg-muted">
```

### Badges
```tsx
<Badge variant="secondary">Draft</Badge>
<Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
```
When a semantic `variant` doesn't exist for the color you need, compose with slash-opacity
instead of arbitrary hex.

### Skeleton loading
```tsx
<Skeleton className="h-4 w-[200px]" />
```
Only use arbitrary `w-[Xpx]` on Skeletons where the visual approximation needs a specific width
that has no standard scale equivalent.

### Icon sizing
Always use `size-*` (sets both width and height): `size-4` (16px), `size-5` (20px), `size-6` (24px).
Avoid `w-4 h-4` duplication.

---

## Workflow

1. **Read** the target file(s) to understand the current markup.
2. **Write or revise** the component with Tailwind-first classes and semantic project tokens.
3. **Audit** every `className` against the Warning Audit Checklist above.
4. **Fix all warnings** — do not leave known issues unaddressed.
5. **Report** a brief summary of changes: what was added/changed and any warnings that were resolved.
