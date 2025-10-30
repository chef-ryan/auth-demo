import { L1Auth } from "./L1Auth"
import type { BuildLoginMessageParams } from "./L1Auth"

export type { BuildLoginMessageParams }

export const buildLoginMessage = (params: BuildLoginMessageParams) =>
  L1Auth.buildLoginMessage(params)
