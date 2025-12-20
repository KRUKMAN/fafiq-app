# Architecture Update: Round 3 Deep Polish (UI + Structure)

Purpose: capture the “Round 3: Deep Polish & Standardization Audit” outcomes so future agents (and humans) have accurate context.

This update focuses on:
- token-first styling (semantic colors)
- i18n-ready string isolation
- consistent feedback patterns (inline status messages; no toasts)
- reducing view-layer logic by extracting pure helpers/view-models
- web-first UI compatibility fixes

---

## Key Decisions (Authoritative)

### 1) Feedback UX: inline status messages (no toasts)
Source rule: `docs/editing.md` (“Show a small status message on save/error; avoid toasts.”).

Decision:
- Prefer inline, local status messages near the action source.
- Use `components/ui/StatusMessage.tsx` for consistent presentation.

Applied in:
- `app/(tabs)/dogs/create.tsx` (mock form) and `app/(tabs)/dogs/[id]/edit.tsx` (mock form)
- `app/(tabs)/dogs/index.tsx` and `app/(tabs)/transports/index.tsx` (action-level errors like delete failures)

Rationale:
- Works consistently on iOS/Android/Web
- Doesn’t hide errors behind global overlays
- Matches the product’s “edit in context” philosophy

### 2) Styling: semantic tokens everywhere
Decision:
- UI primitives and shared patterns must use semantic tokens (not `gray-*`, not `bg-white`, not `#hex`).

Updates:
- Expanded semantic palette in `tailwind.config.js`:
  - added `background`, `card`, `foreground`, `warning`, `success`
- Migrated primitives and shared patterns to semantic classes:
  - `components/ui/Typography.tsx` now uses `text-foreground`, `text-muted`, `text-destructive`, `text-success`
  - `components/layout/PageHeader.tsx`, `components/patterns/*`, `components/table/*` updated accordingly

Note on icons:
- NativeWind className cannot style `lucide-react-native` icon color props.
- Icon colors are centralized in `constants/uiColors.ts` (`UI_COLORS`) and passed as values.

### 3) i18n readiness: centralize strings
Decision:
- No user-facing strings should be introduced inline in screens going forward.
- New/edited surfaces should pull copy from `constants/strings.ts`.

Where:
- `constants/strings.ts` introduced and used in:
  - `app/sign-in.tsx`
  - `app/(tabs)/dogs/index.tsx`
  - `app/(tabs)/dogs/create.tsx`
  - `app/(tabs)/dogs/[id]/edit.tsx`
  - `app/(tabs)/transports/index.tsx`
  - `components/table/TableToolbar.tsx`
  - `components/table/AdvancedFilterDrawer.tsx`

### 4) Layout: remove ad-hoc numeric contentContainerStyle usage (incremental)
Decision:
- Consolidate common ScrollView padding/gap into a shared module to reduce scattered “magic numbers”.

Added:
- `constants/layout.ts` with `LAYOUT_STYLES` (RN `StyleSheet`) and shared numeric constants.

Applied (examples):
- `components/patterns/TabBar.tsx` contentContainerStyle
- `app/(tabs)/transports/[id].tsx`, `components/people/PeopleDrawers.tsx`, `components/transports/TransportsDrawers.tsx`
- `app/(tabs)/dogs/[id].tsx` (compact gapped ScrollView section)

### 5) Reduce view-layer logic: extract pure helpers
Decision:
- Extract pure, testable helpers out of screens when they mix mapping/pagination logic with JSX.

Added:
- `lib/pagination.ts` (`getPagination`) used by Dogs/People/Transports list screens.
- `lib/viewModels/dogProfile.ts` (`toDogProfileView`) extracted from `app/(tabs)/dogs/[id].tsx`.

Rationale:
- Keeps screens layout-first
- Makes transformations unit-testable later
- Improves reuse and reduces drift

### 6) Web-first fix: RowActionsMenu overlay
Decision:
- Replace the previous "-1000 backdrop hack" with a `Modal`-based overlay (RN-safe and web-safe).

Updated:
- `components/ui/RowActionsMenu.tsx` now:
  - uses `Modal` + `StyleSheet.absoluteFill` backdrop
  - anchors menu position when possible via `measureInWindow`
  - keeps web nested-button avoidance

### 7) UX Review: Spacing and Component Alignment (Post-Round 3)
Decision:
- Standardize spacing across all detail views for consistent visual rhythm.
- Fix component alignment issues that caused tabs and timelines to appear misaligned.

Applied fixes:
- **TabBar structure**: Wrapped ScrollView in View container to fix vertical alignment issues that made tabs appear "invisibly lower"
  - Border and spacing now applied to outer container
  - Prevents ScrollView from creating unwanted vertical space
- **TabBar spacing**: Standardized to `mb-6` across all detail views (Dogs, Transports, People)
- **Timeline spacing**:
  - Empty state: `py-8` (reduced from `py-10` for consistency)
  - Load more button: `mt-4` (changed from `pt-4` for proper margin semantics)
  - Filter bar: `mb-4` (internal spacing)
- **Detail view cleanup**:
  - Removed unnecessary spacer (`h-1`) from Dog detail TopBar
  - Removed unwired button (MoreHorizontal) from Dog detail header
  - All timeline usages verified with `scrollable={false}` for drawer consistency

Rationale:
- Consistent spacing creates visual rhythm and reduces cognitive load
- Proper component structure prevents alignment bugs that degrade UX
- Standardized values make future maintenance easier

---

## Data Flow (Current “Happy Path”)

### List screens (Dogs/People/Transports)
1. Screen reads org context from `stores/sessionStore.ts` (active `org_id`).
2. Screen uses TanStack Query hooks:
   - `hooks/useDogs`, `hooks/useOrgMemberships`, `hooks/useOrgContacts`, `hooks/useTransports`
3. Data access happens via `lib/data/*` modules (Supabase-first, mock fallback) and is validated via Zod schemas in `schemas/*`.
4. Screen maps domain models to UI rows (incrementally being moved into helpers/viewModels).
5. `components/table/DataTable.tsx` renders tables; `components/patterns/Pagination.tsx` renders the footer.

### Mutations + feedback
- Mutations call `lib/data/*` functions.
- On success: invalidate query keys (e.g. `['dogs', orgId]`, `['transports', orgId]`).
- On error: show `StatusMessage` (screen-local).

---

## Known Remaining Debt (Intentionally Not Fully Addressed Here)
- `app/(tabs)/settings/index.tsx` and parts of `app/(tabs)/dogs/[id].tsx` still contain `bg-white`, `text-gray-*`, and other non-semantic classes.
- `constants/theme.ts` is legacy Expo template coloring and is not currently driving the NativeWind semantic system (keep, but avoid expanding unless intentionally re-integrated).
- Strict-mode spacing rules are only partially enforced; remaining “micro sizes” and a few arbitrary values are still present in domain components.

---

## For Future Agents
Read in order:
1. `docs/ai_checklist.md` (non-negotiables)
2. `docs/ui_system.md` (design system + primitives/patterns)
3  `docs/implementation_plan`
3. `docs/editing.md` (inline edit + feedback rules)
4. This file: `docs/architecture_round3_polish.md`

