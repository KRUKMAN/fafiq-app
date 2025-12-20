/**
 * Standard Entity Hook Interface
 *
 * All data hooks must implement this interface to plug into StandardListLayout.
 *
 * @example
 * ```typescript
 * export const useDogsStandard: StandardEntityHook<Dog, DogFilters> = (orgId, filters) => {
 *   return useDogs(orgId, filters);
 * };
 * ```
 */
export type StandardEntityHook<TItem, TFilterState> = (
  orgId: string | undefined,
  filters: TFilterState
) => {
  data: TItem[] | undefined;
  isLoading: boolean;
  error: unknown;
};

/**
 * Re-export types from StandardListLayout for convenience
 */
export type {
    QuickFilter, TableColumn,
    TableRowItem
} from './StandardListLayout';

