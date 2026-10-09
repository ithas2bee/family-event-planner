# Repository-wide Copilot Instructions

Follow the repository-root [`AGENTS.md`](../AGENTS.md) for the required pre-change baseline, post-change checks, mobile runtime verification, final diff review, failure resolution, honest reporting, and completion gate.

Also follow any more specific instructions in the affected project directory, including `FamilyEventPlanner.Api/AGENTS.md` and `FamilyEventPlanner.Api/.github/copilot-instructions.md`. Scoped instructions add project-specific requirements and do not waive the repository-wide verification gate.

Never report a mobile feature as fully verified based only on unit tests: run the applicable compiler/type checks and bundle/start validation, and state any environmental limitations explicitly.
