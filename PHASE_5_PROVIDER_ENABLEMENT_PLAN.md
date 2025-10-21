# Phase 5: Unified Provider Enablement Implementation Plan

## Context & Architectural Decision

**Problem**: Provider toggles existed in UI but disappeared. Need unified enablement controls for ALL providers.

**Providers to Support**:
1. `git-local` - Local git repository events (commits, branches, tags)
2. `github` - GitHub API events (PRs, issues, releases)  
3. `knowledge-events` - Knowledge management events (apply, remove, create)
4. `session-journals` - Agent session journal events

**Key Architectural Principle**: 
Provider enablement is a **data layer concern**, not a presentation concern. Disabled providers should NOT be initialized or invoked at all - this is a performance optimization, not just a filter.

## Current Infrastructure

### Existing Components

**1. ProviderRegistry** (`infrastructure/registries/DataProviderRegistry.ts`)
```typescript
setProviderEnabled(providerId: string, enabled: boolean): void
getEnabledProviders(): IDataProvider[]
getHealthyProviders(): IDataProvider[]
isProviderEnabled(providerId: string): boolean
```

**2. FilterState** (`domains/events/types.ts`)
```typescript
interface FilterState {
  enabledProviders?: string[];  // Array of provider IDs
  // ... other filter fields
}
```

**3. DataOrchestrator Registration** (`visualization/orchestration/DataOrchestrator.ts`)
```typescript
// Current pattern for GitHub:
const githubProvider = new GitHubProvider();
await this.providerRegistry.registerProvider(githubProvider, {
  enabled: false, // Disabled by default
  priority: 2
});
```

**4. Feature Flags** (`infrastructure/config/FeatureFlags.ts`)
```typescript
// Currently used for GitHub only:
const githubEnabled = await featureFlags.isFeatureEnabled(Feature.GITHUB_PROVIDER);
```

## Implementation Plan

### Phase 5.1: VSCode Settings (User Preferences)

**File**: `packages/vscode/package.json`

Add settings for all 4 providers under `contributes.configuration`:

```json
{
  "agentBrain.providers.gitLocal.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable local git repository event provider (commits, branches, tags)"
  },
  "agentBrain.providers.github.enabled": {
    "type": "boolean",
    "default": false,
    "description": "Enable GitHub API event provider (PRs, issues, releases). Requires authentication."
  },
  "agentBrain.providers.knowledgeEvents.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable knowledge management event provider (apply/remove/create knowledge items)"
  },
  "agentBrain.providers.sessionJournals.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable agent session journal event provider"
  }
}
```

**Default States Rationale**:
- `git-local`: **true** - Core functionality, always useful, zero auth required
- `github`: **false** - Requires authentication, optional enhancement
- `knowledge-events`: **true** - New feature we want users to see
- `session-journals`: **true** - New feature we want users to see

### Phase 5.2: DataOrchestrator Updates

**File**: `packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts`

**Current Registration Pattern**:
```typescript
// Inconsistent - some use feature flags, some hardcoded
const gitProvider = new GitProvider();
await this.providerRegistry.registerProvider(gitProvider, {
  enabled: true,  // Hardcoded
  priority: 1
});
```

**New Unified Pattern**:
```typescript
async initialize(): Promise<void> {
  // ... existing code ...
  
  // Get provider settings from config
  const providerSettings = this.getProviderSettings();
  
  // Register git-local provider (conditionally)
  if (providerSettings.gitLocal) {
    const gitProvider = new GitProvider();
    await this.providerRegistry.registerProvider(gitProvider, {
      enabled: true,
      priority: 1
    });
    this.log.info(LogCategory.ORCHESTRATION, 'Git local provider registered');
  }
  
  // Register GitHub provider (conditionally)
  if (providerSettings.github) {
    const githubProvider = new GitHubProvider();
    await this.providerRegistry.registerProvider(githubProvider, {
      enabled: true,
      priority: 2
    });
    this.log.info(LogCategory.ORCHESTRATION, 'GitHub provider registered');
  }
  
  // Register knowledge events provider (conditionally)
  if (providerSettings.knowledgeEvents) {
    const knowledgeProvider = new KnowledgeEventProvider();
    await this.providerRegistry.registerProvider(knowledgeProvider, {
      enabled: true,
      priority: 3,
      settings: { workspaceRoot: this.storagePath }
    });
    this.log.info(LogCategory.ORCHESTRATION, 'Knowledge events provider registered');
  }
  
  // Register session journals provider (conditionally)
  if (providerSettings.sessionJournals) {
    const sessionProvider = new SessionEventProvider();
    await this.providerRegistry.registerProvider(sessionProvider, {
      enabled: true,
      priority: 4,
      settings: { workspaceRoot: this.storagePath }
    });
    this.log.info(LogCategory.ORCHESTRATION, 'Session journals provider registered');
  }
}

/**
 * Get provider enablement settings from VSCode configuration
 * Can be overridden by FilterState (per-repository preferences)
 */
private getProviderSettings(): {
  gitLocal: boolean;
  github: boolean;
  knowledgeEvents: boolean;
  sessionJournals: boolean;
} {
  // Default to VSCode settings
  // Note: In vscode package, this will read from workspace config
  // In core package (for tests), these are passed via options
  const defaults = {
    gitLocal: true,
    github: false,
    knowledgeEvents: true,
    sessionJournals: true
  };
  
  // TODO: Read from VSCode workspace configuration
  // TODO: Check FilterState for per-repository overrides
  
  return defaults;
}
```

### Phase 5.3: FilterState Integration

