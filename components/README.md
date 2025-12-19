# Component Library (Atomic Design)

This folder is the **single source of truth** for reusable UI in fafiq-app.

Reference:
- `docs/ui_system.md`

## Folder structure

- `components/ui/*`: primitives (atoms)
- `components/patterns/*`: composed patterns (molecules/organisms)
- `components/layout/*`: layout shell components
- `components/table/*`: table and table-adjacent patterns
- `components/<domain>/*`: domain-specific UI (dogs, transports, ...)

## Primitives (`components/ui`)

- `cn.ts`: className merging utility (`clsx` + `tailwind-merge`)
- `Typography`: semantic text
- `Button`: variants + loading + proper touch target sizing
- `Input`: labeled input with helper/error support
- `Spinner`: consistent loading indicator
- `EmptyState`: standard empty state

## Patterns (`components/patterns`)

- `ScreenGuard`: centralizes session bootstrap + org/membership gating + loading/error UI
- `DataView`: standard loading/error/empty wrapper for fetched data
- `OrgSelector`: shared org dropdown pill
- `Drawer`: shared side drawer
- `TabBar`: shared horizontal tabs
- `Pagination`: shared footer pagination

## Rules (Non-negotiable)

- Screens in `app/` should not define local UI components like `FormField`, `Drawer`, `TabsBar`, `Pagination`.
- Prefer semantic tokens (`bg-primary`, `bg-destructive`, `bg-surface`) over hardcoded colors in screens.
- Must work on React Native for Web (no native-only deps in `components/ui` / `components/patterns`).


