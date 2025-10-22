# I18N Implementation - Exact Next Steps

## Step 3: Update package.json (30 minutes)

### Current package.json needs these changes:

```json
{
  "displayName": "%displayName%",
  "description": "%description%",
  "commands": [
    {
      "command": "repoTimeline.showTimeline",
      "title": "%command.showTimeline%",
      "category": "Timeline"
    },
    {
      "command": "repoTimeline.refreshData",
      "title": "%command.refreshData%",
      "category": "Timeline"
    }
  ],
  "viewsContainers": {
    "activitybar": [
      {
        "id": "repoTimelineActivityBar",
        "title": "%viewContainer.activitybar.title%",
        "icon": "images/timeline_small.svg"
      }
    ],
    "panel": [
      {
        "id": "repoTimelinePanel",
        "title": "%viewContainer.panel.title%",
        "icon": "images/timeline_small.svg"
      }
    ]
  },
  "views": {
    "repoTimelineActivityBar": [
      {
        "id": "repoTimeline.welcomeView",
        "name": "%view.welcome.name%",
        "type": "webview"
      }
    ],
    "repoTimelinePanel": [
      {
        "id": "repoTimeline.evolutionView",
        "name": "%view.evolution.name%",
        "type": "webview"
      }
    ]
  },
  "configuration": {
    "title": "%config.title%",
    "properties": {
      "agentBrain.logging.pathwayMode": {
        "description": "%config.logging.pathwayMode.description%"
      }
      // ... update all config descriptions
    }
  }
}
```

---

## Step 4: Update extension.ts (1 hour)

### Add at top of file:
```typescript
import * as nls from 'vscode-nls';

// Initialize localization
const localize = nls.loadMessageBundle();
```

### Replace hardcoded strings:
```typescript
// OLD:
vscode.window.showInformationMessage('Timeline data refreshed successfully');

// NEW:
vscode.window.showInformationMessage(
  localize('message.timeline.refreshed', 'Timeline data refreshed successfully')
);
```

---

## Step 5: Create Webview i18n Utility (2 hours)

### File: `packages/core/src/domains/visualization/webview/i18n.ts`

```typescript
/**
 * Webview Internationalization Utility
 *
 * Loads locale strings based on VSCode's display language
 */

let currentLocale = 'en';
let translations: Record<string, string> = {};

/**
 * Initialize i18n with locale from extension
 */
export function initI18n(locale: string, strings: Record<string, string>): void {
    currentLocale = locale;
    translations = strings;
}

/**
 * Get current locale
 */
export function getLocale(): string {
    return currentLocale;
}

/**
 * Translate a key
 * @param key Translation key
 * @param defaultValue Fallback value (optional)
 */
export function t(key: string, defaultValue?: string): string {
    return translations[key] || defaultValue || key;
}

/**
 * Translate with parameters
 * @param key Translation key
 * @param params Parameters to substitute
 */
export function tf(key: string, params: Record<string, any>): string {
    let text = translations[key] || key;

    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });

    return text;
}
```

---

## Step 6: Create Bundle Files (3-4 hours)

### File: `l10n/bundle.l10n.json` (English base)

