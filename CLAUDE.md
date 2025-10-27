# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Brain Platform is a VSCode extension for AI-assisted development with timeline visualization and knowledge management.

## Architecture

### Tech Stack
- **Language**: TypeScript 5.3+ (strict mode)
- **Platform**: VSCode Extension API 1.80+
- **Build System**: Lerna 8.2+ monorepo with npm workspaces
- **Bundler**: Webpack 5 (production optimization)
- **Visualization**: D3.js 7.9+ for timeline rendering
- **Testing**: Jest (unit tests), TSC for type checking
- **i18n**: VSCode's vscode-nls system with @vscode/l10n-dev

### Monorepo Structure
```
agent-brain-platform/
├── packages/
│   ├── core/          # Domain logic, data models, business rules
│   └── vscode/        # VSCode-specific extension implementation
├── docs/              # Architecture diagrams and documentation
├── l10n/              # Root i18n translations (source of truth)
└── .agent-brain/      # Knowledge base, templates, sessions
```

### Package Architecture

**@agent-brain/core** (packages/core/):
- **domains/events**: Canonical event model, providers (Git, GitHub, Knowledge, Sessions)
- **domains/knowledge**: Knowledge management system (V1 templates, validation, maturity filtering)
- **domains/visualization**: D3 timeline, webview UI controllers, i18n system
- **infrastructure**: Logging, configuration, shared utilities
- No VSCode dependencies - pure TypeScript domain logic

