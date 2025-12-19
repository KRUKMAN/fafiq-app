# Components Library

Use these shared primitives to avoid duplicating UI across the app.

- `components/ui/EmptyState` — standard empty state (title + optional description).
- `components/table/DataTable` — horizontal-scrollable table shell with sticky header.
- `components/layout/PageHeader` — page title + actions wrapper.
- `components/dogs/StatusBadge` — status pill for dog stages (move to `components/ui/Badge` when generalized).
- `components/table/TableToolbar` — table toolbar (filters/search) used by list screens.

Guidelines:
- Prefer placing generic UI in `components/ui/`.
- Keep domain-specific pieces inside their feature folder (e.g., `components/dogs/`).
- Reuse the shared EmptyState for all list/detail empty views.

