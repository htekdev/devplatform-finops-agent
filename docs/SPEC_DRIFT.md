# Spec Drift Log

Issues discovered during implementation/testing that should be addressed in future specs to prevent recurrence.

---

## SD-001: ESM Test Import Path Resolution

**Discovered:** 2026-02-04  
**PR:** #3  
**Severity:** Build-blocking

### Problem

Tests failed to run due to ESM module resolution. Test files imported source modules using `.js` extensions (correct for ESM runtime) but vitest couldn't resolve them to `.ts` source files.

```
Error: Cannot find module '../../../src/tools/github/actions-billing.js'
```

### Root Causes

1. **Incorrect relative paths** - Tests at `tests/unit/tools/github/` used `../../../src/` (3 levels) but needed `../../../../src/` (4 levels)
2. **Missing vitest ESM configuration** - No `vite-tsconfig-paths` plugin to handle TypeScript path resolution

### Fix Applied

1. Install `vite-tsconfig-paths` dev dependency
2. Update test imports to use correct 4-level relative paths
3. Simplify vitest.config.ts to use the plugin

### Spec Improvements Needed

**Add to testing contract (`specs/*/contracts/testing-strategy.md`):**

```markdown
## ESM Test Configuration Requirements

1. **Path Resolution**: All vitest configs for ESM TypeScript projects MUST include:
   - `vite-tsconfig-paths` plugin for automatic path resolution
   - OR explicit alias configuration for `.js` → `.ts` resolution

2. **Import Path Validation**: Before marking tests complete:
   - Verify relative import paths match actual directory depth
   - Tests at depth N from root require N `../` segments to reach root

3. **Verification Checklist**:
   - [ ] `npm test` runs successfully (not just `npm run build`)
   - [ ] All test files are discovered by test runner
   - [ ] No "Cannot find module" errors
```

**Add to implementation tasks template:**

```markdown
## Test Verification Task (Required)
- [ ] Run `npm test` and confirm all tests execute
- [ ] Verify test count matches expected (not 0 tests)
- [ ] Check for module resolution errors in test output
```

---

## Template for New Entries

```markdown
## SD-XXX: [Brief Title]

**Discovered:** YYYY-MM-DD  
**PR:** #N  
**Severity:** [Build-blocking | Test-blocking | Runtime | Documentation]

### Problem
[What failed and how it manifested]

### Root Causes
[Why the spec/implementation missed this]

### Fix Applied
[What was done to resolve it]

### Spec Improvements Needed
[Specific additions to prevent recurrence]
```
