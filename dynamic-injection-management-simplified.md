# Dynamic Injection Management - Implementation Guide
## Group-Based Knowledge Injection with Event-Driven Scanning

**Purpose**: Enable group-based knowledge injection with on-demand scanning  
**Version**: 2.0  
**Date**: 2025-01-07

---

## 1. Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────┐
│                  Knowledge Table UI                  │
│  (Shows groups, items, injection status, controls)   │
└──────────────────────┬──────────────────────────────┘
                       │ Focus Lost / Save / Cancel
                       ▼
┌─────────────────────────────────────────────────────┐
│               Update Validation Dialog               │
│  (Confirms injection updates on navigation)          │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               Group Manager Service                  │
│  (Handles injection/removal operations)              │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Claude.md Scanner Service               │
│  (On-demand parsing to read current file state)      │
└─────────────────────────────────────────────────────┘
```

### Event-Driven Scanning

```typescript
enum ScanTrigger {
  FILE_LOAD = 'file_load',           // Opening a file
  POST_INJECTION = 'post_injection',  // After injecting groups
  POST_REMOVAL = 'post_removal',      // After removing groups
  CONFIG_CHANGE = 'config_change',    // Maturity settings changed
  FOCUS_LOST = 'focus_lost'          // Navigation/save/cancel
}
```

---

## 2. Extended Group Markers in Injection Files

### Current State (Templates Only)
```markdown
<!-- AGENT-BRAIN-TEMPLATE-START: template-id-here -->
...template items...
<!-- AGENT-BRAIN-TEMPLATE-END: template-id-here -->
```

### Extended Marker System for All Group Types

```markdown
<!-- Group Type: TEMPLATE -->
<!-- AGENT-BRAIN-GROUP-START: TYPE=TEMPLATE ID=agent-brain-base VERSION=1.0.0 -->
...items...
<!-- AGENT-BRAIN-GROUP-END: TYPE=TEMPLATE ID=agent-brain-base -->

<!-- Group Type: MATURITY-OPERATOR -->
<!-- AGENT-BRAIN-GROUP-START: TYPE=OPERATOR_RANGE ID=mid-senior RANGE=3-4 -->
...items for mid to senior operators...
<!-- AGENT-BRAIN-GROUP-END: TYPE=OPERATOR_RANGE ID=mid-senior -->

<!-- Group Type: MATURITY-PROJECT -->
<!-- AGENT-BRAIN-GROUP-START: TYPE=PROJECT_RANGE ID=dev-established RANGE=3-4 -->
...items for development to established phases...
<!-- AGENT-BRAIN-GROUP-END: TYPE=PROJECT_RANGE ID=dev-established -->

<!-- Group Type: MATURITY-COMPLEXITY -->
<!-- AGENT-BRAIN-GROUP-START: TYPE=COMPLEXITY_RANGE ID=standard RANGE=2 -->
...items for standard complexity...
<!-- AGENT-BRAIN-GROUP-END: TYPE=COMPLEXITY_RANGE ID=standard -->

<!-- Group Type: CATCHMENT -->
<!-- AGENT-BRAIN-GROUP-START: TYPE=CATCHMENT ID=in-scope STATUS=IN -->
...items fully within catchment basin...
<!-- AGENT-BRAIN-GROUP-END: TYPE=CATCHMENT ID=in-scope -->

<!-- Individual Items (remain unchanged) -->
<!-- AGENT-BRAIN-KNOWLEDGE: unique-item-id -->
```

### Marker Metadata

```typescript
interface GroupMarker {
  type: 'TEMPLATE' | 'OPERATOR_RANGE' | 'PROJECT_RANGE' | 
        'COMPLEXITY_RANGE' | 'CATCHMENT';
  id: string;
  
