# Loading Agent Brain Intelligence Documents

**Version**: 0.2.0-alpha
**Feature**: Knowledge Injection System
**Last Updated**: 2025-10-07

---

## Overview

Agent Brain's **Knowledge Injection System** enables you to load organizational knowledge, domain expertise, and best practices from markdown or JSON files. This guide explains how to load the Agent Brain intelligence documents (ADRs, Patterns, Golden Paths, Planning Templates) into the system.

---

## Quick Start

### Method 1: Intelligence Loader Script (Recommended)

The simplest way to load Agent Brain's built-in intelligence documents:

```typescript
import { loadIntelligencePackages } from '@agent-brain/core';

await loadIntelligencePackages({
  intelligencePath: 'docs/agent_brain_intelligence',
  storagePath: '.agent-brain',
  onProgress: (msg) => console.log(msg)
});
```

**What It Does:**
- Loads all 4 markdown files from `docs/agent_brain_intelligence/`
- Converts them to expertise packages
- Saves to `.agent-brain/packages/`
- Returns detailed statistics

**Progress Output:**
```
Loading intelligence packages...
Loading ADRs from docs/agent_brain_intelligence/adrs.md
Loading Patterns from docs/agent_brain_intelligence/patterns.md
Loading Golden Paths from docs/agent_brain_intelligence/golden_paths.md
Loading Planning Templates from docs/agent_brain_intelligence/planning_templates.md
Successfully loaded 4 packages
```

---

## Method 2: Using KnowledgeSystem

For more control over package loading:

```typescript
import { KnowledgeSystem } from '@agent-brain/core';

// Create knowledge system
const knowledge = new KnowledgeSystem(
  patternSystem,
  adrSystem,
  learningSystem,
  {
    packageStoragePath: '.agent-brain'
  }
);

// Load individual files
await knowledge.loadPackageFromFile(
  'docs/agent_brain_intelligence/adrs.md'
);
await knowledge.loadPackageFromFile(
  'docs/agent_brain_intelligence/patterns.md'
);
await knowledge.loadPackageFromFile(
  'docs/agent_brain_intelligence/golden_paths.md'
);
await knowledge.loadPackageFromFile(
  'docs/agent_brain_intelligence/planning_templates.md'
);
```

**Benefits:**
- Load specific files only
- Control loading order
- Access packages immediately after loading

---

## Method 3: Using PackageImporter

For advanced import scenarios:

```typescript
import { PackageImporter } from '@agent-brain/core';

const importer = new PackageImporter(packageManager);

const result = await importer.importFromFile(
  'docs/agent_brain_intelligence/adrs.md',
  {
    validate: true,
    checkConflicts: true,
    autoResolve: true,
    onProgress: (msg) => console.log(msg)
  }
);

console.log(`Imported: ${result.package.name}`);
console.log(`Duration: ${result.duration}ms`);
console.log(`Conflicts: ${result.conflicts?.length || 0}`);
```

**Advanced Options:**
- `validate` - Validate package structure before importing
- `checkConflicts` - Detect conflicts with existing packages
- `autoResolve` - Automatically resolve conflicts using authority hierarchy
- `onProgress` - Callback for progress updates

---

## Method 4: Standalone Script

Run as standalone Node.js script:

```typescript
import { runIntelligenceLoader } from '@agent-brain/core';

// Run from command line
await runIntelligenceLoader();
```

**Command Line:**
```bash
node -r ts-node/register packages/core/src/domains/expertise/loadIntelligencePackages.ts
```

---

## Understanding the Intelligence Documents

Agent Brain ships with 4 core intelligence documents:

### 1. ADRs (Architectural Decision Records)
**File**: `docs/agent_brain_intelligence/adrs.md`
**Converts To**: ExpertiseRules

**Content:**
- System architecture decisions
- Design principles
- Technical constraints
- Rationale for key choices

**Example Rule:**
```markdown
## ADR-001: Layered Architecture

**Decision**: Use layered architecture with clear domain boundaries

**Rationale**: Separation of concerns, testability, maintainability

**Requirement**: All code must respect domain boundaries
```

### 2. Patterns (Best Practices)
**File**: `docs/agent_brain_intelligence/patterns.md`
**Converts To**: ExpertisePatterns

**Content:**
- Coding patterns
- Design patterns
- Common solutions
- Template code

**Example Pattern:**
```markdown
## Pattern: Repository Pattern

**Description**: Encapsulate data access behind repository interface

**Template**:
```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
}
```
```

### 3. Golden Paths (Success Patterns)
**File**: `docs/agent_brain_intelligence/golden_paths.md`
**Converts To**: ExpertisePatterns (with success markers)

**Content:**
- Proven successful approaches
- Step-by-step workflows
- Quality criteria
- Success metrics

**Example Golden Path:**
```markdown
## Golden Path: Feature Implementation

**Steps**:
1. Create planning document
2. Implement core logic
3. Add tests
4. Update documentation

**Success Criteria**:
- All tests pass
- Documentation updated
- Code reviewed
```

