export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function errorBody(error: HttpError): {
  error: { code: string; message: string; field?: string };
} {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.field === undefined ? {} : { field: error.field }),
    },
  };
}
