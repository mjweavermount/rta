import { Effect } from "effect"
import { readFile } from "node:fs/promises"
import {
  SecretError,
  isSecretRef,
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

type ExternalSecretOperation =
  | { readonly kind: "get"; readonly key: string }
  | { readonly kind: "reveal"; readonly secret: SecretRef; readonly token: PolicyToken }

export interface Redactor {
  readonly redact: (value: unknown) => unknown
}

export class SecretRedactor implements Redactor {
  constructor(readonly options: {
    readonly mask?: string
    readonly secretKeys?: ReadonlyArray<string>
  } = {}) {}

  redact(value: unknown): unknown {
    return redactValue(value, {
      mask: this.options.mask ?? "[secret]",
      secretKeys: this.options.secretKeys ?? defaultSecretKeys,
    })
  }
}

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

export class EnvironmentSecretStore
  extends InstrumentedSecret<ExternalSecretOperation, SecretResult, SecretError>
  implements Pick<SecretStore, "get" | "reveal"> {
  constructor(readonly options: {
    readonly env?: Record<string, string | undefined>
    readonly name?: string
  } = {}) {
    super(options.name ?? "EnvironmentSecretStore", "Runtime")
  }

  get(key: string): Effect.Effect<SecretRef, SecretError> {
    return this.invoke({ kind: "get", key }, createRuntimeScope("EnvironmentSecretStore")).pipe(
      Effect.map((result) => result.kind === "ref" ? result.secret : makeSecretRef(key)),
    )
  }

  reveal(secret: SecretRef, token: PolicyToken): Effect.Effect<string, SecretError> {
    return this.invoke({ kind: "reveal", secret, token }, createRuntimeScope("EnvironmentSecretStore")).pipe(
      Effect.flatMap((result) =>
        result.kind === "value"
          ? Effect.succeed(result.value)
          : Effect.fail(new SecretError({ message: "environment secret reveal returned no value", secret: secret.key })),
      ),
    )
  }

  protected summarize(input: ExternalSecretOperation): OperationSummary {
    if (input.kind === "reveal") {
      return {
        action: `Reveal environment secret ${input.secret.key}`,
        reason: `policy ${input.token.policy} authorized environment secret reveal`,
        with: [this.primitiveName],
        input: input.secret.key,
        output: "[secret]",
        lineage: ["primitive:secret", "pattern:environment-secret"],
      }
    }
    return {
      action: `Load environment secret ${input.key}`,
      reason: "application code requested an environment-backed secret reference",
      with: [this.primitiveName],
      input: input.key,
      output: "[secret]",
      lineage: ["primitive:secret", "pattern:environment-secret"],
    }
  }

  protected execute(input: ExternalSecretOperation): Effect.Effect<SecretResult, SecretError> {
    if (input.kind === "reveal") {
      const env = this.options.env ?? process.env
      const value = env[input.secret.key]
      return value === undefined
        ? Effect.fail(new SecretError({ message: "environment secret not found", secret: input.secret.key }))
        : Effect.succeed({ kind: "value" as const, value })
    }
    const env = this.options.env ?? process.env
    return env[input.key] === undefined
      ? Effect.fail(new SecretError({ message: "environment secret not found", secret: input.key }))
      : Effect.succeed({ kind: "ref" as const, secret: makeSecretRef(input.key) })
  }
}

export class FileSecretStore
  extends InstrumentedSecret<ExternalSecretOperation, SecretResult, SecretError>
  implements Pick<SecretStore, "get" | "reveal"> {
  constructor(readonly options: {
    readonly files: Readonly<Record<string, string>>
    readonly name?: string
  }) {
    super(options.name ?? "FileSecretStore", "Runtime")
  }

  get(key: string): Effect.Effect<SecretRef, SecretError> {
    return this.invoke({ kind: "get", key }, createRuntimeScope("FileSecretStore")).pipe(
      Effect.map((result) => result.kind === "ref" ? result.secret : makeSecretRef(key)),
    )
  }

  reveal(secret: SecretRef, token: PolicyToken): Effect.Effect<string, SecretError> {
    return this.invoke({ kind: "reveal", secret, token }, createRuntimeScope("FileSecretStore")).pipe(
      Effect.flatMap((result) =>
        result.kind === "value"
          ? Effect.succeed(result.value)
          : Effect.fail(new SecretError({ message: "file secret reveal returned no value", secret: secret.key })),
      ),
    )
  }

  protected summarize(input: ExternalSecretOperation): OperationSummary {
    if (input.kind === "reveal") {
      return {
        action: `Reveal file secret ${input.secret.key}`,
        reason: `policy ${input.token.policy} authorized file secret reveal`,
        with: [this.primitiveName],
        input: input.secret.key,
        output: "[secret]",
        lineage: ["primitive:secret", "pattern:file-secret"],
      }
    }
    return {
      action: `Load file secret ${input.key}`,
      reason: "application code requested a file-backed secret reference",
      with: [this.primitiveName],
      input: input.key,
      output: "[secret]",
      lineage: ["primitive:secret", "pattern:file-secret"],
    }
  }

  protected execute(input: ExternalSecretOperation): Effect.Effect<SecretResult, SecretError> {
    if (input.kind === "reveal") {
      return this.fileFor(input.secret.key).pipe(
        Effect.flatMap((path) =>
          Effect.tryPromise({
            try: async () => ({ kind: "value" as const, value: (await readFile(path, "utf8")).trimEnd() }),
            catch: (cause) => new SecretError({ message: "file secret read failed", secret: input.secret.key, cause }),
          }),
        ),
      )
    }
    return this.fileFor(input.key).pipe(
      Effect.map(() => ({ kind: "ref" as const, secret: makeSecretRef(input.key) })),
    )
  }

  private fileFor(key: string): Effect.Effect<string, SecretError> {
    const path = this.options.files[key]
    return path
      ? Effect.succeed(path)
      : Effect.fail(new SecretError({ message: "file secret not configured", secret: key }))
  }
}

export class ApiTokenSecretStore implements Pick<SecretStore, "get" | "reveal"> {
  constructor(readonly options: {
    readonly delegate: Pick<SecretStore, "get" | "reveal">
    readonly prefix?: string
  }) {}

  get(key: string): Effect.Effect<SecretRef, SecretError> {
    return this.options.delegate.get(this.keyFor(key))
  }

  reveal(secret: SecretRef, token: PolicyToken): Effect.Effect<string, SecretError> {
    return this.options.delegate.reveal(secret, token)
  }

  private keyFor(key: string): string {
    return `${this.options.prefix ?? "api"}:${key}`
  }
}

const defaultSecretKeys = [
  "apiKey",
  "api_key",
  "authorization",
  "bearer",
  "clientSecret",
  "client_secret",
  "credential",
  "password",
  "secret",
  "secretKey",
  "secret_key",
  "token",
] as const

const isSecretKey = (key: string, secretKeys: ReadonlyArray<string>): boolean => {
  const normalized = key.toLowerCase()
  return secretKeys.some((candidate) => normalized.includes(candidate.toLowerCase()))
}

const redactValue = (
  value: unknown,
  options: { readonly mask: string; readonly secretKeys: ReadonlyArray<string> },
  seen = new WeakSet<object>(),
): unknown => {
  if (isSecretRef(value)) return value.redacted
  if (typeof value === "string") return value
  if (typeof value !== "object" || value === null) return value
  if (seen.has(value)) return "[circular]"
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, options, seen))
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSecretKey(key, options.secretKeys)
        ? options.mask
        : redactValue(item, options, seen),
    ]),
  )
}