**File**: `packages/core/src/domains/events/types.ts`

**Existing Field** (already present):
```typescript
interface FilterState {
  enabledProviders?: string[];  // Provider IDs: 'git-local', 'github', etc.
  // ... other fields
}
```

**Usage Pattern**:
1. User changes provider toggles in UI → Updates `FilterState.enabledProviders`
2. `FilterStateManager.saveFilterState()` → Persists to `.agent-brain/filters/{repoPath}.json`
3. On next load → `DataOrchestrator` reads FilterState → Only registers enabled providers

**Per-Repository Override Logic**:
```typescript
private getProviderSettings(): ProviderSettings {
  // 1. Start with VSCode settings (global defaults)
  const vscodeSettings = this.readVSCodeSettings();
  
  // 2. Check FilterState for repository-specific overrides
  const filterState = this.filterStateManager.getFilterState(this.currentRepoPath);
  
  // 3. Merge: FilterState overrides VSCode settings
  if (filterState?.enabledProviders) {
    return {
      gitLocal: filterState.enabledProviders.includes('git-local'),
      github: filterState.enabledProviders.includes('github'),
      knowledgeEvents: filterState.enabledProviders.includes('knowledge-events'),
      sessionJournals: filterState.enabledProviders.includes('session-journals')
    };
  }
  
  return vscodeSettings;
}
```

### Phase 5.4: Timeline Provider Integration

**File**: `packages/vscode/src/providers/timeline-provider-webpack.ts`

**Read VSCode Settings**:
```typescript
private getProviderSettings() {
  const config = vscode.workspace.getConfiguration('agentBrain.providers');
  return {
    gitLocal: config.get<boolean>('gitLocal.enabled', true),
    github: config.get<boolean>('github.enabled', false),
    knowledgeEvents: config.get<boolean>('knowledgeEvents.enabled', true),
    sessionJournals: config.get<boolean>('sessionJournals.enabled', true)
  };
}
```

**Pass to DataOrchestrator**:
```typescript
const orchestrator = new DataOrchestrator({
  cacheTTL: 300000,
  storagePath: this.workspaceRoot,
  providerSettings: this.getProviderSettings()  // NEW
});
```

### Phase 5.5: Configuration UI (Future - Optional)

**Location**: Configuration tab in timeline webview

**Features**:
- Checkboxes for each provider
- Live enable/disable (sends message to extension)
- Shows provider status (enabled, disabled, error)
- Per-repository or global toggle

**Message Protocol**:
```typescript
// Webview → Extension
{
  type: 'config:toggle-provider',
  payload: {
    providerId: 'github',
    enabled: false
  }
}

// Extension → Webview (confirmation)
{
  type: 'config:provider-toggled',
  payload: {
    providerId: 'github',
    enabled: false,
    requiresReload: true  // DataOrchestrator needs re-init
  }
}
```

## Implementation Sequence

### Step 1: Add VSCode Settings (10 min)
- Edit `packages/vscode/package.json`
- Add 4 provider settings under `contributes.configuration`
- Test: `vscode.workspace.getConfiguration('agentBrain.providers')`

### Step 2: Update DataOrchestrator (30 min)
- Add `providerSettings?: ProviderSettings` to `DataOrchestratorOptions`
- Add `getProviderSettings()` method
- Wrap each provider registration in `if (settings.{provider})` check
- Remove old feature flag code for GitHub

### Step 3: Update TimelineProvider (15 min)
- Read VSCode settings in TimelineProvider
- Pass to DataOrchestrator constructor
- Test: Toggle settings, verify providers registered/skipped

### Step 4: FilterState Integration (20 min)
- Update `getProviderSettings()` to check FilterState
- Implement override logic (FilterState > VSCode settings)
- Add helper: `updateProviderEnabled(providerId, enabled)` that updates FilterState

### Step 5: Testing (30 min)
- Test all 4 providers individually enabled/disabled
- Test combinations (only git, git+knowledge, etc.)
- Test per-repository overrides
- Verify disabled providers don't fetch data

### Step 6: Documentation (15 min)
- Update README with provider settings
- Add to CLAUDE.md configuration section
- Document default states

## Verification Checklist

After implementation:

- [ ] VSCode settings added for all 4 providers
- [ ] Default states match plan (git:true, github:false, knowledge:true, sessions:true)
- [ ] DataOrchestrator reads settings on init
- [ ] Disabled providers are NOT registered in ProviderRegistry
- [ ] Disabled providers do NOT fetch data
- [ ] `getEnabledProviders()` returns only enabled providers
- [ ] FilterState can override VSCode settings per-repository
- [ ] Settings changes require timeline reload (or hot-reload implemented)
- [ ] Logging shows which providers were registered/skipped

## Files to Modify

1. **packages/vscode/package.json** - Add settings
2. **packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts** - Add conditional registration
3. **packages/vscode/src/providers/timeline-provider-webpack.ts** - Read settings, pass to orchestrator
4. **packages/core/src/domains/visualization/filters/FilterStateManager.ts** - May need helper methods

## Success Criteria

**Performance**: Disabling a provider means zero initialization cost, zero fetch cost
**Consistency**: All 4 providers use identical enablement logic
**Persistence**: User preferences survive VSCode restart
**Per-Repository**: FilterState can override global settings
**Logging**: Clear indication which providers are active

## Migration Notes

**Breaking Changes**: None - defaults preserve current behavior
**User Impact**: Users gain control over which providers run
**Data Impact**: No data loss - just controls what's fetched

---

**Created**: 2025-10-21
**Status**: Ready for implementation
**Estimated Time**: 2 hours
