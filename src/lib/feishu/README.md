# Feishu Adapter Boundary

This directory is server-only infrastructure. It owns validated environment configuration, cached tenant token handling, an injectable OpenAPI transport, pagination and safe error translation.

React components must never import this directory directly. Application services compose repository implementations; repositories call this adapter.

The current slice intentionally stops at typed Bitable records. Mapping records into `Demand` and `IntelligenceSignal` starts only after the two real table schemas are supplied.
