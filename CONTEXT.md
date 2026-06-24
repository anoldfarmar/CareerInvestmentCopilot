# Career Investment Copilot Context

This file records the shared domain language for the Career Investment Copilot project.

## Product Context

Career Investment Copilot is a job-search and interview-preparation product. The current repo contains the backend and the new frontend for the same product context.

## Implementation Boundaries

- `ai-job-backend`: NestJS backend. Owns authentication, profiles, resumes, job management, job recommendations, interview sessions, interview knowledge bases, reports, activity summaries, Prisma schema, and database migrations.
- `frontEnd`: React/Vite frontend. Owns the user-facing application views and calls the backend APIs.
- `docs`: Product, API, deployment, database, and implementation documentation.

## Core Domain Terms

| Term | Meaning |
| --- | --- |
| User | A logged-in account that owns resumes, jobs, interview sessions, knowledge bases, reports, and activity records. |
| Profile | The user's job-search settings and interview preferences. |
| Resume | A user's resume, including original content, uploaded file metadata, structured content, optimized content, draft content, finalized content, and JD match results. |
| Job | A saved target position or JD. In the current backend, job details and application status live in the same `Job` model. |
| Job recommendation | A generated list of suggested jobs based on user profile, resume, and search criteria. |
| Interview session | A mock interview conversation, including questions, messages, feedback, and optional resume/JD context. |
| Interview knowledge base | A user-owned collection of real interview records used for review and interview preparation. |
| Real interview record | A manual or audio-backed record of a real interview, including transcript, ASR metadata, structured content, and chunks. |
| Review report | A generated interview review report with score, dimensions, question feedback, next actions, and summary fields. |
| Daily activity | Per-user daily counts for applications, audio uploads, and mock interviews. |

## Current Architectural Notes

- The project currently uses a single product context rather than separate frontend/backend domain contexts.
- The Prisma schema in `ai-job-backend/prisma/schema.prisma` is the source of truth for backend database models.
- The new frontend is `frontEnd`; `front_pages` is the old frontend and should not be treated as the active frontend unless explicitly requested.
- Backend APIs should be adapted from the frontend side when possible unless the user asks to change backend behavior.
