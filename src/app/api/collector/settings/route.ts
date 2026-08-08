import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { saveCollectorSchedule, setCollectorSourceEnabled } from "@/collector/configuration";
import { isCollectorConfigurationEditable } from "@/collector/runtime";
import type { CollectorTrack } from "@/collector/types";

export const runtime = "nodejs";

function localOnly(): NextResponse | null {
  if (isCollectorConfigurationEditable()) return null;
  return NextResponse.json({ error: "公开环境只展示配置，不允许修改。" }, { status: 403 });
}

export async function POST(request: Request) {
  const blocked = localOnly();
  if (blocked) return blocked;

  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "toggle-source") {
      if (typeof body.sourceId !== "string" || typeof body.enabled !== "boolean") {
        return NextResponse.json({ error: "数据源配置无效。" }, { status: 400 });
      }
      await setCollectorSourceEnabled(body.sourceId, body.enabled);
      revalidatePath("/sources");
      revalidatePath("/tasks");
      revalidatePath("/intelligence");
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update-schedule") {
      const track: CollectorTrack = body.track === "domain" ? "domain" : "technical";
      await saveCollectorSchedule({
        enabled: body.enabled,
        time: body.time,
        timezone: "Asia/Shanghai",
        dailyLimit: body.dailyLimit,
        focusAreas: body.focusAreas,
      }, track);
      revalidatePath("/tasks");
      revalidatePath("/intelligence");
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "未知配置操作。" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "配置保存失败。" }, { status: 400 });
  }
}
