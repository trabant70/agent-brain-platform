---
id: session-2025-10-17-002
title: Provider Toggle Error Fix - Registration vs Enablement
startTime: 2025-10-17T14:00:00.000Z
endTime: 2025-10-17T15:45:00.000Z
summary: Fixed critical bug where GitHub provider couldn't be toggled on because it wasn't registered when disabled by default.
tags: providers, bug-fix, data-orchestrator
filesModified:
  - packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts
---

# Provider Toggle Error Fix - Registration vs Enablement

## Session Summary
Fixed critical bug where GitHub provider couldn't be toggled on because it wasn't registered when disabled by default.

## Problem
Error: `Provider configuration not found: github`

When user clicked GitHub API checkbox, the toggle failed because:
1. GitHub provider disabled by default in settings
2. DataOrchestrator only registered providers if already enabled
3. No provider configuration to update when user toggled it on

## Root Cause
```typescript
// BEFORE - Conditional Registration
if (this.providerSettings.github) {
  await this.providerRegistry.registerProvider(githubProvider, {
    enabled: true
  });
}
```

## Solution
Always register all providers, use `enabled` flag:

```typescript
// AFTER - Always Register
const githubProvider = new GitHubProvider();
await this.providerRegistry.registerProvider(githubProvider, {
  enabled: this.providerSettings.github,  // Can be true or false
  priority: 2
});
```

## Key Insight
**Registration ≠ Enablement**
- Registration: Add provider to registry (configuration exists)
- Enablement: Control whether provider fetches data (runtime toggle)

## Outcomes
- ✅ GitHub provider toggle now works
- ✅ All providers registered regardless of initial state
- ✅ Runtime toggles function correctly

## Files Modified
- `packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts` (lines 140-152)

## Version
v0.2.25 → v0.2.26

## Knowledge Created
- Learning: Provider Must Be Registered Before Toggle
