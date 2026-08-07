export type FeishuErrorKind =
  | "authentication"
  | "configuration"
  | "invalid_response"
  | "not_found"
  | "rate_limit"
  | "timeout"
  | "upstream";

export class FeishuError extends Error {
  constructor(
    message: string,
    public readonly kind: FeishuErrorKind,
    public readonly details: { apiCode?: number; httpStatus?: number } = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "FeishuError";
  }
}

export class FeishuConfigurationError extends FeishuError {
  constructor(variableName: string) {
    super(`Missing required server environment variable: ${variableName}`, "configuration");
    this.name = "FeishuConfigurationError";
  }
}
