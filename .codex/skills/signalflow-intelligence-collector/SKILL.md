---
name: signalflow-intelligence-collector
description: Collect, validate, deduplicate, select, and optionally save SignalFlow's daily AI product intelligence from GitHub Trending, AI media RSS, and AttentionVC/X. Use when Codex needs to run or diagnose the SignalFlow Collector, inspect source health, review today's Top 10, add or disable intelligence sources, change the daily schedule, or save a reviewed public-intelligence snapshot to the SignalFlow Repository.
---

# SignalFlow Intelligence Collector

Operate the repository's deterministic Collector and generate a source-diverse daily technical-intelligence snapshot without fabricating analysis.

## Run workflow

1. Read repository-root `AGENTS.md` and confirm the current branch and dirty worktree.
2. Run `pnpm collector:dry-run` first. Never skip this step, including scheduled runs.
3. Inspect every source result. Treat one failed source as a partial run, not a reason to discard successful sources.
4. Inspect the proposed daily brief and stop before writing when:
   - more than half of enabled sources failed;
   - registry validation failed;
   - output contains obviously malformed URLs or non-AI GitHub results;
   - the user requested preview, diagnosis, or dry-run only.
5. Run `pnpm collector:write` only when the task explicitly authorizes saving today's SignalFlow snapshot or the invoking schedule explicitly requests the daily write run.
6. Report source successes/failures, unique candidates, final selected items, snapshot date, and whether repository data changed.

## Safety rules

- Keep `.env.local` and all credentials out of output and Git.
- Never log access tokens, App Secret, database credentials, or private demand data.
- Use only the sources registered in `src/collector/sources.config.json`.
- Preserve source attribution and original URLs.
- Do not fabricate summaries, scores, engagement, publication times, or product claims.
- Do not turn X engagement or GitHub trending rank into a factual-confidence score.
- Treat `briefingDate` as the Asia/Shanghai collection batch date; preserve the source's separate `publishedAt`.
- Keep today's selection source-diverse: default maximums are four AI-media items, four GitHub items, and two X items before fallback filling.
- Never modify or delete internal-demand records in Feishu from this skill.

## Source maintenance

For an RSS source, add or update one registry entry and use the shared RSS adapter. For a special HTML/API source, add a dedicated adapter and register its dispatch branch. Keep adapters responsible only for fetching and mapping to `RawSignal`; normalization, identity, deduplication, daily selection, and repository writes stay centralized.

Use `/sources` for local source switches and `/tasks` for the owner-only local schedule and manual run controls. Public deployments are read-only. Schedule changes update repository configuration and must be committed before GitHub Actions uses them.

Run targeted tests plus `pnpm lint`, `pnpm typecheck`, and `pnpm test` after source or mapping changes.

## References

- Read [collector-schema.md](references/collector-schema.md) when changing source definitions, daily selection, repository snapshots, or schedule behavior.
- Read `docs/product/intelligence-workspace.md` before changing today's brief or adding domain intelligence.
- Read `docs/references/dailybrief.md` before reusing or substantially adapting DailyBrief code.
