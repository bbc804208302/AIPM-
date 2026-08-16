export function isProductionAgentRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isOpportunityAgentExecutable(): boolean {
  return !isProductionAgentRuntime();
}
