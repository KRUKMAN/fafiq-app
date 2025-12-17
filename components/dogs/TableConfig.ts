export type DogTableColumn =
  | 'details'
  | 'status'
  | 'location'
  | 'metrics'
  | 'alerts'
  | 'actions';

type ColumnConfig = {
  key: DogTableColumn;
  label: string;
  flex: number;
  minWidth: number;
};

export const DOG_TABLE_COLUMNS: ColumnConfig[] = [
  { key: 'details', label: 'Dog Details', flex: 2, minWidth: 280 },
  { key: 'status', label: 'Status', flex: 1, minWidth: 140 },
  { key: 'location', label: 'Location / Responsible', flex: 1.5, minWidth: 200 },
  { key: 'metrics', label: 'Time in Care', flex: 1, minWidth: 160 },
  { key: 'alerts', label: 'Alerts', flex: 0.8, minWidth: 100 },
  { key: 'actions', label: 'Actions', flex: 0.5, minWidth: 90 },
];

export const TABLE_MIN_WIDTH = DOG_TABLE_COLUMNS.reduce((sum, col) => sum + col.minWidth, 0);
