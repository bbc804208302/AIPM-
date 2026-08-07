# Feishu Adapter Boundary

This directory is server-only infrastructure. It will own tenant token handling, OpenAPI transport, pagination, rate-limit translation and mapping between Bitable records and stable domain types.

React components must never import this directory directly. Application services compose repository implementations; repositories call this adapter.
