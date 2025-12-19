# UI Design System (Atomic + NativeWind)

This document defines the **authoritative frontend UI system** for fafiq-app.

Goals:
- Screens in `app/` should be composed from **reusable components**, not inline styling.
- UI must work on **iOS, Android, and React Native for Web**.
- Styling must be **semantic and token-based** (avoid hardcoded `gray-*` or `#hex` in screens).

---

## Principles

- **Atomic Design**:
  - **Primitives** live in `components/ui/`
  - **Patterns** (composed components) live in `components/patterns/`
  - **Domain components** live in `components/<domain>/` or `components/domain/<domain>/`
- **No copy/paste UI**: If a component appears in 2+ places, promote it.
- **UX consistency**: Use shared loading/error/empty patterns, consistent spacing, and touch targets.
- **Web-first**: All components must be tested on web and avoid native-only dependencies.

---

## React Native for Web Compatibility

Hard rules:
- Use `Pressable` for interactions.
- Prefer `onPress` (not `onClick`).
- Avoid web-only CSS assumptions (`position: fixed`, etc). Use RN layout primitives.
- Avoid nested `<button>` semantics on web (see existing pattern in `DogRow` using `Platform.OS === 'web'`).
- Ensure touch targets are ≥ 44px (`min-h-[44px]`).

---

## Design Tokens

Tokens are expressed via NativeWind/Tailwind **semantic colors**:

- `bg-surface`, `border-border`
- `bg-primary`, `border-primary`
- `bg-destructive`, `border-destructive`
- `text-muted`, `text-muted-foreground`

Source: `tailwind.config.js`

---

## Primitives (`components/ui/`)

### `cn()`
Use `cn()` to merge `className` safely across variants.

### `Typography`
Use semantic variants for text:
- `h1`, `h2`, `h3`
- `body`, `bodySmall`
- `caption`, `label`

### `Button`
Variants:
- `primary` (default)
- `secondary`
- `outline`
- `ghost`
- `destructive`

Rules:
- Use `loading` for async actions.
- Respect `disabled` and keep hit area ≥ 44px.

### `Input`
Features:
- Optional `label`, `helper`, `error`
- Supports `leftIcon`, `rightIcon`

---

## Patterns (`components/patterns/`)

### `ScreenGuard`
Use this at the top of org-scoped screens.
It centralizes:
- session bootstrap
- membership/active org guard
- loading + error rendering

### `DataView`
Wrap data sections (tables/lists) to standardize:
- loading
- error
- empty state

### `Drawer`
Standard side drawer wrapper for detail/edit flows.

### `TabBar`
Standard horizontal tab selector.

### `Pagination`
Standard pagination footer for list/table pages.

---

## How Screens Should Be Composed

Expected pattern for list screens:

1. `ScreenGuard` for session/org gating
2. `PageHeader` for title + actions
3. `TableToolbar` or a pattern-level `SearchInput`
4. `DataView` wrapping the table/list
5. `Pagination` for page controls

---

## Anti-patterns (Do Not Do)

- Defining `FormField`, `Drawer`, `TabsBar`, `Pagination` inside screen files
- Hardcoding `bg-gray-900` as “primary”
- Inline hex colors in icons (prefer semantic colors or shared icon wrapper)
- Repeating the same “Loading session… / No memberships…” UI blocks per screen


