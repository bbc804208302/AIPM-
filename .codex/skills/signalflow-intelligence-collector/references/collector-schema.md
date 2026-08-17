# Collector schema and operations

## Source groups

- `github-trending`: daily GitHub Trending HTML, filtered by AI product/engineering keywords.
- `ai-media`: official/curated AI media plus product-release feeds, including OpenAI, Google DeepMind, Hugging Face, TLDR AI, Smol AI News, Latent Space, MIT Technology Review AI, Product Hunt AI products, GitHub AI Changelog, and Vercel AI Changelog.
- `x-viral`: AttentionVC public AI leaderboard mapped back to original X posts.

AttentionVC is a third-party public endpoint without a SignalFlow SLA. Schema or availability changes are expected operational failures, not a reason to bypass validation.

Product Hunt uses title-and-description keyword matching because product names often omit the term AI. Official GitHub and Vercel changelogs use title-scoped matching so an incidental Copilot or Agent mention in a long release note does not admit an unrelated update.

## Pipeline contracts

`CollectorSource → RawSignal → IntelligenceCandidate → Daily Top 10 → SignalFlow Repository`

`IntelligenceCandidate.id` is derived from collection date and the canonical-URL SHA-256 fingerprint. Deduplication uses canonical URL/fingerprint in-memory. The saved snapshot is versioned by `track` and Asia/Shanghai `briefingDate`.

Daily selection accepts RSS/X items published within the latest 15 Shanghai calendar days. GitHub Trending is the current live daily ranking and may omit `publishedAt`. Before selection, a persistent seen index containing only public URLs and original titles is checked, including items from an earlier run on the same day; a matching canonical URL or normalized original title is treated as already read and excluded from the new batch.

## Daily snapshot

- `briefingDate`: collection batch date in Asia/Shanghai.
- `publishedAt`: original source time when available; never replace it with the batch date.
- `generatedAt`: Collector completion time.
- `candidateCount`: normalized and curated candidates before daily selection.
- `targetCount`: daily product target, normally 10; it is not a padding requirement.
- `dailyLimit`: hard Agent-candidate cap, normally 20.
- `items`: source-diverse intelligence items; strict deduplication may leave fewer than the target and valid supply may produce between the target and hard cap.
- `sources`: per-source success, collected count, duration, and safe error summary.

Snapshots are stored in `data/intelligence/<track>/<date>.json` plus `<track>-latest.json`. They contain public source metadata only and may be committed for a reproducible portfolio demo.

## Selection baseline

- AI media: maximum 4 before fallback filling, ordered by source publication time.
- GitHub Trending: maximum 4 before fallback filling, ordered by daily rank.
- AttentionVC/X: maximum 2 before fallback filling, ordered by the public endpoint rank.
- Missing groups may be filled by remaining valid candidates so a partial source outage does not automatically empty the brief.

## Schedule baseline

Default daily cadence: 07:00 Asia/Shanghai for AI industry and 07:15 for business-domain collection. A scheduled run must execute collection safety checks before saving. GitHub Actions uses the committed workflow schedule; local controls update repository configuration but do not affect the default branch until committed and merged.
