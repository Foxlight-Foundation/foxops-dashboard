# FoxMemory Event Metrics Fix Plan

Date: 2026-03-05

## Problem
Dashboard charts for memory event mix can remain blank/incorrect when event labels are missing or plugin names differ.

## Confirmed causes
1. Event labels from memory writes are not always explicit (`event` may be absent), producing inflated `NONE`.
2. Plugin log parsing must match both `foxmemory-openclaw-memory` and `foxmemory-plugin-v2`.
3. Stats endpoint dependency drift can break chart source unexpectedly.

## Durable fix strategy
- Treat successful add/write operations with missing event labels as inferred `ADD` fallback.
- Count successful update/delete routes as `UPDATE`/`DELETE` regardless of upstream payload style.
- Keep `/stats` as stable source of truth and make dashboard probe tolerant (`/stats` then `/v2/stats`).
- Keep plugin-log matcher version-agnostic (v1 + v2 ids).

## Verification checklist
- [ ] Perform add -> update -> delete sequence.
- [ ] Confirm `/stats.memoryEvents` changes for all three events.
- [ ] Confirm dashboard event mix chart updates without manual data patching.
- [ ] Confirm plugin log panel shows entries for v2 plugin id.
