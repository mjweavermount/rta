export function scenario(name, fn) {
  return { name, run: fn };
}

export async function runScenario({ scenario, runtime, logger, input }) {
  logger.step({
    runId: runtime.runId,
    step: `scenario.${scenario.name}.start`,
    input: input ?? {},
    output: "starting",
  });
  const result = await scenario.run({ runtime, logger, input });
  logger.step({
    runId: runtime.runId,
    step: `scenario.${scenario.name}.complete`,
    input: scenario.name,
    output: result,
  });
  runtime.saveState({ status: "completed", result });
  return result;
}
