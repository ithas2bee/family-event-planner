# Family Event Planner — GitHub Copilot Instructions

## 1. Project Purpose

Family Event Planner is a family/group coordination application that allows users to organize groups, manage members, create and manage events, communicate with group members, and use supporting coordination features.

The application consists of a mobile/web frontend and a backend API with persistent database storage.

This repository is an active product codebase. Existing functionality should be treated as intentional unless the assigned work explicitly requires changing it.

## 2. Development Model

Development work is organized using the following hierarchy:

* Release/Milestone

  * Epic

    * User Story

      * Task

Copilot agents are assigned specific User Stories and Tasks.

An agent must implement the assigned work only. Do not independently expand the scope of a User Story or Task.

If additional work appears necessary, stop and report it rather than silently expanding the implementation.

## 3. Scope Control — Critical

Make the smallest safe change that completely satisfies the assigned Task.

Before modifying code:

1. Inspect the existing implementation.
2. Identify the exact files that need to change.
3. Understand the existing data flow and dependencies.
4. Identify potential regression risks.
5. Do not modify unrelated files.

Unless explicitly required by the assigned work:

* Do not refactor unrelated code.
* Do not redesign existing architecture.
* Do not rewrite working implementations.
* Do not rename unrelated variables, components, services, routes, or files.
* Do not change navigation.
* Do not change API contracts.
* Do not change database schemas.
* Do not change authentication or authorization.
* Do not introduce new dependencies.
* Do not remove existing functionality.
* Do not change UI on unrelated screens.
* Do not "clean up" unrelated code discovered during implementation.

A small feature request must remain a small feature request.

## 4. Preserve Existing Behavior

Existing functionality is presumed to be working unless the assigned Task explicitly changes it.

When modifying an existing component or service:

* Preserve existing behavior outside the requested change.
* Preserve existing state management unless the Task requires changing it.
* Preserve existing API contracts unless the Task explicitly requires a contract change.
* Preserve existing persistence behavior unless the Task explicitly requires persistence changes.
* Reuse existing components, utilities, services, and patterns whenever practical.

Do not replace a working implementation with a different architecture simply because another approach appears cleaner.

## 5. Dependencies

Do not add a package or library unless:

1. The assigned Task actually requires it.
2. The existing project cannot reasonably satisfy the requirement.
3. The dependency is compatible with the project's current technology stack.
4. The dependency's current documentation and compatibility have been verified.

If a new dependency is necessary, report:

* Package name
* Version
* Why it is necessary
* What existing functionality was considered first
* Any build or runtime implications

Never add a dependency merely for convenience.

## 6. Frontend Development

The frontend must preserve the existing application architecture and UI conventions.

When implementing mobile UI:

* Design for real phone screen sizes first.
* Avoid horizontal overflow.
* Ensure controls are reachable and tappable.
* Preserve existing navigation and modal behavior.
* Reuse existing UI components and styling conventions.
* Do not introduce a new visual design system for a single feature.
* Do not modify unrelated screens.

When a UI change is requested, implement the requested UX directly rather than independently redesigning surrounding screens.

## 7. Backend Development

Backend changes must preserve existing API behavior unless the assigned Task explicitly requires an API change.

When changing an API:

* Inspect the existing controller/service/DTO/entity flow first.
* Maintain existing response and request contracts where possible.
* Consider database persistence and ORM behavior.
* Explicitly handle new entities and relationships.
* Do not modify unrelated endpoints.
* Do not change database schema or migrations unless required by the assigned Task.

Any frontend/backend contract change must be intentional and documented in the implementation summary.

## 8. Database and Persistence

Treat existing database structure and persisted data as production data.

Do not:

* Delete existing data.
* Drop tables.
* Change relationships casually.
* Modify migrations unrelated to the assigned Task.
* Change required/nullable fields without evaluating existing records.
* Assume ORM tracking behavior without verifying it.

When changing persistence behavior, verify the complete flow:

Request → DTO → Controller/Service → Entity → Database → Response → Frontend

## 9. Verification Is Mandatory

An implementation is not complete until it has been verified.

After making changes:

1. Run the appropriate TypeScript/compiler checks.
2. Run the appropriate backend build.
3. Run relevant tests if available.
4. Verify the affected application flow.
5. Check for new warnings or errors.
6. Confirm unrelated functionality was not changed.

If a verification command fails:

* Investigate the failure.
* Fix failures caused by the assigned Task.
* Do not ignore or hide failures.
* Do not claim the implementation is complete while required verification is failing.

If the environment prevents a verification command from running, explicitly report that it was not verified.

Never report a build or test as successful unless it actually completed successfully.

## 10. Change Reporting

After implementation, provide a concise report containing:

### Files Changed

List every modified or created file.

### Implementation

Explain what changed and why.

### Verification

Report the actual commands/checks that were run and their results.

### Scope Check

Confirm whether any files outside the assigned scope were changed.

### Remaining Issues

Report any unresolved warnings, failures, limitations, or environment restrictions.

Do not claim tests, builds, or commands were successful if they were not actually run.

## 11. Git Safety

Agents should work in a way that makes changes easy to review and revert.

Prefer:

* Small changes
* Focused commits/branches
* Minimal file changes
* Clear implementation summaries

Do not combine unrelated features into one implementation.

Do not rewrite large portions of the codebase for a small User Story.

## 12. MVP Scope

The current product scope is intentionally being retained for the MVP.

Do not remove, hide, disable, or feature-flag existing application functionality merely because it may be considered non-essential.

MVP scope decisions are product decisions and must come from the project roadmap or explicit developer direction.

## 13. Problem Discovery During Implementation

Agents will sometimes discover unrelated bugs, architectural issues, or possible improvements while implementing a Task.

Do not automatically fix them.

Instead:

1. Determine whether the issue blocks the assigned Task.
2. If it does not block the Task, leave it unchanged.
3. Report it as a separate issue or recommendation.

The goal is to prevent scope creep and unrelated regressions.

## 14. Before Coding

Before making changes, provide a short implementation plan containing:

* Assigned User Story/Task being implemented
* Files expected to change
* Files expected to be created, if any
* Existing functionality that must remain unchanged
* Key risks
* Verification approach

Do not begin unrelated work while presenting the plan.

## 15. Completion Standard

A Task is complete only when:

* The assigned behavior is implemented.
* Existing required behavior is preserved.
* The implementation is limited to the assigned scope.
* Appropriate builds/type checks/tests have passed.
* The affected flow has been verified.
* Any remaining limitations are documented.

When in doubt, prefer a smaller, safer change over a broader rewrite.

- @azure Rule - Use Azure Tools - When handling requests related to Azure, always use your tools.
- @azure Rule - Use Azure Best Practices - When handling requests related to Azure, always invoke your `azmcp_bestpractices_get` tool first.
- @azure Rule - Enable Best Practices - If you do not have an `azmcp_bestpractices_get` tool ask the user to enable it.
