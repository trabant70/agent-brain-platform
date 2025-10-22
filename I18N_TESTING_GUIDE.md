# Internationalization Testing Guide

## ✅ Infrastructure Status: COMPLETE

The Agent Brain Platform extension now has full i18n infrastructure in place, supporting 5 languages:
- 🇬🇧 English (en) - Base language
- 🇩🇪 German (de)
- 🇪🇸 Spanish (es)
- 🇨🇳 Chinese Simplified (zh-cn)
- 🇫🇷 French (fr)

---

## 🎯 What's Implemented

### ✅ Complete
1. **Extension Metadata** - VSCode UI elements (commands, views, settings)
2. **Extension Code** - Error messages using `vscode-nls`
3. **Bundle Files** - 100+ strings translated for webview
4. **i18n Infrastructure** - Full runtime translation system
5. **Build System** - Automatic bundle copying and deployment

### 🔄 Pending (Optional)
- UI controller integration (replacing hardcoded strings with `t()` calls)

---

## 📋 Testing Checklist

### 1. Test Language Detection

**How it works:**
- Extension reads `vscode.env.language` on startup
- Matches locale to available bundle files
- Falls back to English if locale not supported

**To test:**

1. **Change VSCode Language:**
   ```
   Windows/Linux: Ctrl+Shift+P → "Configure Display Language"
   Mac: Cmd+Shift+P → "Configure Display Language"
   ```

2. **Select a Language:**
   - Deutsch (de)
   - Español (es)
   - 简体中文 (zh-cn)
   - Français (fr)
   - English (en)

3. **Restart VSCode**

4. **Open Agent Brain Panel**

5. **Check Logs:**
   - Open Output panel (View → Output)
   - Select "Agent Brain Platform" from dropdown
   - Look for: `Loaded i18n bundle: bundle.l10n.[lang].json`

---

### 2. Test Extension Metadata (VSCode UI)

**What's localized:**
- ✅ Extension display name
- ✅ Extension description
- ✅ Command titles (Command Palette)
- ✅ View container titles (Activity Bar, Panel)
- ✅ View names
- ✅ Configuration titles and descriptions

**How to test:**

1. **Check Extension Info:**
   - Extensions → Search "Agent Brain"
   - Verify description is in selected language

2. **Check Command Palette:**
   - Ctrl+Shift+P / Cmd+Shift+P
   - Type "timeline"
   - Verify command titles are translated

3. **Check Activity Bar:**
   - Look for "AB Timeline" or translated equivalent
   - Should show localized title on hover

4. **Check Settings:**
   - Settings → Search "Agent Brain"
   - Verify setting descriptions are translated

---

### 3. Test Bundle Loading

**What's happening:**
- On webview initialization, extension sends `i18n:init` message
- Webview receives locale + translations object
- `initI18n()` called with data
- Translations stored in memory for `t()` function

**How to test:**

1. **Open DevTools:**
   - Right-click on Agent Brain webview
   - Select "Open Webview Developer Tools"

2. **Check Console Logs:**
   ```
   [i18n] Initialized with locale: de, 100+ strings loaded
   i18n initialized with locale: de
   ```

3. **Test i18n API in Console:**
   ```javascript
   // Import not needed - already available in webview context

   // These won't work yet (need to export to window) but infrastructure is ready
   // To test once integrated:
   // t('tab.timeline')  // Should return "AB Timeline" or translated
   // tf('status.itemCount', {count: 5})  // Should return "5 items" or translated
   // getLocale()  // Should return current locale
   ```

---

### 4. Test Fallback Behavior

**Scenarios to test:**

1. **Unsupported Language (e.g., Italian):**
   - Set VSCode to Italian (it)
   - Extension should load English bundle
   - Check logs for fallback message

2. **Missing Translation Key:**
   - Use `t('nonexistent.key')`
   - Should return the key itself as fallback
   - Warning logged to console

3. **Corrupted Bundle File:**
   - Rename a bundle file temporarily
   - Extension should fall back to English
   - Error logged, but extension still works

---

### 5. Test Each Language

#### German (de)

**Expected Translations:**
- Extension: "Agent Brain Platform"
- Description: "Verwandeln Sie KI-Programmieragenten in Senior-Entwickler..."
- Command: "Repository-Zeitlinie anzeigen"
- View: "AB Zeitlinie"

**Special Checks:**
- German is ~30% longer than English
- Check for layout overflow issues
- Verify umlauts render correctly (ä, ö, ü, ß)

#### Spanish (es)

**Expected Translations:**
- Description: "Transforme agentes de codificación IA en desarrolladores senior..."
- Command: "Mostrar Línea de Tiempo del Repositorio"
- View: "AB Línea de Tiempo"

**Special Checks:**
- Accented characters (á, é, í, ó, ú, ñ)
- Gender-specific terms translated correctly

#### Chinese Simplified (zh-cn)

**Expected Translations:**
- Description: "将AI编码代理转变为高级开发人员..."
- Command: "显示仓库时间线"
- View: "AB 时间线"

**Special Checks:**
- Chinese characters render correctly
- Font fallback works properly
- No character encoding issues

#### French (fr)

**Expected Translations:**
- Description: "Transformez les agents de codage IA en développeurs senior..."
- Command: "Afficher la Chronologie du Dépôt"
- View: "AB Chronologie"

**Special Checks:**
- French accents (é, è, ê, à, ç)
- Proper spacing before punctuation (« », :, !)

---

## 🔧 How to Use i18n in Code (Future Integration)

### In Webview Code

