# Template Validation UI Implementation Plan

**Created:** 2025-10-25
**Feature:** Transparent Template Validation with User Override Capability
**Complexity:** Medium-Large
**Estimated Time:** 2-3 hours

---

## Overview

Implement a comprehensive validation UI that runs security, structure, and business validators on imported templates, displays results transparently, and allows users to make informed decisions about risky content.

---

## Current State Analysis

### ✅ What Exists
- **Validation System**: Complete orchestrator with 7 validators
  - `XSSValidator` - Detects script tags, event handlers, javascript URIs
  - `PromptInjectionValidator` - Detects instruction override attempts
  - `UnicodeValidator` - Detects unpaired surrogates
  - `PathTraversalValidator` - Detects path traversal attempts
  - `ContentSizeValidator` - Checks file size limits
  - `SchemaValidator` - Validates structure against TypeScript types
  - `DuplicateIdValidator` - Detects duplicate item IDs

- **Test Templates**: Two comprehensive test files
  - `test-templates/security-issues-template.json` - XSS, Prompt Injection, Unicode attacks
  - `test-templates/structure-issues-template.json` - Invalid types, duplicate IDs, missing fields

### ❌ What's Missing
- **Validation Modal UI** - No component to display results
- **Integration** - Validation orchestrator not called during import
- **User Decision Flow** - No way for user to review and choose

---

## Architecture

### Components to Build

```
┌─────────────────────────────────────────────────────────┐
│ 1. ValidationResultsModal                               │
│    - New modal component (similar to ModalDialog)      │
│    - Displays validation results                        │
│    - Handles user decision (proceed/cancel)             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 2. KnowledgeViewController.handleImportTemplate()      │
│    - Parse JSON                                         │
│    - Run TemplateValidationOrchestrator                │
│    - Show ValidationResultsModal with results           │
│    - Handle user decision                               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Backend Import (existing)                            │
│    - Store template                                     │
│    - Save to file                                       │
│    - Refresh UI                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Create ValidationResultsModal Component

**File:** `/packages/core/src/domains/visualization/ui/knowledge/ValidationResultsModal.ts`

**Class Structure:**
```typescript
export class ValidationResultsModal {
  constructor() {}

  /**
   * Show validation results modal
   * @param result - TemplateValidationResult from orchestrator
   * @param templateName - Name of template being validated
   * @returns Promise<'proceed' | 'cancel'> - User's decision
   */
  async show(
    result: TemplateValidationResult,
    templateName: string
  ): Promise<'proceed' | 'cancel'>

  private renderSummary(result): string
  private renderValidationChecklist(result): string
  private renderThreatsDetected(result): string
  private renderDetailedLog(result): string
  private escapeHtml(str: string): string
}
```

**Modal Sections:**

1. **Summary Section**
   - Validators Run: X
   - Passed: X
   - Failed: X
   - Execution Time: Xms
   - Status indicator (✅ All Passed / ⚠️ Issues Detected)

2. **Validation Checklist**
   - Table with columns: Validator Name, Status, Error Count, Category
   - Status icons: ✅ Pass / ❌ Fail / ⚠️ Warning
   - Category badges: 📐 Structure / 🔒 Security / 💼 Business
   - Expandable details for each failed validator

3. **Threats Detected & Sanitized**
   - 🔒 XSS Attacks: X
   - 🤖 Prompt Injection: X
   - 🔤 Unicode Exploits: X
   - 📁 Path Traversal: X
   - Other: X

4. **Detailed Validation Log** (expandable)
   - Full error messages
   - Field paths where issues found
   - Error codes
   - Suggestions for fixes

5. **User Decision**
   - Warning notice about proceeding with failed validation
   - Two buttons:
     - "Cancel" (secondary) - Abort import
     - "✓ Proceed with Import" (primary, warning style) - Continue despite issues

**Visual Design:**
- Modal width: 900px
- Max height: 85vh
- Scrollable content area
- Color coding:
  - Green for passed validators
  - Red for failed validators
  - Orange for warnings
  - Category badges with appropriate icons

---

### Phase 2: Integrate Validation Orchestrator

**File:** `/packages/core/src/domains/visualization/ui/KnowledgeViewController.ts`

**Changes to `handleImportTemplate()`:**

```typescript
private handleImportTemplate(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const templateJson = JSON.parse(content);

      // Basic validation
      if (!templateJson.id || !templateJson.name) {
        this.notifications.show({
          type: 'error',
          message: 'Invalid template format',
          duration: 5000
        });
        return;
      }

      // ====== NEW: Run comprehensive validation ======
      const orchestrator = this.createValidationOrchestrator();
      const validationResult = orchestrator.validate(templateJson);

      // If validation has failures, show modal
      if (validationResult.hasErrors || validationResult.hasWarnings) {
        const modal = new ValidationResultsModal();
        const decision = await modal.show(validationResult, templateJson.name);

        if (decision === 'cancel') {
          this.notifications.show({
            type: 'info',
            message: 'Import cancelled',
            duration: 3000
          });
          return;
        }
        // User chose 'proceed', continue with import
      }

      // Import (use sanitized data if available)
      const dataToImport = validationResult.sanitizedData || templateJson;
      this.sendMessage({
        type: 'v1:import-template',
        payload: { templateJson: dataToImport }
      });
    };

    reader.readAsText(file);
  };

  input.click();
}

