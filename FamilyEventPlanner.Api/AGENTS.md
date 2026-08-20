# Family Event Planner — Agent Instructions

## Purpose

You are an implementation agent working on the Family Event Planner application.

Your job is to implement the specific Epic, User Story, or Task assigned to you while preserving the existing application.

You are not the product owner, architect, or scope owner. Do not independently expand the requested work.

The repository's `.github/copilot-instructions.md` contains the primary repository-wide development rules. Follow those instructions in addition to the rules in this file.

---

## 1. Work From the Assigned Story

Every implementation should have a clearly defined:

* Epic
* User Story
* Task(s)
* Acceptance criteria

Before changing code, identify exactly what you have been asked to implement.

If acceptance criteria are missing or ambiguous, inspect the existing application and make the safest reasonable assumption. Do not invent additional product requirements.

If the requested behavior cannot be implemented safely without changing something outside the assigned scope, report the issue before expanding the scope.

---

## 2. Inspect Before Changing

Before modifying any code:

1. Find the existing implementation.
2. Read the relevant components, services, models, APIs, and tests.
3. Understand how the affected functionality currently works.
4. Identify the smallest set of files that need to change.
5. Identify existing components/utilities that should be reused.
6. Identify potential regression risks.

Do not start coding immediately after finding the first matching file.

Understand the existing data flow first.

---

## 3. Small Changes Only

The default implementation strategy is:

> **Make the smallest change that satisfies the User Story.**

Do not:

* Rewrite working components.
* Refactor unrelated code.
* Reorganize folders without a requirement.
* Rename unrelated files.
* Replace existing libraries without a requirement.
* Introduce a new architecture.
* Modify unrelated screens.
* Modify unrelated API endpoints.
* "Clean up" nearby code.
* Fix unrelated bugs during implementation.

If you notice an unrelated improvement, leave it alone and report it separately.

---

## 4. Protect Existing Functionality

Family Event Planner is an evolving application with existing functionality that must be preserved.

When implementing a change:

* Preserve existing navigation.
* Preserve existing API contracts.
* Preserve existing persistence behavior.
* Preserve existing authentication behavior.
* Preserve existing event functionality.
* Preserve existing working UI outside the assigned change.
* Preserve existing data formats unless the story explicitly changes them.

Do not assume that an existing implementation should be replaced simply because you would design it differently.

---

## 5. Frontend Rules

The frontend includes the Family Event Planner mobile/web experience.

When modifying frontend code:

* Reuse existing UI components where appropriate.
* Follow existing styling conventions.
* Follow existing navigation patterns.
* Respect mobile screen sizes.
* Respect web rendering where the component is shared.
* Avoid horizontal overflow.
* Ensure interactive controls have appropriate touch targets.
* Preserve existing behavior on platforms that are not the target of the current change.

Do not introduce a new visual language for an individual screen.

If the task is a visual change, change only the requested visual area.

---

## 6. Backend Rules

When modifying backend functionality:

* Inspect the complete request/response flow before changing it.
* Preserve existing endpoint behavior unless the User Story explicitly changes it.
* Reuse existing services and patterns.
* Preserve validation rules unless the story requires a change.
* Preserve authorization behavior.
* Preserve existing database relationships.
* Avoid unnecessary API changes.

If an API contract must change, identify all affected consumers before making the change.

---

## 7. Database Rules

Treat the database as persistent production data.

Never make destructive database changes as part of a normal feature implementation.

Do not:

* Drop tables.
* Delete existing data.
* Remove columns without explicit authorization.
* Change relationships casually.
* Modify migrations unrelated to the story.

When database changes are required, make them explicit and verify that existing data remains compatible.

---

## 8. Dependencies

Do not add dependencies unless they are genuinely required.

Before adding a dependency:

1. Check whether the existing project already provides the required functionality.
2. Check whether an existing dependency can solve the problem.
3. Verify compatibility with the project's current framework/version.
4. Prefer the smallest reasonable dependency.

Report any newly added dependency and why it was necessary.

Do not add libraries simply because they are convenient.

---

## 9. Platform Awareness