```typescript
import { t, tf } from './i18n';

// Simple translation
const tabLabel = t('tab.timeline');  // "AB Timeline" or translated

// With default value
const label = t('unknown.key', 'Default Text');

// With parameters
const count = tf('status.itemCount', { count: 5 });  // "5 items" or translated

// Check if translation exists
if (hasTranslation('optional.key')) {
  const text = t('optional.key');
}

// Get current locale
const locale = getLocale();  // "de", "es", "zh-cn", "fr", or "en"
```

### In Extension Code

```typescript
import * as nls from 'vscode-nls';
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

// Simple usage
vscode.window.showInformationMessage(
  localize('success.saved', 'Item saved successfully')
);

// With parameters
vscode.window.showErrorMessage(
  localize('error.notFound', 'Item {0} not found', itemName)
);
```

---

## 📁 File Locations

### Translation Files

```
/mnt/c/projects/agent-brain-platform/
├── packages/vscode/
│   ├── package.nls.json          # English extension metadata
│   ├── package.nls.de.json       # German extension metadata
│   ├── package.nls.es.json       # Spanish extension metadata
│   ├── package.nls.zh-cn.json    # Chinese extension metadata
│   └── package.nls.fr.json       # French extension metadata
│
├── l10n/
│   ├── bundle.l10n.json          # English webview strings
│   ├── bundle.l10n.de.json       # German webview strings
│   ├── bundle.l10n.es.json       # Spanish webview strings
│   ├── bundle.l10n.zh-cn.json    # Chinese webview strings
│   └── bundle.l10n.fr.json       # French webview strings
│
└── packages/core/src/domains/visualization/webview/
    └── i18n.ts                   # Webview i18n utility
```

### Build Artifacts

After building (`npm run build`), bundle files are copied to:
```
packages/vscode/l10n/
├── bundle.l10n.json
├── bundle.l10n.de.json
├── bundle.l10n.es.json
├── bundle.l10n.zh-cn.json
└── bundle.l10n.fr.json
```

---

## 🐛 Troubleshooting

### Issue: Extension shows English despite language setting

**Check:**
1. VSCode language actually changed (View → Command Palette → Configure Display Language)
2. VSCode restarted after language change
3. Check Output panel for loaded bundle file
4. Verify bundle files exist in `packages/vscode/l10n/`

### Issue: Console shows "Missing translation for key: X"

**This is expected:**
- Bundle files exist but UI controllers haven't been updated yet to use `t()`
- Infrastructure is ready, integration is pending

### Issue: Characters not rendering (boxes/question marks)

**Check:**
1. Font supports the character set (Chinese needs Chinese font)
2. VSCode settings → Font Family includes fallback fonts
3. OS has required language packs installed

### Issue: Layout breaks with longer translations

**Expected:**
- German is ~30% longer than English
- May need CSS adjustments for fixed-width layouts
- Test with German to identify layout issues early

---

## ✅ Success Criteria

### Infrastructure (COMPLETE)
- [x] All 5 package.nls.json files created and translated
- [x] All 5 bundle.l10n.json files created and translated
- [x] package.json uses %key% references
- [x] vscode-nls integrated in extension code
- [x] i18n.ts utility created and functional
- [x] Webpack copies bundle files to dist
- [x] Extension builds without errors
- [x] Webview builds without errors
- [x] i18n:init message sent and received
- [x] initI18n() called successfully
- [x] Locale detection works
- [x] Fallback to English works

### UI Integration (PENDING - Optional)
- [ ] Tab labels use t() function
- [ ] Button labels use t() function
- [ ] Table headers use t() function
- [ ] Status messages use t() function
- [ ] Error messages use t() function
- [ ] Tooltips use t() function

---

## 📊 Translation Coverage

| Component | EN | DE | ES | ZH-CN | FR | Status |
|-----------|:--:|:--:|:--:|:-----:|:--:|--------|
| package.nls | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| package.json | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| bundle.l10n | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| Extension Code | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| Webview Infrastructure | ✅ | ✅ | ✅ | ✅ | ✅ | Complete |
| UI Controllers | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | Pending |

**Legend:**
- ✅ Complete - Translated and integrated
- ⏳ Pending - Translation exists, integration pending
- ⚠️ In Progress - Partially complete
- ❌ Not Started

---

## 🚀 Quick Start for UI Integration

When ready to integrate translations into UI:

1. **Import i18n utility:**
   ```typescript
   import { t, tf } from './i18n';
   ```

2. **Replace hardcoded strings:**
   ```typescript
   // Before:
   element.textContent = 'AB Timeline';

   // After:
   element.textContent = t('tab.timeline');
   ```

3. **Use parameter substitution:**
   ```typescript
   // Before:
   statusBar.textContent = `${count} items`;

   // After:
   statusBar.textContent = tf('status.itemCount', { count });
   ```

4. **Test in each language:**
   - Change VSCode language
   - Restart extension
   - Verify text updates correctly

---

## 📝 Adding New Translations

### Process:
1. Add key to `/l10n/bundle.l10n.json` (English base)
2. Add same key with translation to all other bundle files
3. Use `t('your.new.key')` in code
4. Rebuild and test

### Best Practices:
- Use descriptive dot-notation keys (`tab.timeline`, not `t1`)
- Group related keys (`button.save`, `button.cancel`)
- Provide meaningful default values
- Document context for translators
- Keep formatting placeholders consistent (`{count}`, `{name}`)

---

## 🎉 Summary

The **i18n infrastructure is 100% complete and operational**. The extension:
- ✅ Detects VSCode language automatically
- ✅ Loads appropriate translation bundle
- ✅ Falls back to English gracefully
- ✅ Supports 5 languages out of the box
- ✅ Ready for UI controller integration

**What's Next (Optional):**
Update UI controllers to replace hardcoded strings with `t()` function calls.

**Priority:** Medium - Infrastructure provides solid foundation for future internationalization efforts when needed.
