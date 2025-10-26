# Internationalization (i18n) Status

**Last Updated**: 2025-10-25
**Version**: 0.4.56 (V1TemplatesTableController fully internationalized)

## Summary

The Agent Brain Platform has internationalization infrastructure in place using VSCode's l10n system. This document tracks i18n coverage across the codebase.

## Architecture

### i18n System Components

1. **Translation Files** (`packages/vscode/l10n/`)
   - `bundle.l10n.json` - English translations (source of truth)
   - Language-specific files can be added (e.g., `bundle.l10n.de.json`)

2. **Webview i18n Module** (`packages/core/src/domains/visualization/webview/i18n.ts`)
   - `initI18n(locale, strings)` - Initialize with locale and translations
   - `t(key, defaultValue?)` - Translate a key
   - `tf(key, params)` - Translate with parameter substitution
   - `hasTranslation(key)` - Check if key exists
   - `getLocale()` - Get current locale

3. **Package Metadata** (`packages/vscode/package.nls.*.json`)
   - VSCode command/menu/settings translations
   - Separate from webview translations

## Current Status (v0.4.56)

### ✅ Fully Internationalized Components

#### 1. **MaturityConfigPanel** (NEW - v0.4.56)
All user-facing strings use i18n:
- ✅ Section headers and labels
- ✅ Complexity level dropdown (Simple/Standard/Complex)
- ✅ Grid axis labels (Project Phase, Operator Experience)
- ✅ Row/column labels (Planning→Mature, Novice→Expert)
- ✅ Button labels (Controls, Reset to Defaults, Apply Configuration)
- ✅ Context summary text

**i18n Keys Added**: 22 keys in `maturity.*` namespace

#### 2. **Core Translations** (Existing)
- ✅ Tab names (Timeline, Knowledge, Sessions, Support)
- ✅ Stats labels
- ✅ Common buttons (Refresh, Controls, Legend, etc.)
- ✅ Knowledge type labels (ADR, Best Practice, Design Pattern, etc.)
- ✅ Knowledge scope labels (Personal, Team, Project, Organization, Public)
- ✅ Event type labels
- ✅ Search placeholders
- ✅ Column headers
- ✅ Group by options
- ✅ Filter labels
- ✅ Success/error messages

### ✅ Fully Internationalized Components (continued)

#### 3. **V1TemplatesTableController** (100% coverage) - NEW as of v0.4.56
All user-facing strings use i18n:
- ✅ Column headers (using existing `column.*` keys)
- ✅ Search placeholder
- ✅ Button title attributes (16 tooltips internationalized)
- ✅ Input placeholders (tags input)

**i18n Keys Used**:
- Tooltip keys (16): `tooltip.expandTemplate`, `tooltip.collapseTemplate`, `tooltip.addItemToTemplate`, `tooltip.createVersionCheckpoint`, `tooltip.injectTemplateToFile`, `tooltip.viewAuditLog`, `tooltip.exportTemplateToJSON`, `tooltip.editTemplate`, `tooltip.deleteTemplate`, `tooltip.editItemInline`, `tooltip.injectItemToFile`, `tooltip.editItem`, `tooltip.deleteItem`, `tooltip.saveChanges`, `tooltip.cancelEditing`, `tooltip.lastVersionCheckpoint`
- Input keys (1): `input.tagsPlaceholder`
- Template/item keys: Reused from earlier additions

#### 4. **V1TemplateFormController** (100% coverage) - NEW as of v0.4.56
All user-facing strings use i18n:
- ✅ Modal titles (6 modals internationalized)
- ✅ Form field labels (14 labels)
- ✅ Button labels (6 buttons)
- ✅ Placeholder text (5 placeholders)
- ✅ Help text (3 help messages)
- ✅ Category options (7 categories)
- ✅ Item type options (8 types)
- ✅ Validation messages (2 messages)

