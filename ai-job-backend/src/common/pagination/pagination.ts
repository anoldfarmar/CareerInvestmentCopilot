import { PaginationQueryDto } from './pagination-query.dto';

export function getPagination(query?: PaginationQueryDto) {
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 20;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function paginatedResponse<T>(items: T[], total: number, query?: PaginationQueryDto) {
  const { page, pageSize } = getPagination(query);
  return {
    items,
    total,
    page,
    pageSize,
  };
}
