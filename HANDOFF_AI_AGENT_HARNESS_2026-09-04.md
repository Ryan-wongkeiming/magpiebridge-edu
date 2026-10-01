# HANDOFF — AI Agent Harness: Effective Project Setup Workflow

> **Harness Name**: AI Agent Harness: Effective Project Setup Workflow  
> **Version**: 1.0  
> **Date**: 2026-09-04  
> **Status**: Constitution locked, four-file system operational, ready for global reuse  

---

## What This Harness Is

A **minimal, battle-tested four-file system** that keeps AI agents aligned, accountable, and auditable on **any project**. It replaces ad-hoc prompting with a lightweight constitution + living tracker that survives context windows, model switches, and human handoffs.

**Core insight**: Agents drift when they don't have a persistent, structured memory they're forced to read and update. This harness gives them exactly that — four files, five steps, one rule: *no output file + no pickup row = job not done.*

**Proven on**: Nielsen Retail Audit Dashboard (Livewell/a2MC FY2027) — 100+ agent jobs, zero drift, full audit trail.

---

## The Four Canonical Files (Single Source of Truth)

| File | Role | Update Trigger | Audience |
|------|------|----------------|----------|
| **AGENTS.md** | Constitution — rules, source-of-truth map, canonical context, conventions | Project structure changes (new raw file, track, measure, rule) | Every agent at session start |
| **README.md** | Human entry point — 2 sentences + agent bootstrap pointer | Almost never | Humans |
| **context/foundation.md** | Strategic context — decisions, data reality, gaps, open questions | Truth changes (decision locked, question resolved, gap closed) | Humans + agents needing context |
| **agents/plans/PICKUP.md** | **Living tracker** — Now/Done/Next/Blocked + LOG | **After every agent job** (mandatory) | Agents (read/write), Humans (read) |

---

## The Five-Step Protocol (Enforced on Every Job)

> **If step 3 or 5 is omitted, the system decays in a week.**

1. **Read constitution + pickup** → `AGENTS.md` → `agents/plans/PICKUP.md` → `README.md` → `context/foundation.md`
2. **One job** → One named unit of work (not "fix everything")
3. **Output path named** → Physical file under `outputs/` (create folder if missing). *Job not done if only chat.*
4. **Source files protected** → No overwrite of raw data, `00*.md`, `01-05_*`, canonical data files without explicit "regenerate"
5. **Pickup updated** → One LOG row + NOW/DONE moves in `PICKUP.md` + deliverable row in `AGENTS.md` §8

---

## Update Cadence — The Golden Rule

| File | Update Frequency |
|------|------------------|
| **PICKUP.md** | **Every single agent job** (the only daily-updated file) |
| **foundation.md** | When truth changes (decision locked, question resolved, new data, gap closed) |
| **AGENTS.md** | When project constitution changes (structure, rules, canonical context) |
| **README.md** | Almost never |

**Most common failure**: Agents updating all four files every task. **Fix**: Only `PICKUP.md` updates every task.

---

## Quick-Start Kit for a New Project

Copy these four **empty templates** to a new repo, fill in project-specific parts:

```
new-project/
├── AGENTS.md              # Constitution template (keep §2, §4, §5, §7, §8)
├── README.md              # 2-sentence + agent pointer template
├── context/
│   └── foundation.md      # Foundation template (keep all section headers)
└── agents/
    └── plans/
        └── PICKUP.md      # Tracker template (keep table headers + protocol header)
```

### The Only Truly Portable Content (Copy Verbatim)

1. **AGENTS.md §2** — 5 Universal Agent Rules
2. **AGENTS.md §4** — Five-Step Protocol + Working Conventions
3. **AGENTS.md §5** — Verification Protocol + Output Format
4. **PICKUP.md header** — Format rule + five-step reminder
5. **README.md pattern** — "2 sentences + AGENTS.md + PICKUP.md"

---

## How to Operate (Human Cheat Sheet)

```
NEW SESSION START:
  1. Agent reads: AGENTS.md → PICKUP.md → README.md → foundation.md
  2. You assign: "One job: [task]. Output: outputs/JOB_NAME_DATE.md"
  3. Agent works → produces outputs/JOB_NAME_DATE.md
  4. Agent updates: PICKUP.md (LOG + NOW/DONE) + AGENTS.md §8 (if deliverable)
  5. You verify: file exists in outputs/ + PICKUP.md has LOG row
```

**Audit checklist after every job:**
- [ ] Named file in `outputs/`
- [ ] LOG row in `PICKUP.md` with Date/Agent/Action
- [ ] NOW → DONE moves in `PICKUP.md`
- [ ] Deliverable row in `AGENTS.md` §8 (if user-visible)

---

## What the Reference Project Proved

The Nielsen Retail Audit Dashboard validated the harness:
- **4 files** replaced 50+ scattered docs and ad-hoc prompts
- **100+ agent jobs** tracked with zero drift (PICKUP.md has full history)
- **5 universal rules** prevented hallucinated numbers, source overwrites, root litter
- **Five-step protocol** forced named outputs and pickup updates every time
- **Templates extracted** for instant reuse on next project

---

## Files in This Handoff Package

| File | Location | Purpose |
|------|----------|---------|
| `AGENTS.md` | Project root | Constitution (portable template + project context) |
| `README.md` | Project root | Human entry point |
| `context/foundation.md` | `context/` | Strategic context template + project decisions |
| `agents/plans/PICKUP.md` | `agents/plans/` | Living tracker template + full job history |
| `outputs/` | `outputs/` | All named job outputs (audit trail) |

---

## Next Project: Just Copy the Templates

1. Copy the four template files to new repo
2. Fill in project-specific content in each
3. First agent job: "Read AGENTS.md + PICKUP.md, then [task]. Output: outputs/FIRST_JOB.md"
4. System runs itself from there.

---

*End of handoff. This harness is a standalone, globally reusable asset — not tied to any specific project, portable to any AI-assisted project.*