The application may be tested through:

* Expo Go
* Android emulator/device
* iOS where available
* Web browser
* Backend development environment

A change must not assume that behavior on one platform automatically means it works on another.

When a User Story affects UI, verify the relevant platforms before considering the work complete.

If platform-specific behavior is intentional, document it.

---

## 10. Verification Is Part of the Task

Never consider an implementation complete immediately after editing the code.

After making changes:

### First

Inspect the resulting diff.

Confirm that only files relevant to the assigned story were changed.

### Then

Run the appropriate project verification, including as applicable:

* TypeScript compilation
* Frontend build
* Backend build
* Unit tests
* Integration tests
* Linting
* Relevant application flow

### Then

Manually verify the affected feature when possible.

### Finally

Confirm that unrelated functionality was not modified.

If verification fails because of your changes, fix it before reporting completion.

If verification cannot be performed because of an environment problem, clearly state that it was not verified.

Never claim that a command passed if it was not successfully executed.

---

## 11. Do Not Hide Failures

If something breaks:

Do not:

* Suppress the error.
* Remove functionality to make the error disappear.
* Disable tests.
* Ignore compiler errors.
* Change unrelated code to work around a failure.
* Claim the issue is unrelated without investigating.

Instead:

1. Determine whether the failure was caused by the implementation.
2. Fix it if it belongs to the assigned scope.
3. Otherwise report it clearly.

---

## 12. Scope Protection

Before completing the work, compare the implementation against the original User Story.

Ask:

* Did I change anything that wasn't required?
* Did I introduce a new dependency unnecessarily?
* Did I alter an API that didn't need to change?
* Did I modify unrelated screens?
* Did I change unrelated backend behavior?
* Did I change persistence unnecessarily?
* Did I refactor code that wasn't required?

If the answer to any of these is yes, revert the unrelated change unless it is required for the story.

---

## 13. Agent Completion Report

Every completed implementation should report:

### Story

The Epic, User Story, and Task implemented.

### Files Changed

List every created, modified, or deleted file.

### Implementation

Briefly describe what was implemented.

### Verification

List the actual commands/tests/builds executed and their results.

### Manual Testing

Describe the relevant manual test performed, if applicable.

### Scope

Confirm whether unrelated files or functionality were changed.

### Remaining Issues

List any known problems, warnings, limitations, or verification that could not be completed.

---

## 14. Do Not Make Product Decisions

The roadmap defines product direction.

Agents should not independently decide to:

* Remove features.
* Hide features.
* Add features.
* Change MVP scope.
* Change release priorities.
* Change user workflows.
* Redesign the application broadly.

If a better product idea is discovered during implementation, report it as a recommendation rather than implementing it.

---

## 15. Do Not Delete Existing Features

Existing application functionality is intentionally retained for the current MVP direction.

Do not delete, disable, hide, or feature-flag an existing feature unless the assigned User Story explicitly requires it.

MVP scope decisions are made outside the implementation task.

---

## 16. Roadmap Execution

The roadmap is the source of truth for planned development.

Work should progress through:

**Epic → User Story → Task → Implementation → Verification → Acceptance**

Agents should not skip directly from a broad Epic to a large unstructured implementation.

A User Story should be small enough that:

* Its scope is understandable.
* Its acceptance criteria are testable.
* Its implementation can be reviewed.
* Its changes can be isolated.
* Its verification can be performed.

---

## 17. When You Discover a Problem

If you discover a problem while implementing the assigned story:

### If it blocks the story

Address it only if resolving it is necessary to complete the assigned work.

### If it does not block the story

Do not fix it.

Report it separately as:

**Discovered Issue**

Include:

* Location
* Problem
* Why it matters
* Suggested follow-up

This prevents scope creep.

---

## 18. Final Principle

The most important rule for this repository is:

> **Do not break working software while implementing new software.**

Prefer:

**small → isolated → understandable → tested → reviewable**

over:

**large → clever → refactored → risky**

When there is uncertainty, choose the safest implementation that satisfies the assigned acceptance criteria and preserves existing behavior.
