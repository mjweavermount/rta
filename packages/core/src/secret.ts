import { Effect } from "effect"
import type { SecretTypeId } from "./typeids.js"
import { SecretTypeId as STypeId } from "./symbols.js"
import type { PolicyToken } from "./operation-scope.js"
import type { SecretError } from "./errors.js"

export interface SecretRef {
  readonly [STypeId]: SecretTypeId
  readonly key: string
  readonly redacted: string
  readonly toString: () => string
  readonly toJSON: () => string
}

export interface SecretStore {
  readonly get: (key: string) => Effect.Effect<SecretRef, SecretError>
  readonly put: (key: string, value: string) => Effect.Effect<SecretRef, SecretError>
  readonly reveal: (secret: SecretRef, token: PolicyToken) => Effect.Effect<string, SecretError>
}

export const makeSecretRef = (key: string, redacted = "[secret]"): SecretRef => {
  const secret: SecretRef = {
    [STypeId]: STypeId,
    key,
    redacted,
    toString: () => redacted,
    toJSON: () => redacted,
  }
  return Object.freeze(secret) as SecretRef
}

export const isSecretRef = (value: unknown): value is SecretRef =>
  typeof value === "object" && value !== null && STypeId in value
