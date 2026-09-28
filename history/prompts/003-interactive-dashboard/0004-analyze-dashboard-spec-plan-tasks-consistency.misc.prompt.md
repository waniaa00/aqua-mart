---
id: 0004
title: Analyze dashboard spec plan tasks consistency
stage: misc
date: 2026-09-24
surface: agent
model: claude-sonnet-5
feature: 003-interactive-dashboard
branch: 003-interactive-dashboard
user: waniaa00
command: /sp.analyze
labels: ["dashboard", "analyze", "cross-artifact-review", "read-only", "coverage-gap"]
links:
  spec: specs/003-interactive-dashboard/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - none (read-only analysis; no files modified)
tests:
 - none
---

## Prompt

/sp.analyze (no arguments — the command's own `## User Input` block was
empty). The invocation carried the full `/sp.analyze` command definition
(read-only cross-artifact consistency analysis of `spec.md`/`plan.md`/
`tasks.md` for `003-interactive-dashboard`, gated by
`.specify/memory/constitution.md`); see `.claude/commands/sp.analyze.md`
for the command's own text, not reproduced here since it is command
definition, not user-authored prompt content.

## Response snapshot

Ran `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` (confirmed `tasks.md` present), then read `spec.md`, `plan.md`, and `.specify/memory/constitution.md` in full (`tasks.md` was already in context, authored in this same session). Built a 40-item functional-requirement inventory (FR-001–FR-037, including FR-020a/b/c) and cross-checked it against `tasks.md`'s 111 tasks and `contracts/reused-endpoints-map.md`.

Found 12 findings (2 CRITICAL, 2 HIGH, 5 MEDIUM, 3 LOW), most significantly:
- **FR-014** (admin bulk order actions, e.g. bulk status update with confirmation) — a MUST requirement inside the P1/MVP scope (User Story 3) — has zero task coverage; `DataTable` (T007) doesn't even scope row-selection as a capability, so the gap exists at the foundational-component level too.
- **FR-010** (customer activity feed) has no backing user story in `spec.md`'s 15 stories at all, and consequently zero tasks — a requirement that's structurally orphaned in the spec itself, not just under-tasked.
- Two inconsistencies between `plan.md`'s Project Structure and `tasks.md`: (1) `plan.md` designs customer order/appointment detail as a Drawer on the same list page (matching FR-034's "keeps the surrounding list in view" requirement); `tasks.md` instead built dedicated `/dashboard/orders/:id` and `/dashboard/appointments/:id` page routes. (2) `plan.md` names dedicated `/dashboard/orders` and `/dashboard/appointments` list routes; `tasks.md` never creates them, folding "recent orders"/"upcoming appointment" into the `Dashboard.jsx` overview only.
- SC-001/SC-002/SC-005 (explicit latency thresholds) have no task that actually measures them — only functional correctness is verified by each story's "Live-browser verify" task.
- Smaller items: FR-005's required "review count" is missing from both US1's own acceptance scenarios and `T018`; `T070` leaves its target API file undecided where `plan.md` already commits to `admin_inventory.js`; `reviews.js` (plan.md) vs `admin_reviews.js` (T095) naming drift; the "concurrent order-status update" edge case has no corresponding FR or conflict-detection task; FR-020c's inline-validation requirement is explicit only on 2 of 4 CRUD forms; FR-032's optimistic-UI restraint has no compliance-verification task.

No constitution MUST-principle violations found — `plan.md`'s own 13-row Constitution Check remains accurate; the gaps found are spec-internal (FR-010), spec-to-plan-to-tasks coverage/inconsistency issues, not constitutional ones. Reported the full findings table, a coverage summary (38/40 FRs have >=1 nominally-mapped task, 2 with zero coverage), and offered remediation — did not edit any file per the command's strictly-read-only contract.

## Outcome

- ✅ Impact: Surfaced 2 CRITICAL gaps (FR-014 bulk actions inside MVP scope; FR-010's orphaned activity-feed requirement) and 2 HIGH plan/tasks route-architecture inconsistencies before implementation starts — cheapest point to fix them.
- 🧪 Tests: none (read-only analysis stage; no code or spec files touched).
- 📁 Files: none modified. This PHR is the only file written.
- 🔁 Next prompts: User to decide remediation path — options offered: (a) add missing tasks directly to `tasks.md` for FR-014/FR-010/the route mismatches, (b) amend `spec.md` first if any of these should be descoped instead (e.g., confirm activity feed is out of scope, formally drop it via a spec edit, rather than leaving it a silent orphan), then regenerate affected task phases.
- 🧠 Reflection: The two CRITICAL findings both stem from the same root cause — `tasks.md` was generated against spec.md's 15 user stories, but FR-010 and FR-014 don't fully live inside any single story's Acceptance Scenarios (FR-014 is stated in the FR section but never appears in US3's Acceptance Scenarios; FR-010 has no story at all) — a reminder that FR-to-task traceability needs checking against the full Requirements section, not just each story's own scenarios, even when tasks are organized by story.

## Evaluation notes (flywheel)

- Failure modes observed: `tasks.md` (PHR 0003) was generated by mapping tasks to user stories' Acceptance Scenarios without a separate final pass cross-checking every FR-XXX against task coverage — exactly the gap this `/sp.analyze` pass exists to catch, and it worked as intended.
- Graders run and results (PASS/FAIL): Coverage check — FAIL (2/40 FRs, FR-010 and FR-014, have zero task coverage); Constitution alignment — PASS (no MUST-principle violations); format validation of the report itself — PASS (stable category-prefixed IDs, severity per the command's heuristic, coverage table, metrics block all present).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): Before finalizing any future `tasks.md`, add an explicit "FR-by-FR sweep" step (not just per-story) as the last thing `/sp.tasks` does, before handing off, so this class of gap is caught inline rather than requiring a separate `/sp.analyze` pass to find it.