### 4. Planning Templates
**File**: `docs/agent_brain_intelligence/planning_templates.md`
**Converts To**: PlanningTemplates

**Content:**
- Structured planning requirements
- Required sections
- Completion criteria
- Trigger patterns

**Example Template:**
```markdown
## Template: Feature Implementation

**Triggers**: implement, create, build, develop

**Sections**:

### Problem Analysis [REQUIRED]
Analyze the problem and requirements

### Technical Approach [REQUIRED]
Describe the technical solution

### Implementation Steps [REQUIRED]
List specific implementation steps

### Testing Strategy [REQUIRED]
Describe how to test the feature
```

---

## Using Loaded Packages

Once packages are loaded, you can use them for:

### 1. Planning Enforcement

```typescript
import { PromptEnhancer, PlanningEngine } from '@agent-brain/core';

// Get matching templates
const templates = knowledge.getMatchingPlanningTemplates('implement feature');

// Create planning engine
const planningEngine = new PlanningEngine(templates);

// Create enhancer with Stage 5
const enhancer = new PromptEnhancer(
  successDetector,
  profileManager,
  planningEngine
);

// Enhance prompt (will enforce planning)
const result = await enhancer.enhance(
  'implement user authentication',
  { language: 'typescript' }
);
```

### 2. Code Validation

```typescript
const code = `
function processData(data) {
  // Missing input validation!
  return data.map(item => item.value);
}
`;

const result = knowledge.validateCode(code, {
  language: 'javascript',
  strictMode: true
});

if (!result.valid) {
  console.log(`Found ${result.violations.length} violations`);
  const fixed = knowledge.applyAutoFixes(code, result);
}
```

### 3. Merged Package Content

```typescript
// Get all packages merged by authority
const merged = knowledge.getMergedPackages();

console.log('Rules:', merged.rules.length);
console.log('Patterns:', merged.patterns.length);
console.log('Planning Templates:', merged.planningTemplates.length);
console.log('Conflicts Resolved:', merged.resolvedConflicts.length);
```

### 4. Scope Filtering

```typescript
// Get mandatory rules only
const mandatoryRules = knowledge.getMandatoryRules();

// Get packages for specific context
const packages = knowledge.getLoadedPackages().filter(pkg => {
  if (!pkg.scope) return true;
  return pkg.scope.languages?.includes('typescript');
});
```

---

## Integration with VSCode Extension

The VSCode extension automatically loads intelligence documents on activation:

```typescript
// In extension.ts
export async function activate(context: vscode.ExtensionContext) {
  // ... setup code ...

  // Load Agent Brain intelligence
  try {
    await loadIntelligencePackages({
      intelligencePath: path.join(workspaceRoot, 'docs/agent_brain_intelligence'),
      storagePath: path.join(workspaceRoot, '.agent-brain'),
      onProgress: (msg) => console.log(msg)
    });
  } catch (error) {
    console.error('Failed to load intelligence packages:', error);
  }

  // ... register providers ...
}
```

---

## Verifying Package Storage

After loading, verify packages were saved correctly:

```bash
# Check storage directory
ls -la .agent-brain/packages/

# Should see:
# agent_brain_adrs.json
# agent_brain_patterns.json
# agent_brain_golden_paths.json
# agent_brain_planning_templates.json
```

**Package File Example** (`.agent-brain/packages/agent_brain_adrs.json`):
```json
{
  "id": "agent-brain.adrs",
  "name": "Agent Brain ADRs",
  "version": "1.0.0",
  "authority": "organizational",
  "enforcement": "mandatory",
  "domain": "software-engineering",
  "rules": [
    {
      "id": "adr-001",
      "name": "Layered Architecture",
      "category": "architecture",
      "severity": "error",
      "condition": {
        "patterns": ["cross-layer access"],
        "context": ["typescript"]
      },
      "requirement": "All code must respect domain boundaries",
      "rationale": "Separation of concerns, testability"
    }
  ]
}
```

---

## Integration Example: Timeline Provider

The timeline provider uses loaded intelligence for enhanced rendering:

```typescript
import { KnowledgeSystem } from '@agent-brain/core';

class TimelineProvider {
  private knowledge: KnowledgeSystem;

  constructor(knowledge: KnowledgeSystem) {
    this.knowledge = knowledge;
  }

  async renderTimeline(events: Event[]) {
    // Get success patterns
    const merged = this.knowledge.getMergedPackages();
    const successPatterns = merged.patterns.filter(p =>
      p.metadata?.type === 'golden-path'
    );

    // Apply patterns to event analysis
    for (const event of events) {
      const matchingPatterns = this.findMatchingPatterns(
        event,
        successPatterns
      );

      event.metadata.suggestedPatterns = matchingPatterns;
    }

    // Render with pattern suggestions
    return this.render(events);
  }
}
```

---

## Troubleshooting

