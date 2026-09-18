# Changelog — paid-media-manager

## 2026-08-31 — OpenVid demo-ad request path

**Why:** Recorded product-demo ads should route to video-producer, not stay with paid media.

**Changed**
- Phase 19: `ask_manager` may request `19-paid/openvid/` for recorded demo cutdowns (OpenMontage stays generated film)

## 2026-08-05 — CEO-bar IC upgrade (Phases 18, 19, 22 playbooks)

**Why:** Paid IC needed executable playbooks for funnel craft, shippable creatives, and on-demand Phase 22 diagnosis.

**Changed**
- Spawn / Delegates to: unchanged (`_None_`); Phase 22 peer brief only
- Phase playbooks: Added Phase 18 (funnel + eng ask path), 19 (creatives + verifier gate), 22 (on-demand diagnosis)
- Scorecards / done criteria: ORG-REGISTRY verbatim; Phase 19 hard-gate; photoreal_qa retained
- HEARTBEAT / packs / integrations: HEARTBEAT created; agent template fixed `generation_profile: ad-creative`
- Cursor agent: `templates/org/agents/paid-media-manager.md` aligned

**Checklist:** Role Upgrade Checklist A–G passed (IC variant)