```json
{
  "tab.timeline": "AB Timeline",
  "tab.knowledge": "AB Knowledge",
  "tab.sessions": "AB Sessions",
  "tab.support": "AB Support",

  "stats.visibleEvents": "Visible Events:",
  "stats.totalEvents": "Total Events:",
  "stats.contributors": "Contributors:",
  "stats.activeBranches": "Active Branches:",
  "stats.window": "Window:",
  "stats.velocity": "Velocity:",

  "button.legend": "Legend",
  "button.controls": "Controls",
  "button.refresh": "Refresh",
  "button.addItem": "+ Add Item",
  "button.import": "📥 Import",
  "button.export": "📤 Export",
  "button.saveTemplate": "💾 Save Template",
  "button.applyTemplate": "📋 Apply Template",
  "button.applySelected": "➕ Apply Selected Items",

  "knowledge.type.adr": "Architecture Decision Record",
  "knowledge.type.antiPattern": "Anti-Pattern",
  "knowledge.type.apiSpec": "API Specification",
  "knowledge.type.bestPractice": "Best Practice",
  "knowledge.type.goldenPath": "Golden Path",
  "knowledge.type.learning": "Learning",
  "knowledge.type.pattern": "Design Pattern",
  "knowledge.type.snippet": "Code Snippet",
  "knowledge.type.standard": "Standard",

  "knowledge.scope.personal": "Personal",
  "knowledge.scope.team": "Team",
  "knowledge.scope.project": "Project",
  "knowledge.scope.organization": "Organization",
  "knowledge.scope.public": "Public",

  "event.type.commit": "Commit",
  "event.type.branch": "Branch",
  "event.type.merge": "Merge",
  "event.type.tag": "Tag",
  "event.type.release": "Release",
  "event.type.pr": "Pull Request",
  "event.type.knowledge": "Knowledge",
  "event.type.session": "Session",

  "search.placeholder": "Search knowledge items...",
  "sessions.search.placeholder": "Search sessions by title, summary, or topics...",

  "empty.knowledge": "No knowledge items found",
  "empty.sessions": "No session journals found",

  "column.type": "Type",
  "column.title": "Title",
  "column.scope": "Scope",
  "column.tags": "Tags",
  "column.source": "Source",
  "column.actions": "Actions",
  "column.date": "Date",
  "column.duration": "Duration",
  "column.topics": "Topics",
  "column.files": "Files",
  "column.summary": "Summary",

  "groupBy.label": "Group by:",
  "groupBy.type": "Type",
  "groupBy.scope": "Scope",
  "groupBy.tag": "Tag",

  "status.ready": "Ready",
  "status.loading": "Loading...",
  "status.itemCount": "{count} items",
  "status.sessionCount": "{count} sessions"
}
```

### Then create translated versions:
- `bundle.l10n.de.json` (German)
- `bundle.l10n.es.json` (Spanish)
- `bundle.l10n.zh-cn.json` (Chinese)
- `bundle.l10n.fr.json` (French)

---

## Step 7: Update TimelineProvider to Pass Locale (30 minutes)

### In `timeline-provider-webpack.ts`:

```typescript
// Detect VSCode language
const locale = vscode.env.language || 'en';

// Load appropriate bundle file
const bundlePath = vscode.Uri.joinPath(
  this.extensionUri,
  'l10n',
  `bundle.l10n.${locale}.json`
);

let translations = {};
try {
  const content = await vscode.workspace.fs.readFile(bundlePath);
  translations = JSON.parse(content.toString());
} catch {
  // Fallback to English
  const enPath = vscode.Uri.joinPath(this.extensionUri, 'l10n', 'bundle.l10n.json');
  const enContent = await vscode.workspace.fs.readFile(enPath);
  translations = JSON.parse(enContent.toString());
}

// Send to webview
webviewView.webview.postMessage({
  type: 'i18n:init',
  payload: { locale, translations }
});
```

---

## Step 8: Update Webview main.ts (1 hour)

### In `packages/core/src/domains/visualization/webview/main.ts`:

```typescript
import { initI18n, t } from './i18n';

// Listen for i18n initialization
window.addEventListener('message', event => {
  const message = event.data;

  switch (message.type) {
    case 'i18n:init':
      initI18n(message.payload.locale, message.payload.translations);
      updateUIWithTranslations();
      break;
  }
});

function updateUIWithTranslations(): void {
  // Update tab labels
  document.querySelector('[data-tab="timeline"]')!.textContent = t('tab.timeline');
  document.querySelector('[data-tab="knowledge"]')!.textContent = t('tab.knowledge');

  // Update buttons
  document.getElementById('legend-trigger')!.textContent = t('button.legend');
  document.getElementById('controls-trigger')!.textContent = t('button.controls');

  // ... update all UI elements
}
```

