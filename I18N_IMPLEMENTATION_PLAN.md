# Agent Brain Platform - Internationalization Implementation Plan

## Overview
Implement multi-language support for the Agent Brain Platform VSCode extension using VSCode's built-in i18n infrastructure.

**Target Languages:**
- English (en) - Default
- German (de)
- Spanish (es)
- Chinese Simplified (zh-cn)
- French (fr)

**Approach:** Use VSCode's `vscode-nls` package and locale detection

---

## Phase 1: Infrastructure Setup

### 1.1 Install Dependencies
```bash
cd packages/vscode
npm install --save vscode-nls
npm install --save-dev @vscode/l10n-dev
```

### 1.2 Create Language Files Structure
```
packages/vscode/
├── package.nls.json (English - base)
├── package.nls.de.json (German)
├── package.nls.es.json (Spanish)
├── package.nls.zh-cn.json (Chinese)
├── package.nls.fr.json (French)
└── l10n/
    ├── bundle.l10n.json (English strings)
    ├── bundle.l10n.de.json (German strings)
    ├── bundle.l10n.es.json (Spanish strings)
    ├── bundle.l10n.zh-cn.json (Chinese strings)
    └── bundle.l10n.fr.json (French strings)
```

---

## Phase 2: Package.json Localization

### 2.1 Extract Localizable Strings
Strings to localize from package.json:
- `displayName`
- `description`
- Command titles (showTimeline, refreshData)
- View container titles
- View names
- Configuration property descriptions
- Keybinding labels

### 2.2 Create package.nls.json Files
Base file with all English strings, then translate for each language.

**Key Strings:**
- Extension display name
- Extension description
- Command titles
- Configuration descriptions
- View titles

---

## Phase 3: Extension Code Localization

### 3.1 Update Extension Entry Point
- Import `vscode-nls` in extension.ts
- Initialize localization
- Apply to status messages, notifications

### 3.2 Localize TimelineProvider
- Status messages
- Error messages
- Tooltips
- Notifications

### 3.3 Localize KnowledgeManager
- File operation messages
- Validation messages
- Success/error notifications

### 3.4 Localize WelcomeViewProvider
- Welcome content (headers, descriptions, bullets)
- Action button labels

---

## Phase 4: Webview Localization

### 4.1 Create Webview Localization Infrastructure
- Create i18n utility for webview
- Load locale strings based on VSCode language
- Pass locale to webview via message

### 4.2 Localize Timeline Tab
- Statistics labels (Visible Events, Total Events, Contributors, etc.)
- Button labels (Legend, Controls, Refresh)
- Filter labels
- Event type names
- Tooltips

### 4.3 Localize Knowledge Tab
- Column headers
- Button labels (+ Add Item, Refresh, Import, Export, etc.)
- Group by options
- Knowledge type labels
- Scope labels
- Search placeholders
- Empty state messages

### 4.4 Localize Sessions Tab
- Column headers
- Search placeholder
- Empty state messages
- Sort indicators

### 4.5 Localize Support Tab
- (Minimal - just ensure architecture diagram loads)

### 4.6 Localize Modal Dialogs
- Knowledge item editor
- Template selector
- Confirmation dialogs

---

## Phase 5: Domain Localization

### 5.1 Knowledge Types
Localize 20 knowledge type labels:
- ADR, Anti-Pattern, API Spec, Best Practice, etc.
- Type icons remain unchanged (emojis are universal)

### 5.2 Knowledge Scopes
Localize 5 scope labels:
- Personal, Team, Project, Organization, Public

### 5.3 Event Types
Localize event type labels:
- Commit, Branch, Merge, Tag, Release, PR, Knowledge, Session

---

## Phase 6: Testing & Quality Assurance

### 6.1 Test Language Switching
- Change VSCode display language
- Verify extension picks up new language
- Test all UI elements

### 6.2 Test Each Language
- English (baseline)
- German (verify special characters: ä, ö, ü, ß)
- Spanish (verify accents: á, é, í, ó, ú, ñ)
- Chinese (verify character rendering)
- French (verify accents: é, è, ê, à, ç)

### 6.3 Test Fallback Behavior
- Test with unsupported language (should default to English)
- Test with missing translations (should fall back to English)

### 6.4 Test String Length Issues
- German tends to be 30% longer than English
- Chinese tends to be shorter
- Ensure UI doesn't break with longer strings

---

## Implementation Steps

### Step 1: Setup Infrastructure ✅
- Install vscode-nls
- Create directory structure
- Configure build process

### Step 2: Package.json Localization ✅
- Create package.nls.json (base)
- Update package.json to use %key% syntax
- Create translations for all 5 languages

### Step 3: Extension Code Localization ✅
- Update extension.ts
- Update TimelineProvider
- Update KnowledgeManager
- Update WelcomeViewProvider

### Step 4: Webview Localization ✅
- Create webview i18n utilities
- Create bundle.l10n.json files
- Update HTML templates
- Update TypeScript controllers

### Step 5: Domain Localization ✅
- Update knowledge types.ts
- Update event type labels
- Update scope labels

### Step 6: Testing ✅
- Test all languages
- Fix any layout issues
- Verify fallback behavior

---

## Translation Requirements

### Key Terminology
Maintain consistency across languages:

| English | German | Spanish | Chinese | French |
|---------|--------|---------|---------|--------|
| Timeline | Zeitlinie | Línea de tiempo | 时间线 | Chronologie |
| Knowledge | Wissen | Conocimiento | 知识 | Connaissance |
| Session | Sitzung | Sesión | 会话 | Session |
| Agent | Agent | Agente | 代理 | Agent |
| Pattern | Muster | Patrón | 模式 | Modèle |
| Golden Path | Goldener Pfad | Ruta Dorada | 黄金路径 | Chemin d'Or |
| ADR | Architekturentscheidung | Decisión de Arquitectura | 架构决策记录 | Décision d'Architecture |

### Translation Guidelines
1. **Preserve Emojis**: Keep all emoji icons unchanged
2. **Technical Terms**: Keep some terms in English if standard (e.g., "Git", "GitHub", "VSCode")
3. **Markdown**: Keep markdown syntax unchanged
4. **Keyboard Shortcuts**: Keep key names in English (Ctrl, Shift, Cmd)
5. **File Paths**: Keep file path examples in English
6. **Code Examples**: Keep code samples in English

---

## Post-Implementation

### Documentation Updates
- Update README.md to mention multi-language support
- Add language switching instructions
- Document supported languages

### Future Languages
Infrastructure will support adding more languages:
- Japanese (ja)
- Korean (ko)
- Portuguese (pt-br)
- Russian (ru)
- Italian (it)

### Contribution Guidelines
- Create template for community translations
- Document translation process
- Set up translation validation

---

## Success Criteria

✅ Extension displays in user's VSCode language (when supported)
✅ All UI elements properly localized
✅ No broken layouts due to string length differences
✅ Graceful fallback to English for unsupported languages
✅ All 5 target languages fully translated and tested
✅ Documentation updated with i18n information

---

## Estimated Effort

- Phase 1 (Infrastructure): 1-2 hours
- Phase 2 (Package.json): 2-3 hours
- Phase 3 (Extension Code): 3-4 hours
- Phase 4 (Webview): 6-8 hours (largest component)
- Phase 5 (Domain): 2-3 hours
- Phase 6 (Testing): 3-4 hours

**Total**: ~20-25 hours of development + translation time

---

## Notes

- Use professional translation services or native speakers for production
- This implementation uses basic translations (may need refinement)
- Test with real users in each language for quality assurance
- Consider cultural differences in messaging and examples
