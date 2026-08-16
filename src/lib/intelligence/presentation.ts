export function presentAsIntelligence(value: string): string {
  return value
    .replaceAll("信号", "情报")
    .replace(/\bSignals?\b/g, "情报")
    .replace(/([\u3400-\u9fff])\s+情报/gu, "$1情报")
    .replace(/情报\s+([\u3400-\u9fff])/gu, "情报$1");
}
