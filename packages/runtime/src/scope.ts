import { ContextFactory, type OperationScope } from "@rta/core"

export const createRuntimeScope = (actorId = "rta-runtime"): OperationScope =>
  new ContextFactory().createExternal({ actorId }).promote("internal", {
    message: "runtime primitive operation",
    code: "RTA_RUNTIME_SCOPE",
  })
