# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo uses a single-context domain docs layout.

- Root context: `CONTEXT.md`
- Architecture decisions: `docs/adr/`
- Backend boundary: `ai-job-backend`
- Frontend boundary: `frontEnd`

`ai-job-backend` and `frontEnd` are separate implementation boundaries in the same Career Investment Copilot product context. Do not create `CONTEXT-MAP.md` unless the repo later splits into multiple independent product contexts.

## Before exploring, read these

- `CONTEXT.md` at the repo root
- Relevant ADRs under `docs/adr/`
- Existing product and implementation docs under `docs/` when they touch the task

If these files do not answer the question, inspect the code directly.

## Use the glossary's vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md`. Avoid inventing synonyms for existing project concepts.

If the concept is missing from the glossary, note the gap for future domain modeling rather than silently creating competing language.

## Flag ADR conflicts

If a proposed change contradicts an existing ADR, surface the conflict explicitly before implementation.