/**
 * Create validation orchestrator with all validators registered
 */
private createValidationOrchestrator(): TemplateValidationOrchestrator {
  const orchestrator = new TemplateValidationOrchestrator();

  // Register validators
  orchestrator.registerValidators([
    new SchemaValidator(),
    new XSSValidator(),
    new PromptInjectionValidator(),
    new UnicodeValidator(),
    new PathTraversalValidator(),
    new ContentSizeValidator(),
    new DuplicateIdValidator()
  ]);

  return orchestrator;
}
```

**Imports to Add:**
```typescript
import { TemplateValidationOrchestrator } from '../../../knowledge/validation/TemplateValidationOrchestrator';
import { ValidationResultsModal } from './knowledge/ValidationResultsModal';
import {
  SchemaValidator,
  XSSValidator,
  PromptInjectionValidator,
  UnicodeValidator,
  PathTraversalValidator,
  ContentSizeValidator,
  DuplicateIdValidator
} from '../../../knowledge/validation';
```

---

### Phase 3: Styling

**File:** `/packages/core/src/domains/visualization/styles/components/knowledge.css`

**New Styles:**
```css
/* Validation Results Modal */
.validation-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 20px;
  background: var(--vscode-textBlockQuote-background);
  border-radius: 4px;
  margin-bottom: 20px;
}

.validation-stat {
  text-align: center;
}

.validation-stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--vscode-textLink-activeForeground);
}

.validation-stat-label {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-top: 4px;
}

