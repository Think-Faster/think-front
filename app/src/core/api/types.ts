export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Страница списка в BFF: page с единицы, pageSize по умолчанию 50.
export interface PageRequest {
  page?: number;
  pageSize?: number;
}
