---
title: How to Write Effective Session Journals
type: golden-path
scope: team
tags: documentation, sessions, best-practices, knowledge-capture
source: meta.self-documentation
author: Agent Brain Team
version: 1
---

# How to Write Effective Session Journals

## Purpose

Session journals document multi-prompt coding sessions, capturing decisions, learnings, and context for future reference. They serve as:
- **Timeline events** visualizing work sessions
- **Knowledge artifacts** preserving context and rationale
- **Learning sources** for pattern detection and improvement
- **Project history** for onboarding and handoffs

## When to Create Session Journals

### Required Sessions
Create a session journal when:
- **Multi-file changes**: Modified 3+ files across multiple prompts
- **Architectural decisions**: Made design choices affecting system structure
- **Bug investigations**: Debugged complex issues requiring multiple attempts
- **Feature implementations**: Built complete user-facing functionality
- **Refactoring work**: Restructured code for maintainability
- **Integration work**: Connected systems or added external dependencies

### Optional But Recommended
Consider journaling for:
- **Learning moments**: Discovered new patterns or techniques
- **Performance optimization**: Made measurable improvements
- **Migration tasks**: Updated dependencies or frameworks
- **Documentation updates**: Substantial doc changes

### Skip Journaling For
Don't create journals for:
- **Single-prompt fixes**: Trivial typos or single-line changes
- **Automated tasks**: Dependency updates, format-only changes
- **Experimental code**: Throw-away prototypes not merged

## Session Journal Format

### Frontmatter (Required)

```yaml
---
id: session-YYYY-MM-DD-NNN            # Auto-generated or descriptive slug
title: Brief Descriptive Title         # What was accomplished (5-10 words)
startTime: YYYY-MM-DDTHH:MM:SS.SSSZ   # ISO timestamp (session start)
endTime: YYYY-MM-DDTHH:MM:SS.SSSZ     # ISO timestamp (session end)
summary: One-sentence overview         # 1-2 sentences max
tags: tag1, tag2, tag3                 # Categorization tags
topics: topic1, topic2                 # Broader areas (backend, frontend, etc.)
filesModified:                         # List of changed files
  - path/to/file1.ts
  - path/to/file2.ts
knowledgeItemsUsed:                    # Optional: IDs of applied knowledge
  - learning-id-123
  - pattern-id-456
---
```

### Frontmatter Guidelines

**ID**: Use format `session-YYYY-MM-DD-###` where ### is sequential (001, 002, etc.) or descriptive slug

**Title**: Action-oriented, specific
- ✅ "Implement Multi-Tab UI with Filter Panels"
- ✅ "Fix Provider Registration Bug in DataOrchestrator"
- ❌ "Work on UI" (too vague)
- ❌ "Bug fixes" (not specific)

**Time**: Use accurate ISO timestamps
- Include timezone (Z for UTC or +HH:MM offset)
- Duration should reflect actual session length (typically 1-4 hours)
- Use actual start/end times for timeline accuracy

**Summary**: Capture the "why" and "what", not the "how"
- Focus on business value or problem solved
- Mention key outcomes or decisions
- Keep under 150 characters

**Tags**: Specific, actionable
- Use: `bug-fix`, `feature`, `refactor`, `performance`, `ui`, `backend`, `api`
- Avoid: `work`, `code`, `update` (too generic)

**Topics**: Broader categorization
- Use: `authentication`, `visualization`, `data-layer`, `architecture`
- Maximum 3-4 topics per session

**FilesModified**: Complete list
- Use relative paths from workspace root
- Include all meaningfully changed files
- Exclude: auto-generated files, lock files, build artifacts

### Body Content (Structure)

