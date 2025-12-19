export type PaginationModel = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  pageSafe: number;
  start: number;
  end: number;
};

export function getPagination({
  page,
  pageSize,
  totalItems,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
}): PaginationModel {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const start = (pageSafe - 1) * pageSize;
  const end = Math.min(totalItems, start + pageSize);

  return { page, pageSize, totalItems, totalPages, pageSafe, start, end };
}