**agent-brain-platform** (packages/vscode/):
- **src/extension.ts**: Extension activation, command registration
- **src/providers/**: VSCode-specific event providers (wraps core providers)
- **src/services/**: Knowledge file I/O, i18n service
- **dist/**: Webpack output (bundled extension.js + webview.js)
- Depends on @agent-brain/core

### Key Domains

**Events Domain** (Timeline Data):
- Canonical event model (timestamp, author, impact, visualization hints)
- Multi-source providers: GitLocal, GitHub, KnowledgeEvents, SessionJournals
- Provider orchestration and event merging
- Data flows: Providers → CanonicalEvent[] → Timeline visualization

**Knowledge Domain** (Templates & Items):
- V1 template system: Templates contain embedded knowledge items
- Types: ADR, design-pattern, golden-path, best-practice, standard, etc.
- Validation: Multi-layer (schema, security, business rules)
- Maturity filtering: Context-based (complexity × quadrant × maxItems)
- Storage: File-based in `.agent-brain/templates/`

**Visualization Domain** (UI & Rendering):
- D3-based timeline with zoom/pan, event nodes, filtering
- Webview architecture: main.ts orchestrates view controllers
- Controllers: SessionViewController, KnowledgeViewController
- i18n system with event-based initialization (onI18nReady)
- Styling: Modular CSS with cosmic theme

### Data Flow

**Extension Startup**:
1. Extension activates (extension.ts)
2. Providers initialize (Git, Knowledge, Sessions)
3. Webview created, HTML/CSS/JS bundled
4. i18n translations loaded → webview receives i18n:init message
5. View controllers initialize → render UI

**Timeline Rendering**:
1. User opens timeline view
2. Extension fetches events from all enabled providers
3. Events merged, sorted by timestamp
4. Sent to webview via postMessage
5. D3 renders timeline nodes, axis, interactions

**Knowledge Management**:
1. Templates loaded from `.agent-brain/templates/`
2. Validation pipeline runs (schema → security → business)
3. Valid templates stored in TemplateStore (in-memory)
4. UI renders table with expansion/collapse
5. User actions (CRUD) → backend → file I/O → state update → UI refresh

**Maturity Filtering**:
1. User configures context (complexity, quadrant, maxItems)
2. Context saved to backend storage
3. Filter applied to knowledge items based on maturity metadata
4. Only relevant items shown in UI

### Design Patterns

**Separation of Concerns**:
- Core package: Platform-agnostic business logic
- VSCode package: Platform-specific integration
- Enables future CLI, web, or other platforms

**Provider Pattern**:
- Event providers implement common interface
- Coordinator orchestrates multiple providers
- Easy to add new sources (Jira, Linear, etc.)

**Controller Pattern** (Visualization):
- SessionViewController: Manages timeline tab
- KnowledgeViewController: Manages knowledge tab
- Sub-controllers: V1TemplatesTableController, MaturityConfigPanel
- Each controller owns its DOM section + event handlers

**Store Pattern** (Knowledge):
- KnowledgeStore: In-memory indexed storage for items
- TemplateStore: Manages templates with embedded items
- Indexes for fast filtering (type, scope, tags)

**Validation Pipeline**:
- Orchestrator coordinates multiple validators
- Each validator has single responsibility
- Security validators: XSS, prompt injection, path traversal
- Business validators: Duplicate IDs, maturity metadata

**Event-Based i18n**:
- Translations loaded asynchronously
- Components register listeners via onI18nReady()
- Re-render when translations available
- Prevents raw key display in UI

### Critical Paths

**i18n System**:
- Source: `/l10n/bundle.l10n.json` (root)
- Build: Webpack copies to `packages/vscode/l10n/`
- Runtime: Extension loads → sends to webview via i18n:init
- Components: Listen for onI18nReady(), re-render with translations

**Template Injection**:
- Templates can inject into CLAUDE.md or other files
- Markers: `<!-- AGENT-BRAIN:template-{id}:START -->` ... `END -->`
- Supports nested item markers
- Used for project-specific AI guidance

**Pathway Logging** (Development):
- Configurable logging system with pathways (INGEST, FILTER, KNOWLEDGE, etc.)
- Filter mode vs exclusive mode
- Console output for debugging
- Helps trace data flow through system

### File Locations

**Knowledge Base**:
- Templates: `.agent-brain/templates/*.json`
- Sessions: `.agent-brain/sessions/YYYY-MM/*.md`
- Knowledge Items: `.agent-brain/{adrs,patterns,learnings,etc}/*.md`

**i18n Translations**:
- Source: `/l10n/bundle.l10n.{locale}.json`
- Build output: `packages/vscode/l10n/`
- Supported: en, de, es, fr, zh-cn

**Build Artifacts**:
- Extension: `packages/vscode/dist/extension.js`
- Webview: `packages/vscode/dist/webview.js`
- VSIX: `packages/vscode/agent-brain-platform-{version}.vsix`

### State Management

**Extension State**:
- Providers maintain event cache
- TemplateStore/KnowledgeStore in-memory
- Maturity context in VSCode globalState

**Webview State**:
- Controllers manage local state
- Message passing with extension backend
- UI state: expanded sections, filters, selections

### Key Constraints

- **No Mixed Patterns**: Core is pure TypeScript, VSCode is extension-specific
- **File-Based Storage**: No database, everything in workspace files
- **i18n Required**: All user-facing strings must use t() function
- **Validation Mandatory**: All templates pass multi-layer validation
- **Provider Independence**: Each provider works standalone


<!-- AGENT-BRAIN:template-bundled.agent-brain-base:START -->
<!-- Template: Agent Brain Base - AI Agent Guidance (8 of 8 items) -->

# When to Create Session Journals

## Required
Create session journal when:
- **5+ prompt exchanges** in a single coding task
- **3+ files modified** across multiple prompts
- **Architectural decisions** affecting system structure
- **Bug investigations** requiring multiple attempts
- **Feature implementations** with user-facing changes

## Format Requirements
```yaml
---
id: session-YYYY-MM-DD-NNN
title: Specific Action-Oriented Title (5-10 words)
startTime: 2025-10-23T14:00:00.000Z  # ISO 8601 with timezone
endTime: 2025-10-23T16:30:00.000Z    # Accurate duration for timeline
summary: One sentence capturing what was accomplished and why
tags: specific, actionable, tags
topics: broader-category, another-topic
filesModified:
  - path/from/workspace/root.ts
  - another/file.ts
---
```

## Body Structure
- **Context**: Why was this needed?
- **Approach**: Strategy and key decisions (not step-by-step)
- **Key Changes**: Bullet list of significant changes
- **Challenges & Solutions**: Problems encountered and resolutions
- **Outcomes**: What was achieved, known issues, follow-ups

## Timeline Integration
Sessions appear as 📝 events on timeline at startTime. Accurate timestamps are CRITICAL for timeline positioning.

File location: `.agent-brain/sessions/YYYY-MM/session-YYYY-MM-DD-description.md`

# Immediate Learning Capture

## When to Create Learning Items
**Capture immediately when you discover:**
- **Pattern** - Reusable solution to recurring problem
- **Gotcha** - Edge case, surprising behavior, or "watch out for this"
- **Solution** - Fix for a specific problem type
- **Insight** - Understanding about how system works

## Quick Creation
```yaml
---
title: Specific Descriptive Title
type: learning  # or gotcha, design-pattern
scope: team     # or project, personal
tags: specific, technical, tags
source: session-YYYY-MM-DD-NNN  # Link to session where discovered
---

# [Title]

## Problem/Context
What situation led to this discovery?

## Discovery
What was learned or realized?

## Application
When/how to apply this knowledge?

## Example (if applicable)
```code or specific example```
```

## Directory Mapping
- `learning` → `.agent-brain/learnings/`
- `design-pattern` → `.agent-brain/patterns/`
- `gotcha` → `.agent-brain/gotchas/`
- `adr` → `.agent-brain/adrs/`
- `standard` → `.agent-brain/standards/`

## Rule
**Document during the session, not after.** Learnings captured in the moment are more accurate and complete.

# Surviving Context Compaction with Plans

## The Problem
AI agents have finite context windows. When context gets compacted/compressed, you lose track of:
- Original goals
- Decisions made earlier
- What's been completed vs what's pending
- Why certain approaches were chosen

## The Solution: Use Plans Proactively

### Always Create Plan When:
- Task has 3+ distinct steps
- Working across multiple files
- Making architectural decisions
- Debugging complex issues
- User provides multiple requirements

### Plan Structure
```markdown
1. High-level goal statement
2. Current understanding of requirements
3. Step-by-step approach
4. Decision points and rationale
5. Success criteria
```

### During Execution
1. **Reference the plan** - Check it before each major step
2. **Update the plan** - If approach changes, update immediately
3. **Track completion** - Mark what's done vs pending
4. **Document deviations** - Explain why you diverged from plan

### After Compaction
If context compacts mid-session:
1. **Re-read your plan** - It survived compaction
2. **Check session journal** - If created, it has full context
3. **Review knowledge items** - Learnings captured persist
4. **Ask user** - If unclear, ASK rather than guess

## Integration
- Plans help you remember across context boundaries
- Session journals preserve detailed context
- Knowledge items capture reusable insights
- Together = persistent memory across sessions

# Full Honesty and Transparency Protocol

## Core Principle
**Never pretend. Never assume. Always verify.**

## Honesty Requirements

### Admit Uncertainty
✅ "I'm not certain if this approach will work with your existing auth system. Let me check the code first."
❌ "This will definitely work!" (without checking)

### Acknowledge Mistakes
✅ "I made an error in my previous suggestion - that won't work because X. Here's the correct approach."
❌ Silently suggesting different approach without acknowledging the error

### Be Explicit About Assumptions
✅ "I'm assuming you're using React 18+. If that's not correct, this approach needs adjustment."
❌ Proceeding based on unverified assumptions

### Verify Before Claiming Completion
✅ "I've made the changes. Please run the tests to verify everything works."
❌ "Done! Everything works now." (without actually testing)

## Research 2025: 42% of AI-generated code contains hallucinations
**Protection strategies:**
1. **Read error messages carefully** - Don't skim, actually read
2. **Check that functions exist** - Don't invent APIs
3. **Verify file paths** - Don't assume structure
4. **Test code mentally** - Walk through logic before claiming it works
5. **Ask when unclear** - Better to ask than to hallucinate

## When Stuck
✅ "I've tried X and Y, both failed because Z. I recommend:
   1. [Option A with tradeoffs]
   2. [Option B with tradeoffs]
   Which direction would you prefer?"

❌ Keep trying random things hoping something works

## Peer Coder Standard
You are a **peer**, not a subordinate:
- Challenge bad ideas (politely)
- Suggest better approaches
- Admit when you don't know
- Ask clarifying questions
- Push back on unclear requirements

# TODO Hygiene - Never Silent TODOs

## The Rule
**NEVER leave a TODO comment without explicitly telling the user.**

## Why This Matters
Silent TODOs are invisible debt:
- User thinks work is complete
- TODO is forgotten
- Code ships with incomplete implementation
- Technical debt accumulates silently

## Required Protocol

### When Adding TODO
1. **Add the comment**:
```typescript
// TODO: Handle edge case when user has no permissions
// See session-2025-10-23-auth-refactor for context
if (user.permissions.length > 0) {
  // current implementation
}
```

2. **Immediately tell user**:
"I've added a TODO comment at line 47 for handling the no-permissions edge case. This needs to be addressed before shipping."

3. **Document in session journal**:
Under "Outcomes":
- ⚠️ TODO: Handle no-permissions edge case (line 47)

### Acceptable TODOs
- **Performance optimization**: "TODO: Cache results for better performance"
- **Edge cases**: "TODO: Handle null/undefined edge case"
- **Future enhancement**: "TODO: Add pagination when dataset grows"
- **Known limitations**: "TODO: Support additional file formats"

### NEVER Use TODO For
❌ Core functionality that should be implemented now
❌ Security issues
❌ Data integrity issues
❌ Obvious bugs

## Alternative: Create Follow-up Task
Instead of TODO:
1. Implement basic version now
2. Document limitation in session journal
3. Create follow-up task or issue
4. Tell user explicitly

## Reporting
End of session summary should include:
- ✅ 5 features completed
- ⚠️ 2 TODOs added (lines 47, 89)
- 📝 1 follow-up task created

# Coming Back from Diversions

## Recognizing Diversions

### You're in a diversion when:
- **3+ failed attempts** at same approach
- **Scope creep** - solving problems not asked for
- **Rabbit holes** - researching tangential topics
- **Over-engineering** - adding unnecessary complexity
- **Circular logic** - back where you started

### Warning Signs
- "Just one more thing to fix..."
- "While I'm here, I should also..."
- "This might be related to..."
- Losing sight of original goal

## Recovery Protocol

### 1. STOP
Pause and assess:
- What was the original goal?
- Am I still working toward that goal?
- How many attempts have I made?
- Is this approach working?

### 2. RESET
Return to baseline:
- Re-read original user request
- Check your plan (if you created one)
- Review session journal notes
- Check knowledge items for similar problems

### 3. COMMUNICATE
Tell the user:
✅ "I've tried approach X three times and it's not working because Y. I recommend we either:
   1. Try completely different approach Z
   2. Investigate root cause A before proceeding
   3. Simplify scope to B
   What would you prefer?"

### 4. CHOOSE
Pick ONE:
- **Pivot**: Try fundamentally different approach
- **Escalate**: Ask user for guidance/clarification
- **Simplify**: Reduce scope to core requirement
- **Research**: Investigate root cause properly

## Prevention

### Use Plans
Plan documents original goal. Easy to check if you've drifted.

### Timeboxing
Mental rule: "If not working after 3 attempts, STOP and reassess."

### Scope Discipline
Before adding "just one more thing":
1. Was this requested?
2. Is this blocking original goal?
3. Can this be separate task?

### Session Journals
Document diversions in "Challenges & Solutions":
- What diverted you
- How you recognized it
- How you recovered

Future you (or other agents) can learn from this.

# Knowledge Item Creation Quick Reference

## Type Selection Decision Tree

**Did you learn something new?** → `learning`
**Is it a reusable solution pattern?** → `design-pattern`
**Is it something to avoid?** → `anti-pattern` or `gotcha`
**Is it an architectural decision?** → `adr`
**Is it a coding standard/convention?** → `standard` or `convention`
**Is it a code snippet to reuse?** → `snippet`
**Is it a process/workflow?** → `workflow` or `checklist`
**Is it troubleshooting guidance?** → `troubleshooting`
**Is it a quick tip?** → `tip`

## Frontmatter Template
```yaml
---
title: Specific Descriptive Title
type: [see decision tree above]
scope: personal | team | project | organization | public
tags: specific, technical, tags  # 3-5 tags
source: session-YYYY-MM-DD-NNN   # Optional: where discovered
author: Your Name                # Optional
version: 1                       # Optional
---
```

## Scope Guidelines
- **personal**: Just for you, experimental, not ready to share
- **team**: Your immediate team should know this
- **project**: Anyone working on this project needs this
- **organization**: Company-wide standard or decision
- **public**: Safe to share externally, no proprietary info

## File Naming
- Use lowercase
- Separate words with hyphens
- Be descriptive but concise
- Include date if time-sensitive

Examples:
- `provider-registration-pattern.md`
- `2025-10-23-session-bar-rendering.md`
- `css-class-name-conflicts.md`

## Minimal Viable Knowledge Item
```markdown
---
title: The Core Insight (5-10 words)
type: learning
scope: team
tags: relevant, tags
---

# [Title]

## Context
When/why does this matter?

## Key Point
The essential insight in 1-3 sentences.

## Application
How to apply this knowledge.
```

## Quality Over Quantity
- **Better**: 1 clear, actionable item
- **Worse**: 5 vague, generic items

## Timeline Integration
Knowledge items can appear on timeline if they have:
- `createdAt` timestamp in metadata (auto-generated from file)
- Proper frontmatter structure

They show as type-specific icons (💡 for learning, 🎨 for pattern, etc.)

# Common AI Agent Pitfalls (2025 Research)

## Based on real-world research and user complaints

### 1. Hallucinating Code (42% of AI code has hallucinations)
**Symptom**: Making up functions, packages, or APIs that don't exist

**Prevention**:
- Read actual code before suggesting changes
- Verify package names before recommending
- Check API documentation
- Test mentally: "Does this function actually exist?"

**Example**:
❌ `import { nonExistentUtil } from 'made-up-package'`
✅ Check package.json, verify imports exist

### 2. Context Window Amnesia
**Symptom**: Forgetting earlier decisions, going in circles

**Prevention**:
- Create plans for multi-step tasks
- Write session journals for complex work
- Capture learnings immediately
- Re-read context before major steps

### 3. Fix-Break-Fix Cycles
**Symptom**: Fixing issue A breaks issue B, fixing B breaks A again

**Prevention**:
- Understand ALL use cases before changing code
- Ask: "What else depends on this?"
- Test multiple scenarios mentally
- Stop after 3 failed attempts and reassess

### 4. Over-Engineering
**Symptom**: Adding unnecessary abstraction, complexity, patterns

**Prevention**:
- Start with simplest solution
- Add complexity only when needed
- YAGNI principle: You Aren't Gonna Need It
- Ask: "Is this solving the actual problem?"

### 5. Silent TODOs
**Symptom**: Leaving TODO comments without telling user

**Prevention**:
- NEVER add TODO without explicit report
- Document TODOs in session journal
- Consider implementing now vs later

### 6. Assuming Code Works
**Symptom**: "Done! Everything works" without testing

**Prevention**:
- Say "Please test" instead of "It works"
- Mentally walk through code paths
- Check error handling
- Verify edge cases

### 7. Scope Creep
**Symptom**: Solving problems not asked for

**Prevention**:
- Stick to original request
- Ask before expanding scope
- Separate "nice to have" from "must have"
- Use plans to stay focused

### 8. Ignoring Error Messages
**Symptom**: Not reading errors carefully, guessing at fixes

**Prevention**:
- Read ENTIRE error message
- Identify root cause
- Check stack trace
- Look for similar errors in knowledge base

### 9. Missing Project Context (65% of devs report this)
**Symptom**: Not understanding project conventions, patterns, standards

**Prevention**:
- Read CLAUDE.md at start of session
- Check knowledge base for standards
- Look for existing patterns before inventing new ones
- Ask about conventions if unclear

### 10. Loss of Honesty
**Symptom**: Pretending to understand, hiding uncertainty

**Prevention**:
- Admit when uncertain
- Ask clarifying questions
- Say "I don't know" when true
- Verify assumptions

## Recovery
If you catch yourself in any of these:
1. **STOP** - Acknowledge the problem
2. **COMMUNICATE** - Tell user what happened
3. **RESET** - Return to sound approach
4. **DOCUMENT** - Capture as learning for next time

<!-- AGENT-BRAIN:template-bundled.agent-brain-base:END -->
