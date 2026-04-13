export type ApiResponse<T> = {
  Data: T;
  Message: string | null;
  Success: boolean;
};

export type PagedApiResponse<T> = ApiResponse<T[]> & {
  Total: number;
  Page: number;
  PageSize: number;
};