```markdown
# [Title from frontmatter]

## Session Summary
Brief overview (2-4 sentences) expanding on frontmatter summary.

## Context / Background
Why was this work needed? What problem were we solving?

## Approach Taken
High-level strategy, not step-by-step implementation:
- Which patterns/architectures were used
- Key design decisions
- Trade-offs considered

## Key Changes
Bullet list of significant changes:
- Created new XYZ component for ABC functionality
- Refactored DEF to use GHI pattern
- Fixed bug in JKL by updating KLM logic

## Challenges & Solutions
Problems encountered and how they were resolved:
- **Challenge**: Specific problem description
  - **Solution**: How it was resolved
  - **Learning**: What was discovered

## Outcomes
What was achieved:
- ✅ Feature X now works as expected
- ✅ Performance improved by Y%
- ✅ Tests passing for Z scenarios
- ⚠️ Known issues or limitations
- 📝 Follow-up tasks needed

## Files Modified
(Optional expanded section - use if files need explanation)
- `path/to/file.ts` - Brief description of changes

## Knowledge Created
(If applicable)
- Learning: Title of learning item
- Pattern: Title of pattern item
- ADR: Title of decision

## Related Sessions
(Optional - link to related work)
- See: session-YYYY-MM-DD-title
- Builds on: session-YYYY-MM-DD-title
```

## Writing Best Practices

### Clarity & Conciseness
- **Be specific**: "Added 3-track offset system for session bars" > "Updated timeline rendering"
- **Use active voice**: "Implemented feature" > "Feature was implemented"
- **Avoid jargon**: Explain acronyms on first use
- **Keep it scannable**: Use bullet points, short paragraphs

### Capture Decisions
Document the **why** behind choices:
- ✅ "Used 3-track system (vs 5-track) to balance visibility and screen space"
- ✅ "Chose provider-based grouping after considering tag-based and type-based alternatives"
- ❌ "Added tracks" (no rationale)

### Technical Depth
Balance detail with readability:
- **High-level approach**: Yes
- **Design patterns used**: Yes
- **Key algorithms**: Yes, if novel
- **Line-by-line code walkthrough**: No
- **Obvious implementation details**: No

### Learning Orientation
Sessions are for learning, not just logging:
- What worked well?
- What would you do differently?
- What patterns emerged?
- What surprised you?

## Integration with Knowledge System

### Creating Companion Knowledge Items
If the session produces reusable knowledge, create separate items:

**Pattern** - For reusable solutions
```markdown
# Created during: session-2025-10-21-provider-grouping
# File: .agent-brain/patterns/provider-based-filter-grouping.md
```

**Learning** - For insights and discoveries
```markdown
# Source: session-2025-10-21-css-debugging
# File: .agent-brain/learnings/css-class-name-conflicts.md
```

**Standard** - For established conventions
```markdown
# Based on: session-2025-10-21-api-refactor
# File: .agent-brain/standards/api-error-handling.md
```

### Referencing Knowledge in Sessions
In `knowledgeItemsUsed`, list IDs of items that were:
- Applied to code during the session
- Referenced for guidance
- Updated or refined

## File Naming & Organization

### Location
Sessions stored in: `.agent-brain/sessions/YYYY-MM/`

### Naming Convention
`session-YYYY-MM-DD-descriptive-slug.md`

Examples:
- `session-2025-10-21-provider-toggle-fix.md`
- `session-2025-10-21-multi-tab-ui-implementation.md`
- `session-2025-10-22-session-bar-rendering.md`

### Monthly Organization
- One directory per month: `2025-10/`, `2025-11/`
- Chronological ordering by date
- Descriptive slugs for quick scanning

## Timeline Integration

### Visualization
Sessions appear on timeline as:
- **Point events** (current): 📝 emoji at startTime
- **Bar events** (planned): Horizontal bars from startTime to endTime
- **Grouped**: Under "AB-Sessions" filter category
- **Offset**: Vertically staggered to show overlaps

### Popup Display
Clicking a session event shows:
- Duration
- Summary
- Topics (as tags)
- Files modified (first 5)
- Knowledge items used
- Session notes (first 500 chars)

### Filtering & Search
Sessions can be filtered by:
- Time range (zoom/brush)
- Topics
- Tags
- Duration
- Provider toggle (show/hide AB-Sessions)

## Quality Checklist

Before finishing a session journal:

**Frontmatter**
- [ ] Descriptive title (not generic)
- [ ] Accurate start/end timestamps
- [ ] Concise summary (1-2 sentences)
- [ ] Relevant tags (3-5)
- [ ] Appropriate topics (2-3)
- [ ] Complete filesModified list