**i18n Keys Added**: 57 keys in `modal.*`, `label.*`, `category.*`, `type.*`, `placeholder.*`, `help.*`, `validation.*` namespaces

### ⏳ Partially Internationalized Components

#### 3. **Other UI Controllers** (Variable coverage)
- **KnowledgeViewController**: Mix of hardcoded and i18n
- **SessionViewController**: Minimal i18n
- **ClaudeMdAccordionController**: No i18n
- **FilterController**: Minimal i18n
- **AuditLogViewer**: No i18n
- **ValidationResultsModal**: No i18n

### ❌ Not Internationalized

1. **Bundled Template Content**
   - Knowledge item titles and bodies are in English
   - These are content, not UI strings
   - **Decision**: Keep in English (content localization is separate concern)

2. **Console/Debug Messages**
   - Log statements use English
   - **Decision**: Keep in English (developer-facing)

3. **Code Comments**
   - All comments in English
   - **Decision**: Keep in English (developer-facing)

## Translation Keys Added (v0.4.56)

### Maturity Feature (22 keys)
```
maturity.contextConfiguration
maturity.complexityLevel
maturity.yourContext
maturity.projectPhase
maturity.operatorExperience
maturity.maximumItems
maturity.resetToDefaults
maturity.applyConfiguration
maturity.complexity.simple
maturity.complexity.simple.desc
maturity.complexity.standard
maturity.complexity.standard.desc
maturity.complexity.complex
maturity.complexity.complex.desc
maturity.project.planning
maturity.project.inception
maturity.project.development
maturity.project.established
maturity.project.mature
maturity.operator.novice
maturity.operator.junior
maturity.operator.mid
maturity.operator.senior
maturity.operator.expert
```

### Template Management (40 keys)
```
template.createNew
template.addItem
template.editTemplate
template.deleteTemplate
template.cloneTemplate
template.injectToClaude
template.removeFromClaude
template.name
template.description
template.category
template.version
template.items
template.noItems
item.title
item.type
item.scope
item.tags
item.body
item.source
item.edit
item.delete
item.moveUp
item.moveDown
claudemd.files
claudemd.editMode
claudemd.previewMode
claudemd.save
claudemd.cancel
claudemd.refresh
form.required
form.optional
form.cancel
form.save
form.create
form.update
confirm.deleteTemplate
confirm.deleteItem
confirm.removeFromClaude
message.template.created
message.template.updated
message.template.deleted
message.template.cloned
message.template.injected
message.template.removed
message.item.created
message.item.updated
message.item.deleted
message.maturity.saved
message.maturity.error
```

### Tooltip Keys (17 keys) - NEW as of v0.4.56
```
tooltip.expandTemplate
tooltip.collapseTemplate
tooltip.addItemToTemplate
tooltip.createVersionCheckpoint
tooltip.injectTemplateToFile
tooltip.viewAuditLog
tooltip.exportTemplateToJSON
tooltip.editTemplate
tooltip.deleteTemplate
tooltip.editItemInline
tooltip.injectItemToFile
tooltip.editItem
tooltip.deleteItem
tooltip.saveChanges
tooltip.cancelEditing
tooltip.lastVersionCheckpoint
input.tagsPlaceholder
```

**Total Keys (Maturity + Template Management + Tooltips)**: 79 keys

### Form & Modal Keys (57 keys) - NEW as of v0.4.56
```
modal.createTemplate
modal.cloneTemplate
modal.editTemplate
modal.addItemToTemplate
modal.editItem
modal.createVersionCheckpoint

label.name
label.description
label.category
label.tagsCommaSeparated
label.scope
label.title
label.bodyMarkdown
label.type
label.versionNumber
label.versionDescription
label.sourceTemplate
label.newTemplateName
label.shallowClone
label.itemsAndVersion

category.development
category.bestPractices
category.documentation
category.testing
category.security
category.architecture
category.custom

type.goldenPath
type.pattern
type.adr
type.bestPractice
type.standard
type.learning
type.snippet
type.apiSpec

placeholder.templateTags
placeholder.itemTags
placeholder.markdownBody
placeholder.versionNumber
placeholder.versionDescription

help.versionCheckpoint
help.semanticVersioning
help.deepClone

validation.enterTemplateName
validation.fillRequiredFields
```

