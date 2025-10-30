import { HttpError } from "../errors"

export const unauthorized = (message: string, code?: number) =>
  new HttpError(401, message, code)
