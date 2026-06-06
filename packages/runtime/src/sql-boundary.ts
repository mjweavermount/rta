import { Effect, Schema } from "effect"
import {
  EdgeBoundaryError,
  EdgeBoundaryTypeId,
  type EdgeBoundary,
  type OperationScope,
  type Reason,
} from "@rta/core"
import { InstrumentedEdgeBoundary, type OperationSummary } from "@rta/strict"
import { createRuntimeScope } from "./scope.js"

export type SqlScalar = string | number | boolean | null | Date

export interface SqlIdentifierPolicy {
  readonly tables: ReadonlyArray<string>
  readonly columns?: Readonly<Record<string, ReadonlyArray<string>>>
  readonly sortDirections?: ReadonlyArray<"asc" | "desc">
}

export interface SqlQueryInput {
  readonly table: string
  readonly columns: ReadonlyArray<string>
  readonly where?: Readonly<Record<string, unknown>>
  readonly orderBy?: {
    readonly column: string
    readonly direction: "asc" | "desc"
  }
  readonly limit?: unknown
}

export interface PreparedSqlQuery {
  readonly sql: string
  readonly params: ReadonlyArray<SqlScalar>
  readonly table: string
  readonly columns: ReadonlyArray<string>
}

const SqlValue = Schema.Union(Schema.String, Schema.Number, Schema.Boolean, Schema.Null, Schema.Date)

export class SqlBoundary
  extends InstrumentedEdgeBoundary<{ readonly input: SqlQueryInput; readonly reason: Reason }, PreparedSqlQuery, EdgeBoundaryError>
  implements EdgeBoundary<SqlQueryInput, PreparedSqlQuery> {
  readonly [EdgeBoundaryTypeId]: typeof EdgeBoundaryTypeId = EdgeBoundaryTypeId
  readonly name: string
  readonly system: string

  constructor(readonly options: {
    readonly name?: string
    readonly policy: SqlIdentifierPolicy
    readonly scope?: OperationScope
  }) {
    super(options.name ?? "SqlBoundary", "sql")
    this.name = options.name ?? "SqlBoundary"
    this.system = "sql"
  }

  parse(
    input: SqlQueryInput,
    reason: Reason,
    scope = this.options.scope ?? createRuntimeScope(this.name),
  ): Effect.Effect<PreparedSqlQuery, EdgeBoundaryError> {
    return this.invoke({ input, reason }, scope)
  }

  protected summarize(input: { readonly input: SqlQueryInput; readonly reason: Reason }): OperationSummary {
    return {
      action: `Prepare SQL query for ${input.input.table}`,
      reason: input.reason.message,
      with: ["prepared statements", "identifier whitelist", "typecasting"],
      input: input.input.table,
      output: "prepared SQL query",
      lineage: ["primitive:edge-boundary", "pattern:sql-boundary"],
      boundary: {
        system: "sql",
        operation: "prepare",
        mode: "read",
      },
    }
  }

  protected execute(input: { readonly input: SqlQueryInput }): Effect.Effect<PreparedSqlQuery, EdgeBoundaryError> {
    return Effect.gen(this, function* () {
      const query = input.input
      const table = yield* this.requireTable(query.table)
      const columns = yield* this.requireColumns(table, query.columns)
      const params: SqlScalar[] = []
      const whereParts: string[] = []

      for (const [column, value] of Object.entries(query.where ?? {})) {
        const safeColumn = yield* this.requireColumn(table, column)
        const safeValue = yield* this.typecastValue(value)
        params.push(safeValue)
        whereParts.push(`${quoteIdentifier(safeColumn)} = ?`)
      }

      const order = query.orderBy
        ? ` ORDER BY ${quoteIdentifier(yield* this.requireColumn(table, query.orderBy.column))} ${yield* this.requireSortDirection(query.orderBy.direction)}`
        : ""
      const limit = query.limit === undefined ? "" : ` LIMIT ${yield* this.typecastLimit(query.limit)}`
      const where = whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : ""
      const sql = `SELECT ${columns.map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(table)}${where}${order}${limit}`

      return {
        sql,
        params,
        table,
        columns,
      }
    })
  }

  private requireTable(table: string): Effect.Effect<string, EdgeBoundaryError> {
    return this.options.policy.tables.includes(table)
      ? Effect.succeed(table)
      : Effect.fail(new EdgeBoundaryError({
        message: "SQL boundary rejected table outside whitelist",
        boundary: this.name,
        cause: { table },
      }))
  }

  private requireColumn(table: string, column: string): Effect.Effect<string, EdgeBoundaryError> {
    const allowed = this.options.policy.columns?.[table]
    return allowed === undefined || allowed.includes(column)
      ? Effect.succeed(column)
      : Effect.fail(new EdgeBoundaryError({
        message: "SQL boundary rejected column outside whitelist",
        boundary: this.name,
        cause: { table, column },
      }))
  }

  private requireColumns(table: string, columns: ReadonlyArray<string>): Effect.Effect<ReadonlyArray<string>, EdgeBoundaryError> {
    return columns.length === 0
      ? Effect.fail(new EdgeBoundaryError({
        message: "SQL boundary requires at least one selected column",
        boundary: this.name,
        cause: { table },
      }))
      : Effect.forEach(columns, (column) => this.requireColumn(table, column))
  }

  private requireSortDirection(direction: "asc" | "desc"): Effect.Effect<"ASC" | "DESC", EdgeBoundaryError> {
    const allowed = this.options.policy.sortDirections ?? ["asc", "desc"]
    return allowed.includes(direction)
      ? Effect.succeed(direction.toUpperCase() as "ASC" | "DESC")
      : Effect.fail(new EdgeBoundaryError({
        message: "SQL boundary rejected sort direction outside whitelist",
        boundary: this.name,
        cause: { direction },
      }))
  }

  private typecastValue(value: unknown): Effect.Effect<SqlScalar, EdgeBoundaryError> {
    return Schema.decodeUnknown(SqlValue)(value).pipe(
      Effect.mapError((cause) => new EdgeBoundaryError({
        message: "SQL boundary rejected non-scalar parameter",
        boundary: this.name,
        cause,
      })),
    )
  }

  private typecastLimit(value: unknown): Effect.Effect<number, EdgeBoundaryError> {
    return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 1000
      ? Effect.succeed(value)
      : Effect.fail(new EdgeBoundaryError({
        message: "SQL boundary rejected invalid limit",
        boundary: this.name,
        cause: { value },
      }))
  }
}

const quoteIdentifier = (identifier: string): string => `"${identifier.replaceAll("\"", "\"\"")}"`