  // Optional metadata
  version?: string;        // For templates
  range?: string;          // For maturity ranges (e.g., "3-4")
  status?: 'IN' | 'PARTIAL' | 'OUT';  // For catchment
  injectedAt?: string;     // ISO timestamp
}
```

---

## 3. Simplified Scanner Service

### Scanner Purpose

The scanner **only reports the current state** of a file when asked. It does not:
- Watch for changes
- Cache results
- Compare with previous states
- Maintain any persistent state

### Scanner Implementation

```typescript
class ClaudeMdScanner {
  /**
   * Scan a claude.md file for groups and items
   * Called on-demand when we need to know what's in a file
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const result: ScanResult = {
      groups: [],
      individualItems: [],
      orphanedItems: [],  // Items outside any group
      totalInjectionCount: 0,
      warnings: []
    };
    
    let currentGroup: GroupDefinition | null = null;
    let groupContent: string[] = [];
    let groupStartLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for group start
      const startMatch = line.match(/<!-- AGENT-BRAIN-GROUP-START: (.*) -->/);
      if (startMatch) {
        if (currentGroup) {
          result.warnings.push(`Nested group at line ${i + 1}`);
        }
        
        currentGroup = this.parseGroupMarker(startMatch[1]);
        groupContent = [];
        groupStartLine = i;
        continue;
      }
      
      // Check for group end
      const endMatch = line.match(/<!-- AGENT-BRAIN-GROUP-END: TYPE=(\w+) ID=([\w-]+) -->/);
      if (endMatch) {
        if (!currentGroup) {
          result.warnings.push(`Orphaned group end at line ${i + 1}`);
        } else if (endMatch[1] !== currentGroup.type || endMatch[2] !== currentGroup.id) {
          result.warnings.push(`Mismatched group end at line ${i + 1}`);
        } else {
          // Valid group found
          const groupItems = this.extractItemsFromContent(groupContent.join('\n'));
          result.groups.push({
            ...currentGroup,
            content: groupContent.join('\n'),
            itemCount: groupItems.length,
            lineStart: groupStartLine,
            lineEnd: i
          });
          result.totalInjectionCount++;
          currentGroup = null;
          groupContent = [];
        }
        continue;
      }
      
      // Check for individual items outside groups
      const itemMatch = line.match(/<!-- AGENT-BRAIN-KNOWLEDGE: ([\w-]+) -->/);
      if (itemMatch && !currentGroup) {
        result.individualItems.push({
          id: itemMatch[1],
          line: i + 1
        });
        result.totalInjectionCount++;
      }
      
      // Accumulate group content
      if (currentGroup) {
        groupContent.push(line);
      }
    }
    
    // Check for unclosed group
    if (currentGroup) {
      result.warnings.push(`Unclosed group: ${currentGroup.type}:${currentGroup.id}`);
    }
    
    return result;
  }
  
  /**
   * Parse group marker attributes
   */
  private parseGroupMarker(markerText: string): GroupDefinition {
    const attributes = new Map<string, string>();
    
    // Parse key=value pairs
    const pairs = markerText.match(/(\w+)=([^\s]+)/g) || [];
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      attributes.set(key, value);
    }
    
    return {
      type: attributes.get('TYPE') as any,
      id: attributes.get('ID') || 'unknown',
      version: attributes.get('VERSION'),
      range: attributes.get('RANGE'),
      status: attributes.get('STATUS') as any,
      injectedAt: attributes.get('INJECTED_AT')
    };
  }
  
  /**
   * Extract individual items from group content
   */
  private extractItemsFromContent(content: string): string[] {
    const items: string[] = [];
    const itemMatches = content.matchAll(/<!-- AGENT-BRAIN-KNOWLEDGE: ([\w-]+) -->/g);
    
    for (const match of itemMatches) {
      items.push(match[1]);
    }
    
    return items;
  }
  
  /**
   * Scan all claude.md files in workspace
   * Used when configuration changes affect all files
   */
  async scanAllFiles(workspacePath: string): Promise<Map<string, ScanResult>> {
    const results = new Map<string, ScanResult>();
    
    // Find all claude.md files
    const files = await vscode.workspace.findFiles('**/*.claude.md');
    
    for (const file of files) {
      const result = await this.scanFile(file.fsPath);
      results.set(file.fsPath, result);
    }
    
    return results;
  }
}
```

---

## 4. Focus-Based Update Triggers

### Focus Lost Handler

```typescript
class FocusUpdateHandler {
  private pendingChanges: GroupChange[] = [];
  
  /**
   * Called when user navigates away, saves, or cancels
   */
  async handleFocusLost(event: FocusEvent): Promise<void> {
    // Check if there are pending injection changes
    if (!this.hasPendingChanges()) {
      return; // No validation needed
    }
    
    // Show validation dialog
    const result = await this.showValidationDialog();
    
    if (result === 'update') {
      await this.applyPendingChanges();
    } else if (result === 'discard') {
      this.discardPendingChanges();
    }
    // 'cancel' means stay on page
  }
  
