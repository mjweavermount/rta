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
  try {
    const result = await scenario.run({ runtime, logger, input });
    logger.step({
      runId: runtime.runId,
      step: `scenario.${scenario.name}.complete`,
      input: scenario.name,
      output: result,
    });
    runtime.saveState({ status: "completed", result });
    return result;
  } catch (error) {
    logger.step({
      runId: runtime.runId,
      step: `scenario.${scenario.name}.failed`,
      input: scenario.name,
      output: error.message,
      detail: { name: error.name, stack: error.stack },
    });
    runtime.saveState({ status: "failed", error: { name: error.name, message: error.message } });
    throw error;
  }
}
