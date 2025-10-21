# Provider Toggle UI Controls - User Guide

## Where to Find Provider Controls

The provider toggle controls are located in the **Control Center** → **Configuration** tab.

### Step-by-Step Instructions

1. **Open the Timeline**
   - Click "Show Repository Timeline" from Command Palette (Ctrl+Shift+P)
   - OR use keyboard shortcut: `Ctrl+Shift+T` (Mac: `Cmd+Shift+T`)

2. **Open Control Center**
   - Look for the **"Control Center"** button in the stats bar at the top of the timeline
   - Click it to open the floating Control Center menu

3. **Switch to Configuration Tab**
   - In the floating menu, click the **"Configuration"** tab
   - This tab contains all extension settings

4. **Toggle Data Sources**
   - Under "Data Sources" section, you'll see checkboxes for all 5 providers:

### Available Providers

| Provider | Description | Default |
|----------|-------------|---------|
| **Git - Local repository** | Commits, branches, and tags from local git repository | ✅ Enabled |
| **GitHub API** | Pull requests, issues, and releases from GitHub | ❌ Disabled |
| **Agent-Brain** | Patterns, learnings, and ADRs (legacy intelligence system) | ❌ Disabled |
| **Knowledge Events** | Knowledge apply/remove/create event tracking | ✅ Enabled |
| **Session Journals** | Agent coding session logs | ✅ Enabled |

### How Provider Toggles Work

**Checking a Provider**:
- Enables the provider
- Provider will start fetching events on next timeline refresh
- Events from this provider will appear on the timeline

**Unchecking a Provider**:
- Disables the provider
- Provider will NOT fetch any data
- Events from this provider will NOT appear on the timeline
- This is a **data layer** change (provider not initialized), not just a filter

### UI Locations

```
Timeline View
└── Stats Bar (top)
    └── "Control Center" button
        └── Floating Menu
            ├── Filters Tab (event filtering)
            ├── Configuration Tab ← **PROVIDERS ARE HERE**
            └── Support Tab (help & resources)
```

### Configuration Tab Layout

The Configuration tab has three sections:

**Color Mode**:
- Semantic: Color by event type
- Sync State: Color by sync status (requires Git + GitHub enabled)

**Data Sources** ← **Provider toggles are here**:
- ☑ Git - Local repository
- ☐ GitHub API
- ☐ Agent-Brain
- ☑ Knowledge Events
- ☑ Session Journals

**Reserved**:
- Future configuration options

### Real-Time Updates

Changes to provider settings trigger:
1. **Message to Extension**: `toggleProvider` message sent to backend
2. **Settings Update**: Provider enabled/disabled in DataOrchestrator
3. **Timeline Refresh**: Timeline reloads with new provider configuration
4. **Filter Persistence**: Settings saved to FilterState for session persistence

### Alternative: VSCode Settings

Providers can also be controlled via VSCode settings:

**File** → **Preferences** → **Settings** → Search for "Agent Brain"

Settings:
- `agentBrain.providers.gitLocal.enabled` (default: true)
- `agentBrain.providers.github.enabled` (default: false)
- `agentBrain.providers.knowledgeEvents.enabled` (default: true)
- `agentBrain.providers.sessionJournals.enabled` (default: true)

**Note**: UI toggles override VSCode settings for the current session.

## Implementation Details

### Added in Version 0.2.21

**FilterController.ts** (`packages/core/src/domains/visualization/ui/FilterController.ts`):

**State Variables** (lines 75-79):
```typescript
private gitProviderEnabled: boolean = true;
private githubProviderEnabled: boolean = false;
private intelligenceProviderEnabled: boolean = false;
private knowledgeEventsProviderEnabled: boolean = true;
private sessionJournalsProviderEnabled: boolean = true;
```

**UI Checkboxes** (lines 397-419):
```html
<div class="provider-item">
  <input type="checkbox" id="provider-git">
  <label>Git - Local repository commits, branches, and tags</label>
</div>
<div class="provider-item">
  <input type="checkbox" id="provider-github">
  <label>GitHub API - Pull requests, issues, and releases</label>
</div>
<div class="provider-item">
  <input type="checkbox" id="provider-agent-brain">
  <label>Agent-Brain - Patterns, learnings, and ADRs</label>
</div>
<div class="provider-item">
  <input type="checkbox" id="provider-knowledge-events">
  <label>Knowledge Events - Knowledge apply/remove/create tracking</label>
</div>
<div class="provider-item">
  <input type="checkbox" id="provider-session-journals">
  <label>Session Journals - Agent coding session logs</label>
</div>
```

**Event Listeners** (lines 657-707):
- Knowledge Events checkbox change handler
- Session Journals checkbox change handler

**Restoration** (lines 1468-1499):
- Restores provider states from FilterState on page load
- Syncs checkboxes with saved settings

### Message Protocol

**Webview → Extension**:
```typescript
{
  type: 'toggleProvider',
  providerId: 'knowledge-events' | 'session-journals' | ...,
  enabled: true | false
}
```

**Extension → DataOrchestrator**:
- Updates provider settings
- Triggers timeline refresh
- Only enabled providers are initialized and fetch data

## Testing

### Test Provider Toggles

1. **Open Timeline**: `Ctrl+Shift+T`
2. **Open Control Center**: Click "Control Center" button
3. **Go to Configuration Tab**: Click "Configuration"
4. **Verify All 5 Providers Visible**:
   - ☑ Git (checked)
   - ☐ GitHub (unchecked)
   - ☐ Agent-Brain (unchecked)
   - ☑ Knowledge Events (checked)
   - ☑ Session Journals (checked)

### Test Enable/Disable

**Disable Knowledge Events**:
1. Uncheck "Knowledge Events" checkbox
2. Timeline should refresh
3. Knowledge events (blue squares, gray X's, green stars) should disappear

**Enable Knowledge Events**:
1. Check "Knowledge Events" checkbox again
2. Timeline should refresh
3. Knowledge events should reappear

**Disable Session Journals**:
1. Uncheck "Session Journals" checkbox
2. Session journal events (violet diamonds) should disappear

### Verify Data Layer Behavior

**Check Extension Logs**:
1. Open Output panel: View → Output
2. Select "Agent Brain Platform" from dropdown
3. Look for provider initialization logs:
   ```
   [INFO] Git Local provider registered successfully
   [INFO] Knowledge Event provider registered successfully
   [INFO] Session Event provider registered successfully
   [INFO] GitHub provider disabled by settings
   ```

## Troubleshooting

### Checkboxes Not Appearing

**Problem**: Provider checkboxes don't show up in Configuration tab

**Solution**:
1. Ensure you're using version 0.2.21 or later
2. Reload VSCode window: `Ctrl+Shift+P` → "Reload Window"
3. Check browser console in webview DevTools for errors

### Changes Not Taking Effect

**Problem**: Toggling providers doesn't change timeline events

**Solution**:
1. Check Output panel for errors
2. Click "Refresh Timeline Data" button (🔄 icon)
3. Reload VSCode window if issue persists

### GitHub Checkbox Grayed Out

**Problem**: GitHub checkbox is grayed out or says "requires authentication"

**Solution**:
- GitHub provider requires authentication
- First time enabling, you'll be prompted for GitHub token
- This is expected behavior

---

**Created**: 2025-10-21
**Version**: 0.2.21
**Feature**: Provider Toggle UI Controls
**Location**: Control Center → Configuration Tab
