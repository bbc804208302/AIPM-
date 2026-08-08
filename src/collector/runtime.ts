/**
 * Vercel runs Next.js route handlers with NODE_ENV=production. In that
 * environment Collector configuration is bundled as static JSON and must
 * remain read-only. Local scripts and `next dev` keep their file-backed flow.
 */
export function isProductionCollectorRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isCollectorConfigurationEditable(): boolean {
  return !isProductionCollectorRuntime();
}
