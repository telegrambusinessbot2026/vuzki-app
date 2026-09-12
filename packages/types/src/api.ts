export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
}

export class ApiErrorResponse extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.code = code;
    this.status = status;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginResponse extends ApiResponse {
  data: {
    user: unknown;
    tokens: unknown;
  };
}
