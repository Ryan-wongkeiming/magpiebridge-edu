# Initial Project Setup — MagpieBridge-Edu

> **Date**: 2026-09-22  
> **Job**: Start initial project foundation  
> **Output path**: `outputs/INITIAL_PROJECT_SETUP_2026-09-22.md`

---

## 1. Summary

Created the initial MagpieBridge-Edu project foundation using the user-supplied AI Agent Harness operating model.

This setup intentionally starts with the project constitution, foundation context, and living tracker before application code, so later implementation work has clear scope, auditability, and handoff continuity.

---

## 2. Files Created

| File | Purpose |
|---|---|
| `AGENTS.md` | Project constitution, source-of-truth map, agent rules, product baseline, deliverable registry |
| `README.md` | Human entry point and agent bootstrap instructions |
| `context/foundation.md` | Strategic product context, assumptions, MVP scope, open questions, early decisions |
| `agents/plans/PICKUP.md` | Living tracker with NOW/DONE/NEXT/BLOCKED and LOG sections |
| `outputs/INITIAL_PROJECT_SETUP_2026-09-22.md` | This setup report and durable job output |

---

## 3. Initial Product Direction

MagpieBridge-Edu is positioned as an internal learning and certification platform for organizational education.

The first MVP should prove this loop:

1. Instructor/admin creates a course.
2. Course contains modules and lessons.
3. Learner enrolls.
4. Learner completes lessons.
5. Learner takes a quiz or final assessment.
6. Platform records progress and completion.
7. Certificate or completion record is generated.

---

## 4. Initial Decisions

| Decision | Reason |
|---|---|
| Use the four-file harness | Matches the supplied project SOP/policy and keeps AI work auditable. |
| Create foundation before app code | Avoids premature scaffold before stack, auth, and MVP scope are confirmed. |
| Use `outputs/` for job deliverables | Preserves an audit trail for future agents and humans. |

---

## 5. Open Questions Before Code Scaffold

1. Preferred stack: Next.js full-stack, separate frontend/backend, or another stack?
2. Authentication: local login first, Microsoft Entra ID/Azure AD, Google Workspace, LDAP, or other?
3. Database: PostgreSQL acceptable?
4. Storage: local dev storage first, S3-compatible, Azure Blob, Google Cloud Storage, or internal storage?
5. Deployment target: local only, Docker, internal server, Azure, AWS, GCP, or other?
6. Certificate format: PDF download, database completion record, or both?

---

## 6. Recommended Next Job

Recommended next job:

> Write `outputs/MVP_REQUIREMENTS_2026-09-22.md` covering MVP user roles, core workflows, functional requirements, non-functional requirements, and a recommended implementation roadmap.

After that, choose the stack and scaffold application code.
