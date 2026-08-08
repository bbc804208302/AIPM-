export function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value.map(readText).filter(Boolean).join("、");
  }

  if (value && typeof value === "object") {
    const entry = value as Record<string, unknown>;
    if (typeof entry.text === "string") return entry.text.trim();
    if (typeof entry.name === "string") return entry.name.trim();
  }

  return "";
}

export function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function readBoolean(value: unknown): boolean {
  return value === true;
}

export function readDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const values = value.map(readDisplayValue).filter((entry) => entry !== "—");
    return values.length > 0 ? values.join("、") : "—";
  }
  if (typeof value === "object") {
    const entry = value as Record<string, unknown>;
    for (const key of ["text", "name", "link", "url", "value"]) {
      if (entry[key] !== undefined) return readDisplayValue(entry[key]);
    }
    const values = Object.values(entry).map(readDisplayValue).filter((item) => item !== "—");
    return values.length > 0 ? values.join("、") : "—";
  }
  return "—";
}

export function readDate(value: unknown, fallback?: number): string {
  const candidate = typeof value === "number" || typeof value === "string" ? value : fallback;
  if (candidate === undefined || candidate === "") return new Date(0).toISOString();

  const timestamp = typeof candidate === "number" && candidate < 10_000_000_000
    ? candidate * 1000
    : candidate;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

export function readOptionalDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const candidate = typeof value === "number"
    ? value < 10_000_000_000 ? value * 1000 : value
    : typeof value === "string" ? value : null;
  if (candidate === null) return null;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
