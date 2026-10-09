# Repository Agent Guidance

These requirements apply to all work in this repository. Read and follow the more specific instructions in a project's own `AGENTS.md` or Copilot instructions as well; scoped instructions supplement, not replace, this file.

## Verification gate

1. **Before changing code**, inspect the implementation, callers, tests, and repository guidance. Run relevant baseline checks before editing where practical, and record existing failures separately from failures caused by the change.
2. **After changing code**, run the relevant unit/integration tests, syntax and type checks, and build checks. For mobile changes, verify that the app can bundle or start successfully in the available environment, then exercise the affected flow when the environment supports it.
3. **Review the final diff** for unintended changes and verify imports/exports, braces and scope, navigation, API contracts, authorization, and related functionality. Do not use passing source-inspection/unit tests as evidence that code parses, type-checks, bundles, or runs.
4. **Resolve regressions** introduced by the work and rerun affected checks. Do not mark the story fully verified while an agent-introduced regression or required validation failure remains unresolved.
5. **Report honestly**: name the exact checks run and their results. Never claim a check passed unless it completed successfully, and never equate passing unit tests with successful runtime verification.
6. **Report environment limits explicitly**: if a required check cannot run because a dependency, service, device, credential, or other requirement is unavailable, state what could not run and what remains unverified. Do not claim full verification.

For the mobile app, use the checks defined in `FamilyEventPlanner.Mobile/package.json`; `npm test` includes TypeScript/TSX parser regression coverage, `npm run typecheck` runs the TypeScript compiler, and `npm run lint` / `npx expo export --platform web` provide lint and web bundling checks. Run these from `FamilyEventPlanner.Mobile/`.
