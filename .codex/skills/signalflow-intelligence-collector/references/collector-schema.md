# Collector schema and operations

## Source groups

- `github-trending`: daily GitHub Trending HTML, filtered by AI product/engineering keywords.
- `ai-media`: OpenAI, Google DeepMind, Hugging Face, TLDR AI, Smol AI News, Latent Space, and MIT Technology Review AI RSS.
- `x-viral`: AttentionVC public AI leaderboard mapped back to original X posts.

AttentionVC is a third-party public endpoint without a SignalFlow SLA. Schema or availability changes are expected operational failures, not a reason to bypass validation.

## Pipeline contracts

`CollectorSource → RawSignal → IntelligenceCandidate → Daily Top 10 → SignalFlow Repository`

`IntelligenceCandidate.id` is derived from collection date and the canonical-URL SHA-256 fingerprint. Deduplication uses canonical URL/fingerprint in-memory. The saved snapshot is versioned by `track` and Asia/Shanghai `briefingDate`.

## Daily snapshot

- `briefingDate`: collection batch date in Asia/Shanghai.
- `publishedAt`: original source time when available; never replace it with the batch date.
- `generatedAt`: Collector completion time.
- `candidateCount`: normalized and curated candidates before daily selection.
- `items`: default 10 source-diverse technical-intelligence items.
- `sources`: per-source success, collected count, duration, and safe error summary.

Snapshots are stored in `data/intelligence/<track>/<date>.json` plus `<track>-latest.json`. They contain public source metadata only and may be committed for a reproducible portfolio demo.

## Selection baseline

- AI media: maximum 4 before fallback filling, ordered by source publication time.
- GitHub Trending: maximum 4 before fallback filling, ordered by daily rank.
- AttentionVC/X: maximum 2 before fallback filling, ordered by the public endpoint rank.
- Missing groups may be filled by remaining valid candidates so a partial source outage does not automatically empty the brief.

## Schedule baseline

Default daily cadence: 08:17 Asia/Shanghai. A scheduled run must execute collection safety checks before saving. GitHub Actions uses the committed workflow schedule; local controls update repository configuration but do not affect the default branch until committed and merged.
