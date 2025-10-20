export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: number
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthorized = (message: string, code?: number) =>
  new HttpError(401, message, code);

export const badRequest = (message: string, code?: number) =>
  new HttpError(400, message, code);

export const forbidden = (message: string, code?: number) =>
  new HttpError(403, message, code);

export const internal = (message: string, code?: number) =>
  new HttpError(500, message, code);