.validation-checklist {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.validation-checklist th {
  text-align: left;
  padding: 12px 8px;
  font-weight: 600;
  background: var(--vscode-editor-background);
  border-bottom: 2px solid var(--vscode-panel-border);
}

.validation-checklist td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.validator-status {
  font-size: 18px;
}

.validator-status.pass {
  color: #4caf50;
}

.validator-status.fail {
  color: #f44336;
}

.validator-status.warning {
  color: #ff9800;
}

.validator-category-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.threats-section {
  padding: 16px;
  background: rgba(244, 67, 54, 0.1);
  border-left: 4px solid #f44336;
  border-radius: 4px;
  margin-bottom: 20px;
}

.threat-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.validation-warning-notice {
  padding: 16px;
  background: rgba(255, 152, 0, 0.1);
  border-left: 4px solid #ff9800;
  border-radius: 4px;
  margin-top: 20px;
}

.validation-detail-toggle {
  cursor: pointer;
  color: var(--vscode-textLink-foreground);
  text-decoration: underline;
  margin-top: 12px;
  display: inline-block;
}

.validation-detail-log {
  max-height: 300px;
  overflow-y: auto;
  background: var(--vscode-editor-background);
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  margin-top: 12px;
}
```

---

### Phase 4: Testing Plan

**Test Case 1: security-issues-template.json**

Expected Results:
- ❌ XSSValidator: FAIL (4 errors)
- ❌ PromptInjectionValidator: FAIL (5 errors)
- ❌ UnicodeValidator: FAIL (3 errors)
- ✅ SchemaValidator: PASS
- ✅ PathTraversalValidator: PASS (or 1 error if detected)
- ✅ ContentSizeValidator: PASS
- ✅ DuplicateIdValidator: PASS

Modal Should Show:
- Summary: 3-4 validators failed
- Threats: XSS: 4, Prompt Injection: 5, Unicode: 3
- User can click "Proceed with Import" to accept sanitized version
- User can click "Cancel" to abort

**Test Case 2: structure-issues-template.json**

Expected Results:
- ❌ SchemaValidator: FAIL (invalid types, scopes, missing fields)
- ❌ DuplicateIdValidator: FAIL (3 items with same ID)
- ⚠️ ContentSizeValidator: WARN (large content)
- ✅ XSSValidator: PASS
- ✅ PromptInjectionValidator: PASS
- ✅ UnicodeValidator: PASS
- ✅ PathTraversalValidator: PASS

Modal Should Show:
- Summary: 2 validators failed, 1 warning
- Errors for schema violations and duplicate IDs
- User can proceed or cancel

**Test Case 3: Valid Template (bundled template export)**

Expected Results:
- All validators: PASS
- No modal shown (auto-import)
- Success notification

---

## File Structure

```
packages/core/src/domains/
├── knowledge/
│   └── validation/
│       ├── TemplateValidationOrchestrator.ts  [EXISTS]
│       ├── index.ts                           [EXISTS]
│       ├── types.ts                           [EXISTS]
│       ├── constants.ts                       [EXISTS]
│       ├── security/
│       │   ├── XSSValidator.ts                [EXISTS]
│       │   ├── PromptInjectionValidator.ts    [EXISTS]
│       │   ├── UnicodeValidator.ts            [EXISTS]
│       │   ├── PathTraversalValidator.ts      [EXISTS]
│       │   └── ContentSizeValidator.ts        [EXISTS]
│       ├── structure/
│       │   └── SchemaValidator.ts             [EXISTS]
│       └── business/
│           └── DuplicateIdValidator.ts        [EXISTS]
│
└── visualization/
    ├── ui/
    │   ├── KnowledgeViewController.ts         [MODIFY]
    │   └── knowledge/
    │       └── ValidationResultsModal.ts      [CREATE NEW]
    │
    └── styles/
        └── components/
            └── knowledge.css                  [MODIFY - add validation styles]
```

---

## Success Criteria

### ✅ Definition of Done

1. **ValidationResultsModal component exists**
   - Shows all validation results clearly
   - Displays summary, checklist, threats, detailed log
   - Handles user decision (proceed/cancel)

2. **Import flow integrates validation**
   - Orchestrator runs on every import
   - Modal shown only when issues detected
   - Clean templates import immediately

3. **Security template test passes**
   - Detects XSS, Prompt Injection, Unicode issues
   - Shows correct error counts
   - Allows user to proceed or cancel
   - Uses sanitized data if user proceeds

4. **Structure template test passes**
   - Detects schema errors, duplicate IDs
   - Shows appropriate warnings
   - User can make informed decision

5. **Valid template test passes**
   - No modal shown
   - Imports immediately
   - Success notification displayed

6. **Code quality**
   - Proper error handling
   - TypeScript types correct
   - Logging for debugging
   - Comments for complex logic

---

## Risk Assessment

### Low Risk
- Validation orchestrator already exists and tested
- Validators are independent and don't break existing code
- Worst case: validation fails silently, import proceeds as before

### Medium Risk
- Modal UI complexity - ensure proper styling and UX
- User decision flow - ensure no race conditions
- Large validation results - ensure modal scrolls properly

### Mitigation
- Test thoroughly with both test templates
- Add console logging for debugging
- Keep existing basic validation as fallback
- Graceful degradation if validation throws error

---

## Timeline

### Estimated Time Breakdown
1. **Create ValidationResultsModal**: 90 minutes
   - Modal structure and layout: 30 min
   - Summary and checklist rendering: 30 min
   - Threats and detailed log: 20 min
   - Styling: 10 min

2. **Integrate validation**: 45 minutes
   - Import orchestrator and validators: 15 min
   - Wire up to import flow: 20 min
   - Handle user decision: 10 min

3. **Testing**: 45 minutes
   - Test security template: 15 min
   - Test structure template: 15 min
   - Test valid template: 5 min
   - Fix bugs and refine: 10 min

**Total: ~3 hours**

---

## Next Steps

1. ✅ Create this implementation plan
2. Build ValidationResultsModal component
3. Integrate validation into import flow
4. Test with all three scenarios
5. Build and package VSIX
6. Update test-templates/README.md with actual results

---

## Notes

- **Bundled templates**: Skip validation entirely (trusted source)
- **Sanitization**: Use `validationResult.sanitizedData` when available
- **User override**: Always allow user to proceed (informed consent model)
- **Logging**: Log validation results for debugging
- **Future**: Could add "Always trust templates from this source" checkbox

---

**Status**: Plan Complete ✅
**Next**: Begin implementation of ValidationResultsModal component
