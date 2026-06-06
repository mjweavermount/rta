const BrandKey: unique symbol = Symbol.for("rta/BrandKey")

export type Brand<Value, Name extends string> = Value & {
  readonly [BrandKey]: Name
}

export type BrandName<T> = T extends { readonly [BrandKey]: infer Name }
  ? Name
  : never

export type BrandedId<Kind extends string, Name extends string = string> =
  Brand<string, `${Kind}:${Name}`>

export type ContextId<Name extends string = string> = BrandedId<"ContextId", Name>
export type PortId<Name extends string = string> = BrandedId<"PortId", Name>
export type AdapterId<Name extends string = string> = BrandedId<"AdapterId", Name>
export type AdapterBindingId<Name extends string = string> = BrandedId<"AdapterBindingId", Name>
export type BoundarySchemaId<Name extends string = string> = BrandedId<"BoundarySchemaId", Name>
export type PublishedLanguageId<Name extends string = string> = BrandedId<"PublishedLanguageId", Name>
export type OperationId<Name extends string = string> = BrandedId<"OperationId", Name>
export type EntrypointId<Name extends string = string> = BrandedId<"EntrypointId", Name>
export type PolicyId<Name extends string = string> = BrandedId<"PolicyId", Name>
export type RuntimeCapabilityId<Name extends string = string> = BrandedId<"RuntimeCapabilityId", Name>
export type DeploymentIntentId<Name extends string = string> = BrandedId<"DeploymentIntentId", Name>
export type ScenarioId<Name extends string = string> = BrandedId<"ScenarioId", Name>
export type RunId<Name extends string = string> = BrandedId<"RunId", Name>
export type TraceId<Name extends string = string> = BrandedId<"TraceId", Name>
export type SpanId<Name extends string = string> = BrandedId<"SpanId", Name>
export type CorrelationId<Name extends string = string> = BrandedId<"CorrelationId", Name>
export type CausationId<Name extends string = string> = BrandedId<"CausationId", Name>
export type ActorId<Name extends string = string> = BrandedId<"ActorId", Name>

const requireNamedString = (kind: string, value: string): void => {
  if (value.trim().length === 0) {
    throw new Error(`${kind} requires a non-empty name`)
  }
}

export const brandedId = <Kind extends string>(kind: Kind) =>
  <const Name extends string>(name: Name): BrandedId<Kind, Name> => {
    requireNamedString(kind, name)
    return name as unknown as BrandedId<Kind, Name>
  }

export const contextId = brandedId("ContextId")
export const portId = brandedId("PortId")
export const adapterId = brandedId("AdapterId")
export const adapterBindingId = brandedId("AdapterBindingId")
export const boundarySchemaId = brandedId("BoundarySchemaId")
export const publishedLanguageId = brandedId("PublishedLanguageId")
export const operationId = brandedId("OperationId")
export const entrypointId = brandedId("EntrypointId")
export const policyId = brandedId("PolicyId")
export const runtimeCapabilityId = brandedId("RuntimeCapabilityId")
export const deploymentIntentId = brandedId("DeploymentIntentId")
export const scenarioId = brandedId("ScenarioId")
export const runId = brandedId("RunId")
export const traceId = brandedId("TraceId")
export const spanId = brandedId("SpanId")
export const correlationId = brandedId("CorrelationId")
export const causationId = brandedId("CausationId")
export const actorId = brandedId("ActorId")

export interface BrandedAdapterFitting<
  PortName extends string = string,
  AdapterName extends string = string,
  InputSchemaName extends string = string,
  OutputSchemaName extends string = string,
> {
  readonly kind: "BrandedAdapterFitting"
  readonly port: PortId<PortName>
  readonly adapter: AdapterId<AdapterName>
  readonly inputSchema: BoundarySchemaId<InputSchemaName>
  readonly outputSchema?: BoundarySchemaId<OutputSchemaName>
}

export const brandedAdapterFitting = <
  const PortName extends string,
  const AdapterName extends string,
  const InputSchemaName extends string,
  const OutputSchemaName extends string = never,
>(options: {
  readonly port: PortId<PortName>
  readonly adapter: AdapterId<AdapterName>
  readonly inputSchema: BoundarySchemaId<InputSchemaName>
  readonly outputSchema?: BoundarySchemaId<OutputSchemaName>
}): BrandedAdapterFitting<PortName, AdapterName, InputSchemaName, OutputSchemaName> => ({
  kind: "BrandedAdapterFitting",
  port: options.port,
  adapter: options.adapter,
  inputSchema: options.inputSchema,
  ...(options.outputSchema === undefined ? {} : { outputSchema: options.outputSchema }),
})
