import { Effect } from "effect"
import {
  SecretError,
  makeSecretRef,
  type PolicyToken,
  type SecretRef,
  type SecretStore,
} from "@rta/core"
import { InstrumentedSecret, type OperationSummary } from "@rta/strict"
import { createRuntimeScope } from "./scope.js"

type SecretOperation =
  | { readonly kind: "get"; readonly key: string }
  | { readonly kind: "put"; readonly key: string; readonly value: string }
  | { readonly kind: "reveal"; readonly secret: SecretRef; readonly token: PolicyToken }

type SecretResult =
  | { readonly kind: "ref"; readonly secret: SecretRef }
  | { readonly kind: "value"; readonly value: string }

export class InMemorySecretStore
  extends InstrumentedSecret<SecretOperation, SecretResult, SecretError>
  implements SecretStore {
  private readonly values = new Map<string, string>()

  constructor(readonly options: {
    readonly name?: string
    readonly initial?: Readonly<Record<string, string>>
  } = {}) {
    super(options.name ?? "InMemorySecretStore", "Runtime")
    for (const [key, value] of Object.entries(options.initial ?? {})) {
      this.values.set(key, value)
    }
  }

  get(key: string): Effect.Effect<SecretRef, SecretError> {
    return this.invoke({ kind: "get", key }, createRuntimeScope("SecretStore")).pipe(
      Effect.map((result) => result.kind === "ref" ? result.secret : makeSecretRef(key)),
    )
  }

  put(key: string, value: string): Effect.Effect<SecretRef, SecretError> {
    return this.invoke({ kind: "put", key, value }, createRuntimeScope("SecretStore")).pipe(
      Effect.map((result) => result.kind === "ref" ? result.secret : makeSecretRef(key)),
    )
  }

  reveal(secret: SecretRef, token: PolicyToken): Effect.Effect<string, SecretError> {
    return this.invoke({ kind: "reveal", secret, token }, createRuntimeScope("SecretStore")).pipe(
      Effect.flatMap((result) =>
        result.kind === "value"
          ? Effect.succeed(result.value)
          : Effect.fail(new SecretError({ message: "secret reveal returned no value", secret: secret.key })),
      ),
    )
  }

  protected summarize(input: SecretOperation): OperationSummary {
    if (input.kind === "put") {
      return {
        action: `Store secret ${input.key}`,
        reason: "a secret value should be stored without logging its contents",
        with: [this.primitiveName],
        input: input.key,
        output: "[secret]",
        lineage: ["primitive:secret"],
      }
    }
    if (input.kind === "reveal") {
      return {
        action: `Reveal secret ${input.secret.key}`,
        reason: `policy ${input.token.policy} authorized secret reveal`,
        with: [this.primitiveName],
        input: input.secret.key,
        output: "[secret]",
        lineage: ["primitive:secret"],
      }
    }
    return {
      action: `Load secret ${input.key}`,
      reason: "application code requested a secret reference",
      with: [this.primitiveName],
      input: input.key,
      output: "[secret]",
      lineage: ["primitive:secret"],
    }
  }

  protected execute(input: SecretOperation): Effect.Effect<SecretResult, SecretError> {
    if (input.kind === "put") {
      return Effect.sync(() => {
        this.values.set(input.key, input.value)
        return { kind: "ref" as const, secret: makeSecretRef(input.key) }
      })
    }
    if (input.kind === "get") {
      return this.values.has(input.key)
        ? Effect.succeed({ kind: "ref" as const, secret: makeSecretRef(input.key) })
        : Effect.fail(new SecretError({ message: "secret not found", secret: input.key }))
    }
    const value = this.values.get(input.secret.key)
    return value === undefined
      ? Effect.fail(new SecretError({ message: "secret not found", secret: input.secret.key }))
      : Effect.succeed({ kind: "value" as const, value })
  }
}
