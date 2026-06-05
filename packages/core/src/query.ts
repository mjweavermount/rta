import { Effect, ParseResult, Schema } from "effect"
import type { QueryTypeId } from "./typeids.js"
import { QueryTypeId as QTypeId } from "./symbols.js"

// ---------------------------------------------------------------------------
// Query
//
// Read side only. Never touches write model. Never modifies state.
// TResult is a phantom type — carried only in the TypeScript type, not in
// the runtime object. It constrains what QueryHandler.handle() must return.
//
// Tag      — string literal discriminant (e.g. "GetOrder")
// TPayload — the query's parameter shape (already decoded)
// TResult  — the shape of the data this query returns (phantom)
// ---------------------------------------------------------------------------

export interface Query<Tag extends string, TPayload, TResult> {
  readonly [QTypeId]: QueryTypeId
  readonly _tag: Tag
  readonly payload: TPayload
}

/** Extract the phantom result type from a Query type. */
export type QueryResult<Q extends Query<string, any, any>> =
  Q extends Query<string, any, infer R> ? R : never

// ---------------------------------------------------------------------------
// Factory
//
// resultSchema is kept on the constructor (not the instance) so:
//   - @rta/strict can validate responses against it
//   - the visualizer can display the return shape in the parts list
// ---------------------------------------------------------------------------

export interface QueryConstructor<
  Tag extends string,
  S extends Schema.Schema<any, any, never>,
  R extends Schema.Schema<any, any, never>,
> {
  readonly _tag: Tag
  readonly schema: S
  readonly resultSchema: R
  readonly make: (
    raw: unknown,
  ) => Effect.Effect<
    Query<Tag, Schema.Schema.Type<S>, Schema.Schema.Type<R>>,
    ParseResult.ParseError
  >
  readonly is: (
    u: unknown,
  ) => u is Query<Tag, Schema.Schema.Type<S>, Schema.Schema.Type<R>>
}

export const defineQuery = <
  Tag extends string,
  S extends Schema.Schema<any, any, never>,
  R extends Schema.Schema<any, any, never>,
>(
  _tag: Tag,
  schema: S,
  resultSchema: R,
): QueryConstructor<Tag, S, R> => ({
  _tag,
  schema,
  resultSchema,
  make: (raw) =>
    Schema.decodeUnknown(schema)(raw).pipe(
      Effect.map((payload) => ({
        [QTypeId]: QTypeId,
        _tag,
        payload,
      })),
    ),
  is: (u): u is Query<Tag, Schema.Schema.Type<S>, Schema.Schema.Type<R>> =>
    typeof u === "object" && u !== null && QTypeId in u && (u as any)._tag === _tag,
})

/** Runtime type guard for any query. */
export const isQuery = (u: unknown): u is Query<string, unknown, unknown> =>
  typeof u === "object" && u !== null && QTypeId in u