  /**
   * Show validation dialog
   */
  private async showValidationDialog(): Promise<'update' | 'discard' | 'cancel'> {
    const message = `You have pending injection changes. 
    Do you want to update all injections with the new combination of knowledge items?`;
    
    const update = 'Update Injections';
    const discard = 'Discard Changes';
    const cancel = 'Stay on Page';
    
    const result = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      update,
      discard,
      cancel
    );
    
    if (result === update) return 'update';
    if (result === discard) return 'discard';
    return 'cancel';
  }
  
  /**
   * Apply all pending injection changes
   */
  private async applyPendingChanges(): Promise<void> {
    for (const change of this.pendingChanges) {
      await this.injectionManager.applyChange(change);
    }
    
    // Clear pending changes
    this.pendingChanges = [];
    
    // Scan to verify
    await this.triggerScan(ScanTrigger.POST_INJECTION);
    
    // Update UI
    this.ui.refresh();
  }
  
  /**
   * Register UI elements that trigger focus lost
   */
  registerFocusElements(): void {
    // Save button
    this.ui.saveButton.addEventListener('click', () => {
      this.handleFocusLost({ type: 'save' });
    });
    
    // Cancel button  
    this.ui.cancelButton.addEventListener('click', () => {
      this.handleFocusLost({ type: 'cancel' });
    });
    
    // Navigation away
    window.addEventListener('beforeunload', (e) => {
      if (this.hasPendingChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved injection changes';
      }
    });
  }
}
```

---

## 5. Scan Trigger Implementation

### When to Scan

```typescript
class ScanController {
  private scanner: ClaudeMdScanner;
  private currentFile: string | null = null;
  
  /**
   * Trigger a scan based on event
   */
  async triggerScan(trigger: ScanTrigger, target?: string): Promise<void> {
    switch (trigger) {
      case ScanTrigger.FILE_LOAD:
        // Scan the file being opened
        await this.scanSingleFile(target || this.currentFile);
        break;
        
      case ScanTrigger.POST_INJECTION:
        // Scan current file after injection
        await this.scanSingleFile(this.currentFile);
        this.updateInjectionCount();
        break;
        
      case ScanTrigger.POST_REMOVAL:
        // Scan current file after removal
        await this.scanSingleFile(this.currentFile);
        this.updateInjectionCount();
        break;
        
      case ScanTrigger.CONFIG_CHANGE:
        // Scan all files when maturity config changes
        await this.scanAllFilesAndUpdate();
        break;
        
      case ScanTrigger.FOCUS_LOST:
        // Validate pending changes
        await this.focusHandler.handleFocusLost();
        break;
    }
  }
  
  /**
   * Scan a single file and update UI
   */
  private async scanSingleFile(filePath: string): Promise<void> {
    const result = await this.scanner.scanFile(filePath);
    
    // Update UI with scan results
    this.ui.updateFileStatus({
      filePath,
      totalGroups: result.groups.length,
      individualItems: result.individualItems.length,
      totalInjections: result.totalInjectionCount,
      warnings: result.warnings
    });
  }
  
  /**
   * Scan all files (for config changes)
   */
  private async scanAllFilesAndUpdate(): Promise<void> {
    const results = await this.scanner.scanAllFiles(this.workspacePath);
    
    // Update UI with all file statuses
    for (const [filePath, result] of results) {
      this.ui.updateFileStatus({
        filePath,
        totalGroups: result.groups.length,
        individualItems: result.individualItems.length,
        totalInjections: result.totalInjectionCount,
        warnings: result.warnings
      });
    }
  }
  
  /**
   * Update injection count in status bar
   */
  private updateInjectionCount(): void {
    const result = this.lastScanResult;
    this.ui.statusBar.setText(
      `📚 ${result.totalInjectionCount} injection segments`
    );
  }
}
```

---

## 6. Visual Interface Design

### Knowledge Table UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Knowledge Center                                    [⚙️ Settings] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ View: [By Template ▼] [Catchment] [Operator] [Project]          │
│                                                                  │
│ Context: Mid Developer / Development Phase / Standard           │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 📊 Current File: main.claude.md                          │   │
│ │    12 injection segments (8 groups, 4 individual items)  │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ ✅ IN SCOPE (421 items)                 [💉 Inject] [🗑️ Remove] │
│ ─────────────────────────────────────────────────────────────   │
│ ▼ 📦 Agent Brain Base              8 items • ✅ Injected       │
│                                                                  │
│ ▼ 📦 General Learnings             0 items • ⚪ Not injected    │
│                                                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ ⭕ PARTIAL SCOPE (127 items)            [💉 Inject] [🗑️ Remove] │
│ ─────────────────────────────────────────────────────────────   │
│ ▶ Show 4 groups...                                             │
│                                                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ ❌ OUT OF SCOPE (505 items)             [🗑️ Remove if injected]│
│ ─────────────────────────────────────────────────────────────   │
│ ▶ Show 12 groups...                                            │
│                                                                  │
│ ─────────────────────────────────────────────────────────────   │
│ [💾 Save Changes] [❌ Cancel]                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Injection Status Indicators

```typescript
interface InjectionStatus {
  // Per group
  notInjected: '⚪ Not injected';
  injected: '✅ Injected';
  partial: '🔵 Partially injected';  // Some items from group
  pending: '🔄 Pending';              // Changes not yet saved
  