**Content**
- [ ] Context explains the "why"
- [ ] Approach describes strategy
- [ ] Key changes are specific
- [ ] Challenges/solutions documented
- [ ] Outcomes clearly stated
- [ ] Proper markdown formatting

**Integration**
- [ ] Knowledge items created for reusable insights
- [ ] Knowledge items referenced in knowledgeItemsUsed
- [ ] Related sessions linked (if applicable)

**Meta**
- [ ] File saved in correct month directory
- [ ] Filename follows convention
- [ ] No sensitive information (tokens, passwords)

## Examples

### Good Session Journal
```markdown
---
id: session-2025-10-21-001
title: Provider Registration Bug Fix
startTime: 2025-10-21T14:00:00.000Z
endTime: 2025-10-21T15:45:00.000Z
summary: Fixed critical bug where GitHub provider couldn't be toggled because it wasn't registered when disabled by default.
tags: providers, bug-fix, data-orchestrator
topics: provider-architecture, toggles
filesModified:
  - packages/core/src/domains/visualization/orchestration/DataOrchestrator.ts
---

# Provider Registration Bug Fix

## Context
Users reported "Provider configuration not found: github" error when clicking the GitHub API checkbox. Investigation revealed the GitHub provider wasn't being registered at all when disabled by default in settings.

## Root Cause
DataOrchestrator used conditional registration:
```typescript
if (this.providerSettings.github) {
  await this.providerRegistry.registerProvider(githubProvider, { enabled: true });
}
```
This meant providers disabled in settings never registered, making runtime toggles impossible.

## Solution
Always register all providers, use `enabled` flag for state:
```typescript
const githubProvider = new GitHubProvider();
await this.providerRegistry.registerProvider(githubProvider, {
  enabled: this.providerSettings.github,
  priority: 2
});
```

## Key Insight
**Registration ≠ Enablement**
- Registration: Provider exists in registry (configuration available)
- Enablement: Provider fetches data (runtime behavior)

## Outcomes
- ✅ GitHub provider toggle now works
- ✅ All providers registered regardless of initial state
- ✅ Runtime toggles function correctly

## Knowledge Created
- Learning: Provider Must Be Registered Before Toggle
```

### Poor Session Journal (Anti-pattern)
```markdown
---
id: session-001
title: Bug fixes
startTime: 2025-10-21T10:00:00.000Z
endTime: 2025-10-21T11:00:00.000Z
summary: Fixed bugs
tags: bugs
topics: code
---

# Bug Fixes

Fixed some bugs in the code. Changed DataOrchestrator.ts.

Made it work now.
```

**Problems**:
- Vague title
- Generic tags/topics
- No context or explanation
- No specifics about what was fixed
- No learning captured
- Missing filesModified details

## Maintenance

### Updating Sessions
Sessions are historical records - avoid editing except for:
- Fixing typos or formatting
- Adding cross-references to related sessions
- Updating outcomes if follow-up work occurs

Use comments to add updates:
```markdown
## Outcomes
- ✅ Feature implemented
- ⚠️ Known issue: Performance degrades with >1000 items

<!-- Update 2025-10-22: Performance issue resolved in session-2025-10-22-003 -->
```

### Archiving
Sessions remain in timeline indefinitely. No archiving needed unless:
- Project sunset/migration
- Sensitive information needs removal
- Duplicate/test sessions need cleanup

## Tools & Automation

### Suggested Workflow
1. **Start**: Note startTime when beginning multi-prompt work
2. **During**: Track files modified, decisions made
3. **End**: Note endTime, gather modified files list
4. **Write**: Complete session journal within 24 hours
5. **Review**: Use quality checklist before saving
6. **Extract**: Create separate knowledge items for reusable insights

### Future Enhancements
Potential automation:
- Auto-generate filesModified from git diff
- Suggest tags/topics based on file paths
- Extract duration from timestamps
- Lint session journals for completeness

## Related Knowledge

- Pattern: Timeline Event Provider Architecture
- Learning: Knowledge System File Structure
- Standard: Markdown Frontmatter Format

## Version History

- v1 (2025-10-21): Initial guide based on existing session examples
