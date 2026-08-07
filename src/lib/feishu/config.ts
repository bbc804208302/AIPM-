import { FeishuConfigurationError } from "./errors";

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  bitableAppToken: string;
  demandTableId: string;
  intelligenceTableId: string;
  baseUrl: string;
}

type Environment = Readonly<Record<string, string | undefined>>;

function required(environment: Environment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new FeishuConfigurationError(name);
  return value;
}

export function readFeishuConfig(environment: Environment = process.env): FeishuConfig {
  return {
    appId: required(environment, "FEISHU_APP_ID"),
    appSecret: required(environment, "FEISHU_APP_SECRET"),
    bitableAppToken: required(environment, "FEISHU_BITABLE_APP_TOKEN"),
    demandTableId: required(environment, "FEISHU_DEMAND_TABLE_ID"),
    intelligenceTableId: required(environment, "FEISHU_INTELLIGENCE_TABLE_ID"),
    baseUrl: "https://open.feishu.cn/open-apis",
  };
}