### Issue: "File not found" error

**Cause**: Intelligence files not in expected location

**Solution**:
```typescript
// Specify absolute path
const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
const intelligencePath = path.join(workspaceRoot, 'docs/agent_brain_intelligence');

await loadIntelligencePackages({
  intelligencePath,
  storagePath: path.join(workspaceRoot, '.agent-brain')
});
```

### Issue: Packages not loading

**Cause**: Missing markdown files

**Solution**: Verify all 4 files exist:
```bash
ls docs/agent_brain_intelligence/
# Should show:
# adrs.md
# patterns.md
# golden_paths.md
# planning_templates.md
```

### Issue: Validation errors

**Cause**: Invalid markdown structure

**Solution**: Check markdown format follows expected structure:
- ADRs: `## ADR-XXX: Title`
- Patterns: `## Pattern: Name`
- Golden Paths: `## Golden Path: Name`
- Planning Templates: `## Template: Name`

### Issue: Storage permission errors

**Cause**: No write access to `.agent-brain/` directory

**Solution**:
```typescript
import * as fs from 'fs';

// Ensure directory exists with proper permissions
const storagePath = '.agent-brain/packages';
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true, mode: 0o755 });
}
```

---

## Advanced Usage

### Custom Package Loading

Load your own organizational packages:

```typescript
// Load organizational package
await knowledge.loadPackageFromFile('packages/company-standards.json');

// Load domain expert package
await knowledge.loadPackageFromFile('packages/react-best-practices.json');

// Load vendor specification
await knowledge.loadPackageFromFile('packages/aws-guidelines.json');

// Authority hierarchy automatically resolves conflicts:
// organizational > domain-expert > vendor-spec > community
```

### Package Export

Export loaded packages for sharing:

```typescript
import { PackageExporter } from '@agent-brain/core';

const exporter = new PackageExporter(packageManager);

// Export single package
await exporter.exportToFile(
  'agent-brain.adrs',
  'exports/adrs-package.json'
);

// Export with dependencies
await exporter.exportWithDependencies(
  'agent-brain.adrs',
  'exports/adrs-bundle.json'
);

// Export to markdown
await exporter.exportToMarkdown(
  'agent-brain.adrs',
  'exports/adrs-documentation.md'
);

// Bundle multiple packages
await exporter.bundleForSharing(
  ['agent-brain.adrs', 'agent-brain.patterns'],
  'exports/agent-brain-bundle.json'
);
```

---

## API Reference

### loadIntelligencePackages()

```typescript
async function loadIntelligencePackages(
  options: LoadIntelligenceOptions
): Promise<LoadIntelligenceResult>
```

**Options:**
- `intelligencePath: string` - Path to intelligence documents directory
- `storagePath: string` - Path to `.agent-brain` directory
- `onProgress?: (message: string) => void` - Progress callback

**Returns:**
```typescript
{
  packagesLoaded: number;      // Number of packages loaded
  totalRules: number;          // Total rules across all packages
  totalPatterns: number;       // Total patterns
  totalTemplates: number;      // Total planning templates
  duration: number;            // Loading duration (ms)
}
```

### KnowledgeSystem.loadPackageFromFile()

```typescript
async loadPackageFromFile(filePath: string): Promise<ExpertisePackage>
```

**Parameters:**
- `filePath: string` - Path to JSON or markdown file

**Returns**: Loaded ExpertisePackage

**Throws**: Error if file not found or invalid format

### KnowledgeSystem.getMatchingPlanningTemplates()

```typescript
getMatchingPlanningTemplates(prompt: string): PlanningTemplate[]
```

**Parameters:**
- `prompt: string` - User prompt to match against

**Returns**: Array of matching PlanningTemplates, sorted by score

---

## Best Practices

1. **Load Early**: Load intelligence packages during application initialization
2. **Handle Errors**: Wrap loading in try-catch for graceful degradation
3. **Use Progress Callbacks**: Provide user feedback during long loads
4. **Verify Storage**: Check `.agent-brain/packages/` directory after loading
5. **Cache Packages**: Keep loaded packages in memory for fast access
6. **Authority Hierarchy**: Organizational packages override others
7. **Scope Filtering**: Use scope to apply packages to specific contexts only

---

## Related Documentation

- `KNOWLEDGE_INJECTION_COMPLETE.md` - Complete implementation summary
- `KNOWLEDGE_INJECTION_IMPLEMENTATION_PLAN.md` - Original implementation plan
- `WEEKS_1-3_COMPLETE.md` - Detailed technical implementation notes
- `docs/agent_brain_intelligence/` - Intelligence document sources

---

## Support

For issues or questions:
- GitHub Issues: [agent-brain-platform/issues](https://github.com/your-org/agent-brain-platform/issues)
- Documentation: `docs/`
- Examples: See `packages/vscode/src/extension.ts` for integration example

---

**Last Updated**: 2025-10-07
**Version**: 0.2.0-alpha (Knowledge Injection System)