  // File level
  fileStatus: {
    segments: number;     // Total injection segments in file
    groups: number;       // Number of group injections
    individual: number;   // Number of individual item injections
  };
}
```

---

## 7. Maturity Configuration Change Flow

### When User Changes Maturity Settings

```typescript
class MaturityChangeHandler {
  /**
   * Handle maturity context change
   */
  async handleMaturityChange(
    oldContext: MaturityContext,
    newContext: MaturityContext
  ): Promise<void> {
    // 1. Mark change as pending
    this.markPendingChange({
      type: 'maturity_change',
      oldContext,
      newContext
    });
    
    // 2. Trigger scan of all files to recompute groupings
    await this.scanController.triggerScan(ScanTrigger.CONFIG_CHANGE);
    
    // 3. Update UI to show new groupings
    this.ui.updateGroupings(newContext);
    
    // 4. Show notification
    this.ui.showNotification(
      'Maturity context changed. Save or navigate away to update injections.'
    );
    
    // 5. Focus lost will trigger validation
    // User can continue adjusting settings
    // All changes batch together until save/navigate
  }
}
```

---

## 8. Implementation Priority

### Phase 1: Core Scanner (Days 1-2)
- [ ] Implement ClaudeMdScanner class (read-only)
- [ ] Parse extended group markers
- [ ] Create ScanController with trigger events
- [ ] Return injection counts and warnings

### Phase 2: UI Integration (Days 3-4)
- [ ] Add focus lost handlers
- [ ] Implement validation dialog
- [ ] Update status display with scan results
- [ ] Add save/cancel buttons

### Phase 3: Group Operations (Days 5-6)
- [ ] Extend injection manager for all group types
- [ ] Generate proper markers for each group type
- [ ] Implement group removal
- [ ] Handle individual items vs groups

### Phase 4: Testing & Polish (Days 7-8)
- [ ] Handle malformed markers gracefully
- [ ] Test all trigger scenarios
- [ ] Optimize scanning performance
- [ ] Add comprehensive error handling

---

## 9. Error Handling

### Malformed Markers
```typescript
// Scanner should continue despite errors
if (malformedMarker) {
  result.warnings.push(`Line ${lineNum}: Invalid marker format`);
  continue; // Skip but don't crash
}
```

### Missing Groups
```typescript
// If group end without start
if (!currentGroup && endMarker) {
  result.warnings.push(`Orphaned group end at line ${lineNum}`);
  continue;
}
```

### File Access Issues
```typescript
try {
  const content = await fs.readFile(filePath, 'utf-8');
} catch (error) {
  return {
    groups: [],
    individualItems: [],
    totalInjectionCount: 0,
    warnings: [`Could not read file: ${error.message}`]
  };
}
```

---

## 10. Migration from Current System

### Backwards Compatibility

The scanner should recognize both old and new marker formats:

```typescript
// Support old template markers during transition
const oldTemplateStart = line.match(/<!-- AGENT-BRAIN-TEMPLATE-START: ([\w-]+) -->/);
if (oldTemplateStart) {
  // Convert to new format internally
  currentGroup = {
    type: 'TEMPLATE',
    id: oldTemplateStart[1],
    version: 'legacy'
  };
}
```

### Auto-conversion

When injecting a template with old format:
1. Remove old markers
2. Insert new format markers
3. Preserve content exactly

---

## Summary

This simplified implementation:
1. **No file watching** - scans only when explicitly triggered
2. **Focus-based validation** - updates happen on navigation/save/cancel
3. **Simple scanner** - just reads and reports current state
4. **Clear markers** - extended start/end tags for all group types
5. **Event-driven** - specific triggers for scanning

The system maintains simplicity while providing the flexibility needed for multi-dimensional knowledge organization.
