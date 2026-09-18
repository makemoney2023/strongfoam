# Changelog — company-orchestrator

## 2026-08-05 — Phase 22 peers + lease rules + HEARTBEAT

**Why:** Follow-up to CEO-bar upgrades — Phase 22 peer paths were seat-local only; parallel lease partitioning undocumented for the dispatcher; orchestrator lacked HEARTBEAT/CHANGELOG.

**Changed**
- Phase 22: Documented deep peer handoff table (`22-peer-head-of-data` / `22-peer-cmo` / `22-peer-paid-media-manager`) + weekly light standup
- Leases: Pointer to COLLABORATION.md parallel IC lease rules; done criteria
- HEARTBEAT / agent: HEARTBEAT added; agent template points at HEARTBEAT + Phase 22 peers
- QA: Wire `validate-ceo-bar-seats.test.sh` into done criteria

**Checklist:** Routing-seat bar (HEARTBEAT + changelog + registry-aligned Phase 22) passed
