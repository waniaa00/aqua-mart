---
id: 0001
title: Update project constitution
stage: constitution
date: 2026-09-12
surface: cli
model: claude-sonnet-5
feature: none
branch: main
user: waniaakram777@gmail.com
command: /sp.constitution
labels: [constitution, initial-ratification]
links:
  spec: none
  ticket: none
  adr: none
  pr: none
files:
  - .specify/memory/constitution.md
tests:
  - none
---

## Prompt

i will build backend later, rightnow i want you read all files and update sp.constitution file for this project

## Response snapshot

Read the repo (README.md, package.json, vite.config.js, src/App.jsx,
src/experience/scene.js, context/data modules, git log) to derive concrete
project facts, then filled `.specify/memory/constitution.md` from the
placeholder template with 5 principles grounded in observed practice:
(I) Frontend-First, Backend-Ready Boundaries — state must flow through the
existing Cart/Currency contexts and data modules so a future backend swap
is a boundary change; (II) Three.js Scene Lifecycle Discipline — every
scene needs an explicit mount/cleanup pair like `mountJellyfishScene`;
(III) Fallback-First for External/Optional Data — currency API and product
photos must degrade to defined fallbacks, not error; (IV) Explainable
Logic Over Black Boxes — Build My Aquarium stays rule-based/traceable;
(V) Honest Prototype Boundaries — no UI implying real payment/auth/backend
while none exists, README's "Known limitations" stays binding. Added
Technology & Structure and Development Workflow sections, and a Governance
section with semver amendment rules. Ratified as v1.0.0 (initial fill),
dated today. Dropped the template's malformed 6th principle slot. No
dependent templates needed edits (plan/spec/tasks templates reference the
constitution generically).

## Outcome

- ✅ Impact: `.specify/memory/constitution.md` now has 5 concrete,
  testable principles plus Technology/Workflow/Governance sections,
  replacing all placeholder tokens; ratified as v1.0.0.
- 🧪 Tests: none (no test suite in this project yet; constitution content
  reviewed for no remaining bracket placeholders and ISO dates).
- 📁 Files: .specify/memory/constitution.md (rewritten),
  history/prompts/constitution/0001-*.md (this PHR).
- 🔁 Next prompts: `/sp.specify` for the backend feature when that work
  starts; amend Principle V and the Technology & Structure section at
  that point (tracked as a TODO in the constitution's Sync Impact
  Report).
- 🧠 Reflection: principles were derived from patterns already consistently
  present in the code (scene cleanup, fallback UI, rule-based recommender)
  rather than aspirational ones, so compliance review should be cheap.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): n/a (manual placeholder-completeness
  check only).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): once a test suite exists,
  add an automated check that fails CI if `.specify/memory/constitution.md`
  still contains `[ALL_CAPS]`-style placeholder tokens.
