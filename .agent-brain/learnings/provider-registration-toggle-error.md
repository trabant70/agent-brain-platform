---
title: Provider Must Be Registered Before Toggle
type: learning
scope: project
tags: providers, data-orchestrator, registry, runtime-error
source: github-provider-toggle
author: Agent Session
version: 1
---

# Provider Must Be Registered Before Toggle

## Problem
Error when toggling GitHub provider on: `Provider configuration not found: github`

## Root Cause
DataOrchestrator only registered providers if they were **already enabled** in settings:

```typescript
// BEFORE - Bug
if (this.providerSettings.github) {
  await this.providerRegistry.registerProvider(githubProvider, {
    enabled: true  // Only registered if setting was true
  });
}
```

When user toggled GitHub provider:
1. GitHub disabled by default → Not registered
2. User clicks checkbox → Sends `toggleProvider` message
3. Registry looks for `github` provider → Not found
4. Error: `Provider configuration not found: github`

## Solution
**Always register all providers**, set `enabled` based on settings:

```typescript
// AFTER - Fixed
const githubProvider = new GitHubProvider();
await this.providerRegistry.registerProvider(githubProvider, {
  enabled: this.providerSettings.github,  // Can be true or false
  priority: 2
});
```

Now:
- Provider always registered (configuration exists)
- `enabled` flag controls whether it fetches data
- Toggle updates `enabled` flag (works!)

## Lesson
- **Registration ≠ Enablement**
- Register all plugins/providers at initialization
- Use `enabled` flag for runtime toggles
- Conditional registration breaks runtime toggles

## Pattern
```typescript
// Good: Register all, control with flags
for (const provider of allProviders) {
  registry.register(provider, {
    enabled: settings[provider.id] ?? false
  });
}

// Bad: Conditional registration
if (settings.github) {
  registry.register(githubProvider);
}
```

## Related
- File: `DataOrchestrator.ts` lines 140-152
- File: `DataProviderRegistry.ts` line 136
- Version: 0.2.26