**Total New Keys**: 136 (79 + 57 form/modal keys)

## How to Add i18n to a Component

### Step 1: Import i18n functions
```typescript
import { t, tf } from '../../webview/i18n';
```

### Step 2: Add keys to bundle.l10n.json
```json
{
  "myFeature.title": "My Feature Title",
  "myFeature.description": "Feature description text",
  "myFeature.itemCount": "{count} items found"
}
```

### Step 3: Use in code
```typescript
// Simple translation
const title = t('myFeature.title');

// With default fallback
const label = t('myFeature.label', 'Default Label');

// With parameters
const message = tf('myFeature.itemCount', { count: 5 }); // "5 items found"

// In HTML template
element.innerHTML = `<h3>${t('myFeature.title')}</h3>`;
```

### Step 4: Test
1. Verify strings appear correctly in UI
2. Check browser console for missing translation warnings
3. (Optional) Add additional language files and test switching locales

## Recommended Next Steps

### Priority 1: Session Management i18n
- **File**: `SessionViewController.ts`
- **Impact**: Medium - session journal management
- **Effort**: Low-Medium (2-3 hours)
- **Keys**: Can reuse many existing keys

### Priority 2: Audit & Validation i18n
- **Files**: `AuditLogViewer.ts`, `ValidationResultsModal.ts`
- **Impact**: Low - infrequently used
- **Effort**: Low (1-2 hours each)
- **Keys**: Mostly technical UI with few strings

## Adding New Languages

To add support for additional languages (e.g., German):

### 1. Create bundle file
```bash
cp packages/vscode/l10n/bundle.l10n.json packages/vscode/l10n/bundle.l10n.de.json
```

### 2. Translate values
Edit `bundle.l10n.de.json` and translate the values (keep keys unchanged):
```json
{
  "tab.timeline": "AB Zeitachse",
  "tab.knowledge": "AB Wissen",
  "button.refresh": "Aktualisieren",
  ...
}
```

### 3. VSCode will auto-detect
VSCode automatically loads the appropriate locale file based on the user's display language setting.

## Testing i18n

### Manual Testing
1. Install VSIX in VSCode
2. Open Agent Brain views
3. Check browser console for `[i18n] Missing translation for key: ...` warnings
4. Verify all UI text appears correctly

### Automated Testing (Future)
- Add unit tests for i18n coverage
- Use `getAvailableKeys()` to verify all used keys exist
- Test parameter substitution in `tf()` function

## Notes

- **Locale Initialization**: Happens in `main.ts` via message from extension
- **Default Locale**: English (`en`)
- **Fallback Behavior**: Missing keys return the key itself with console warning
- **Performance**: All translations loaded at init, no runtime lookup overhead
- **VSCode Integration**: Uses VSCode's native l10n system for commands/settings

## Statistics

| Component | Lines | i18n Coverage | Status |
|-----------|-------|---------------|--------|
| MaturityConfigPanel | 350 | 100% | ✅ Complete |
| V1TemplatesTableController | 902 | 100% | ✅ Complete |
| V1TemplateFormController | 609 | 100% | ✅ Complete |
| Bundle Keys | 268 total | - | 136 new keys added (v0.4.56) |
| Other Controllers | ~2500 | <20% | ❌ Minimal |

**Overall i18n Coverage**: ~70% of user-facing strings (up from ~40%)

## References

- [VSCode L10n Guide](https://code.visualstudio.com/api/references/vscode-api#l10n)
- [bundle.l10n.json](../packages/vscode/l10n/bundle.l10n.json)
- [i18n.ts](../packages/core/src/domains/visualization/webview/i18n.ts)
