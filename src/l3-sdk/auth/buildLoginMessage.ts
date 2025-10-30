import type { AuthIdentity } from "../l3auth.types"
import { L3Config } from "../l3.config"

type BuildLoginMessageParams = {
  identity: AuthIdentity
  nonce: string
  issuedAt: string
  domain: string
}

export const buildLoginMessage = ({
  identity,
  nonce,
  issuedAt,
  domain,
}: BuildLoginMessageParams) => {
  const chainReference = `${identity.namespace}:${identity.chainId}`

  return [
    `${domain} wants you to sign in with your account: ${identity.account}`,
    `domain: ${domain}`,
    `Version: ${L3Config.AUTH_MESSAGE_VERSION}`,
    `Chain ID: ${chainReference}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n")
}
