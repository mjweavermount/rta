import { Effect, ParseResult, Schema } from "effect"
import type { CommandTypeId } from "./typeids.js"
import { CommandTypeId as CTypeId } from "./symbols.js"

// ---------------------------------------------------------------------------
// Command
//
// HELLA STRICT CQRS:
//   - Commands are fire-and-forget. They return void.
//   - No return values. Results come back via domain events only.
//   - A CommandHandler cannot receive a Query. A QueryHandler cannot receive
//     a Command. Enforced at the type level via TypeIds.
//
// Tag      — string literal discriminant (e.g. "PlaceOrder")
// TPayload — the command's payload shape (already decoded)
// ---------------------------------------------------------------------------

export interface Command<Tag extends string, TPayload> {
  readonly [CTypeId]: CommandTypeId
  readonly _tag: Tag
  readonly payload: TPayload
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CommandConstructor<Tag extends string, S extends Schema.Schema<any, any, never>> {
  readonly _tag: Tag
  readonly schema: S
  /** Decode + validate raw input, producing a command instance. */
  readonly make: (
    raw: unknown,
  ) => Effect.Effect<Command<Tag, Schema.Schema.Type<S>>, ParseResult.ParseError>
  /** Narrow an unknown value to this specific command type. */
  readonly is: (u: unknown) => u is Command<Tag, Schema.Schema.Type<S>>
}

export const defineCommand = <
  Tag extends string,
  S extends Schema.Schema<any, any, never>,
>(
  _tag: Tag,
  schema: S,
): CommandConstructor<Tag, S> => ({
  _tag,
  schema,
  make: (raw) =>
    Schema.decodeUnknown(schema)(raw).pipe(
      Effect.map((payload) => ({
        [CTypeId]: CTypeId,
        _tag,
        payload,
      })),
    ),
  is: (u): u is Command<Tag, Schema.Schema.Type<S>> =>
    typeof u === "object" && u !== null && CTypeId in u && (u as any)._tag === _tag,
})

/** Runtime type guard for any command. */
export const isCommand = (u: unknown): u is Command<string, unknown> =>
  typeof u === "object" && u !== null && CTypeId in u