---

## Step 9: Update Knowledge Types (1 hour)

### In `packages/core/src/domains/knowledge/types.ts`:

```typescript
import { t } from '../visualization/webview/i18n';

export function getKnowledgeTypeLabel(type: KnowledgeType): string {
  const labelKeys: Record<KnowledgeType, string> = {
    [KnowledgeType.ADR]: 'knowledge.type.adr',
    [KnowledgeType.ANTI_PATTERN]: 'knowledge.type.antiPattern',
    [KnowledgeType.GOLDEN_PATH]: 'knowledge.type.goldenPath',
    // ... all types
  };

  return t(labelKeys[type]);
}

export function getKnowledgeScopeLabel(scope: KnowledgeScope): string {
  const labelKeys: Record<KnowledgeScope, string> = {
    [KnowledgeScope.PERSONAL]: 'knowledge.scope.personal',
    [KnowledgeScope.TEAM]: 'knowledge.scope.team',
    // ... all scopes
  };

  return t(labelKeys[scope]);
}
```

---

## Step 10: Test & Iterate (3-4 hours)

### Testing Checklist:

1. **Test Each Language:**
   ```
   - Set VSCode to German → Verify all German strings appear
   - Set VSCode to Spanish → Verify all Spanish strings appear
   - Set VSCode to Chinese → Verify all Chinese characters render
   - Set VSCode to French → Verify all French strings appear
   - Set VSCode to English → Verify baseline
   ```

2. **Test UI Layout:**
   - Check that longer German strings don't break layout
   - Verify buttons still fit
   - Check that column headers align properly
   - Test modal dialogs with longer text

3. **Test Fallback:**
   - Set VSCode to unsupported language (e.g., Italian)
   - Verify extension falls back to English

4. **Test Dynamic Content:**
   - Create knowledge items → verify type labels are translated
   - Switch language → verify UI updates (may need reload)
   - Test search placeholders in each language

---

## Priority Order for Implementation:

1. ✅ **Package.json** (most visible, easiest)
2. ✅ **Timeline tab** (most used feature)
3. ✅ **Knowledge tab** (core feature)
4. ✅ **Sessions tab** (growing feature)
5. ✅ **Extension messages** (error/success notifications)
6. ✅ **Modal dialogs**
7. ✅ **Tooltips and help text**

---

## Quick Win Strategy:

**Phase 1 (Day 1): Get it working**
- Update package.json with %keys%
- Create bundle.l10n.json files
- Pass locale to webview
- Translate just the tab names and main buttons

**Phase 2 (Day 2): Core features**
- Translate statistics bar
- Translate knowledge table
- Translate sessions table

**Phase 3 (Day 3): Polish**
- Translate all tooltips
- Translate modal dialogs
- Fix any layout issues
- Test thoroughly

---

## Common Pitfalls to Avoid:

1. ❌ **Don't** forget to escape special characters in JSON
2. ❌ **Don't** hardcode strings in HTML templates
3. ❌ **Don't** assume all languages have same string length
4. ❌ **Don't** translate code examples or technical terms
5. ✅ **Do** test with actual native speakers if possible
6. ✅ **Do** keep emoji icons (they're universal)
7. ✅ **Do** maintain consistent terminology across languages

---

## File Checklist:

- [x] package.nls.json (5 files)
- [ ] package.json (updated with %keys%)
- [ ] l10n/bundle.l10n.json (5 files)
- [ ] webview/i18n.ts (new file)
- [ ] extension.ts (add vscode-nls)
- [ ] timeline-provider-webpack.ts (pass locale)
- [ ] main.ts (initialize i18n)
- [ ] knowledge/types.ts (use t() for labels)

**When all checked:** Extension fully internationalized! 🎉
