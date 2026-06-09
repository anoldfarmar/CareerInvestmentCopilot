export type ApiResult<T> = {
  code: number;
  message: string;
  data: T;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};
