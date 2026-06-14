export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function unwrapItems<T>(data: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data.items;
}
