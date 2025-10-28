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

<!-- AGENT-BRAIN-GROUP-START: TYPE=TEMPLATE ID=bundled.agent-brain-base INJECTED_AT=2025-10-28T14:09:31.072Z ITEM_COUNT=8 -->
<!-- Group: TEMPLATE (8 items) -->

<!-- Item: golden-path-session-journals -->
[Content for golden-path-session-journals would be here]

<!-- Item: golden-path-learning-capture -->
[Content for golden-path-learning-capture would be here]

<!-- Item: golden-path-context-survival -->
[Content for golden-path-context-survival would be here]

<!-- Item: best-practice-full-honesty -->
[Content for best-practice-full-honesty would be here]

<!-- Item: best-practice-todo-hygiene -->
[Content for best-practice-todo-hygiene would be here]

<!-- Item: best-practice-coming-back -->
[Content for best-practice-coming-back would be here]

<!-- Item: guideline-knowledge-item-creation -->
[Content for guideline-knowledge-item-creation would be here]

<!-- Item: gotcha-ai-agent-pitfalls -->
[Content for gotcha-ai-agent-pitfalls would be here]

<!-- AGENT-BRAIN-GROUP-END: TYPE=TEMPLATE ID=bundled.agent-brain-base -->

<!-- AGENT-BRAIN-GROUP-START: TYPE=TEMPLATE ID=bundled.reza-rezvani-essentials INJECTED_AT=2025-10-28T19:13:53.856Z ITEM_COUNT=10 -->
<!-- Group: TEMPLATE (10 items) -->

# Architecture Blueprint - The 10,000-Foot View

**Original concept by Reza Rezvani**

## Purpose
Provide the high-level system architecture upfront so AI agents always code with the grand plan in mind.

## What to Include

**Tech Stack:**
- Frontend framework (React, Vue, etc.)
- Backend framework (Express, Django, etc.)
- Database (PostgreSQL, MongoDB, SQLite, etc.)
- Key libraries and their purposes

**System Layers:**
- How components communicate
- API endpoints and protocols
- Authentication/authorization flow
- Data flow from UI to database

**Design Patterns:**
- MVC, MVVM, or other architectural pattern
- Module organization
- Separation of concerns

## Example
```markdown
## Architecture

Full-stack app with React frontend and Express backend:
- **Frontend**: React 19 SPA (Vite), component-based UI
- **Backend**: Express.js REST API, MVC pattern
- **Database**: PostgreSQL with tables for users, posts, comments
- **Communication**: Frontend calls backend at http://localhost:3001/api/
- **Auth**: JWT tokens stored in httpOnly cookies
```

## Benefits
- Prevents mixing patterns or misplacing files
- Ensures code fits the system design
- AI sees the forest, not just trees
- Reduces architectural drift

## Keep Updated
Whenever you complete a major refactor, update this section. Tell the AI: "Update the Architecture Blueprint in CLAUDE.md to reflect our new structure."

# Command Center - Never Forget How to Build

**Original concept by Reza Rezvani**

## Purpose
Document all common commands so AI agents never ask "How do I run this?" and can execute the right commands automatically.

## What to Include

**Development:**
- Start dev server
- Build for production
- Run in watch mode

**Testing:**
- Run all tests
- Run specific test suites
- Generate coverage reports

**Quality:**
- Lint code
- Format code
- Type checking

**Deployment:**
- Build artifacts
- Deploy commands
- Environment setup

## Example Template
```markdown
## Commands

**Development:**
- `npm run dev` - Start development server (auto-reload)
- `npm run build` - Build for production (outputs to dist/)

**Testing:**
- `npm run test` - Run test suite (Jest with coverage)
- `npm run test:watch` - Run tests in watch mode

**Quality:**
- `npm run lint` - Lint with ESLint
- `npm run format` - Format with Prettier

**Environment:**
- Node 18+ required
- Copy .env.example to .env before first run
```

## Pro Tips
- Include tool versions if setup is finicky
- Note any environment prerequisites
- Document safe commands that don't need permission
- Add deployment steps if applicable

## Result
AI will use correct commands automatically, no more guessing or "it works on my machine" issues.

# Style Guide Sheriff - Enforce Consistency

**Original concept by Reza Rezvani**

## Purpose
Keep code style consistent across all contributions, whether human or AI-generated.

## Core Style Elements

**Syntax:**
- Module system (ES6 import/export vs CommonJS)
- Modern features (ES6+ preferred)
- Language-specific conventions

**Formatting:**
- Indentation (2 spaces, 4 spaces, tabs)
- Quote style (single, double)
- Semicolons (use or omit)
- Line length limits

**Naming Conventions:**
- Variables: camelCase
- Functions: camelCase
- Classes/Components: PascalCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case or PascalCase

**Patterns:**
- Prefer functional over class components (React)
- Async/await over promises.then()
- Avoid deprecated APIs

## Example
```markdown
## Code Style

- **Syntax**: ES6+ modules, arrow functions
- **Format**: 2-space indent, single quotes, no semicolons
- **Naming**: camelCase for vars/functions, PascalCase for components
- **Patterns**: Functional components with hooks (React)
- **Linting**: Must pass ESLint with zero warnings
```

## Extended Guidelines

**Comments & Documentation:**
- JSDoc format for public APIs
- Explain "why" not "what" in comments
- Remove commented-out code before commit

**Commit Messages:**
- Conventional commits (feat:, fix:, docs:)
- Include ticket IDs if applicable
- One-line summary, details after blank line

## Result
AI outputs will conform to style automatically, pass linters, and look uniform with human-written code.

# Test Bench Coach - Make Testing First-Class

**Original concept by Reza Rezvani**

## Philosophy
For every feature or bugfix, write or update tests as part of the workflow. Testing is not optional.

## Testing Mindset

**Test-Driven Development:**
- Consider writing tests first (or immediately after)
- Red-Green-Refactor cycle
- Tests as specification

**Coverage Goals:**
- High coverage on core logic (services, reducers, utilities)
- Include edge cases and error states
- Focus on behavior, not implementation

**Test Types:**
- Unit tests for pure functions
- Integration tests for API endpoints
- Component tests for UI (React Testing Library)
- E2E tests for critical user flows

## Framework Specifics
```markdown
## Testing Instructions

**Framework**: Jest for unit tests, React Testing Library for components

**Approach**:
- Always include tests for new features
- Fix bugs by first writing a failing test
- Run `npm run test` before considering task done

**Test Structure**:
- Use `describe` blocks for modules
- Use `it('should...')` for behaviors
- Keep tests focused and readable

**Edge Cases**:
- Test invalid inputs
- Test empty/null states
- Test error conditions
- Test boundary values
```

## Pro Tips
- Ask AI to generate additional edge case tests
- Leverage AI's tireless nature for exhaustive testing
- Include property-based tests for critical logic
- AI can think of tests you might forget at 2 AM

## Result
AI will auto-suggest test files after implementing features, write comprehensive test suites, and catch edge cases proactively.

# Error Handling Mantra - Debug Like a Pro

**Original concept by Reza Rezvani**

## Core Principles

### 1. Diagnose, Don't Guess
- Analyze root cause step-by-step
- Check assumptions and inputs
- Review relevant code paths
- Use systematic approach, not random fixes

### 2. Graceful Handling
- Use try/catch around async operations
- Return user-friendly error messages
- Provide fallback values when appropriate
- Fail fast on bad input

### 3. Helpful Logging
- Include context in error logs
- Log at appropriate levels (error, warn, info)
- Avoid log spam in production
- Make errors traceable

### 4. No Silent Failures
- Never swallow exceptions silently
- Either throw, log, or handle explicitly
- Make failures visible
- Surface errors to monitoring systems

## Implementation Guide
```markdown
## Error Handling

**When Error Occurs**:
1. Explain possible causes step-by-step
2. Check assumptions and data flow
3. Propose fix with reasoning
4. Add safeguards to prevent recurrence

**Code Patterns**:
- Wrap risky operations in try/catch
- Validate inputs before processing
- Use Error Boundaries (React)
- Return meaningful error codes/messages

**Debugging Strategy**:
- Add targeted console.debug statements
- Consider binary search through git history
- Isolate the issue before fixing
- Test the fix against multiple scenarios
```

## Pro Tips
- Add React Error Boundaries around API-calling components
- Include error handling in test cases
- Document known edge cases that cause errors
- Stop after 3 failed attempts and reassess approach

## Result
AI will catch its own mistakes more often, add proper error handling proactively, and debug systematically rather than guessing.

# Clean Code Commandments - Write Maintainable Code

**Original concept by Reza Rezvani**

## The Commandments

### 1. Function Size Limits
- Aim for functions ≤ 50 lines
- Break large functions into smaller helpers
- Each function should fit on one screen

### 2. Single Responsibility
- Each function/module has one clear purpose
- Don't lump unrelated logic together
- If function does two things, split it

### 3. Descriptive Naming
- Use clear, specific names
- Avoid generic names: `tmp`, `data`, `handleStuff`
- Prefer: `calculateInvoiceTotal` over `doCalc`
- Names should reveal intent

### 4. DRY Principle (Don't Repeat Yourself)
- No duplicate code
- Refactor similar logic into shared functions
- If copying code, consider abstraction

### 5. Meaningful Comments
- Explain non-obvious logic
- Don't comment self-explanatory code
- Remove commented-out code
- Update comments when code changes

### 6. Code Organization
- Group related functions
- Logical file structure
- Separate concerns (UI, logic, data)
- Consistent module patterns

## Example Guidelines
```markdown
## Clean Code

**Function Rules**:
- Max 50 lines per function
- Single responsibility only
- Descriptive names (calculateTotal not doStuff)

**Code Quality**:
- DRY - no duplication
- Comments explain "why" not "what"
- Remove debug code and commented lines

**Organization**:
- Group related functions
- Consistent import order
- Logical file structure
```

## Anti-Patterns to Avoid
- Functions over 100 lines
- Generic variable names
- Nested ternaries (> 2 levels)
- Deep nesting (> 3 levels)
- Magic numbers (use constants)
- God objects/classes

## Result
AI will self-correct during coding, refactor large functions automatically, spot code duplication, and produce clean, maintainable code by default.

# Security Sentry - Code with Security in Mind

**Original concept by Reza Rezvani**

## Critical Security Practices

### Input Validation
- Validate ALL inputs (users, APIs, files)
- Never trust user input
- Check format, length, type
- Whitelist valid inputs

### Authentication & Authorization
- Hash passwords with bcrypt (never plain text)
- Use salt with hashing
- Implement rate limiting on login
- Account lockout after failed attempts
- Validate JWT signatures
- Check permissions before actions

### Database Safety
- Use parameterized queries or ORM
- NEVER concatenate user input in SQL
- Prevent SQL injection
- Use least privilege for DB users

### XSS & CSRF Protection
- Sanitize HTML content (use DOMPurify)
- Escape user-generated content
- Use CSRF tokens for state-changing forms
- Set secure HTTP headers
- Avoid dangerouslySetInnerHTML unless sanitized

### Dependencies & Code Execution
- Avoid eval() and Function()
- Don't execute dynamic code from users
- Keep dependencies updated
- Check for known vulnerabilities
- Prefer built-in solutions over risky packages

## Example Security Guide
```markdown
## Security Guidelines

**Input Handling**:
- Validate all user inputs (email format, length, type)
- Sanitize HTML with DOMPurify before rendering
- Never trust external data

**Authentication**:
- Hash passwords with bcrypt (12 rounds minimum)
- No plain text passwords EVER
- Rate limit login attempts (5 per 15 min)
- Use httpOnly cookies for tokens

**Database**:
- Parameterized queries only
- No string concatenation in SQL
- Use ORM for complex queries

**API Security**:
- HTTPS only in production
- Validate JWT signatures
- Check authorization for every endpoint
- Return generic error messages (don't leak info)
```

## Common Vulnerabilities to Prevent
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Authentication bypass
- Path traversal
- Insecure direct object references
- Mass assignment
- Sensitive data exposure

## Result
AI will catch security issues proactively, refuse insecure implementations, suggest security improvements, and act as a security reviewer for every line of code.

# Teamwork Protocol - Collaborate Effectively

**Original concept by Reza Rezvani**

## Purpose
Align AI coding with team collaboration conventions - from Git etiquette to documentation standards.

## Git Workflow

**Branching Strategy**:
- Feature branches off `dev` or `main`
- Branch naming: `feature/login-form`, `fix/api-timeout`
- Never commit directly to protected branches
- Delete branches after merge

**Commit Messages**:
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Include ticket IDs: `feat(auth): add OAuth support (TICKET-123)`
- One-line summary (50 chars), details after blank line
- Imperative mood: "Add feature" not "Added feature"

**Pull Requests**:
- Create PR when feature complete
- Write clear description of changes
- Tag relevant reviewers
- Link to tickets/issues
- Ensure CI/CD passes before requesting review

## Documentation Standards

**Code Documentation**:
- Document public APIs and functions
- Update README when behavior changes
- Keep CHANGELOG.md current
- Document new endpoints in API docs

**Comments**:
- Explain complex logic
- Document workarounds with context
- Add TODOs with ticket references
- Keep comments up-to-date

## Example Protocol
```markdown
## Collaboration Workflow

**Git Flow**:
- Branch from `dev` for features
- Naming: `feature/name` or `fix/name`
- Commit format: `type(scope): message (TICKET-ID)`
- PR required for merging to `dev` or `main`

**Documentation**:
- Update API docs for new endpoints
- Add CHANGELOG entry for notable changes
- Document breaking changes prominently
- Keep README examples current

**Code Review**:
- All PRs need 1 approval minimum
- Address review comments before merge
- Run linter and tests before requesting review
- Keep PRs focused and reasonably sized
```

## Communication Standards

**Commit Messages**:
- Clear and descriptive
- Follow team conventions
- Include context for future maintainers

**PR Descriptions**:
- What changed and why
- Testing performed
- Screenshots for UI changes
- Migration steps if needed

**Documentation Updates**:
- Same PR as code changes
- Cover user-facing changes
- Update examples and tutorials

## Result
AI will format commits correctly, update documentation automatically, create proper PRs, and follow team workflows seamlessly.

# Edge-Case Oracle - Think Beyond the Happy Path

**Original concept by Reza Rezvani**

## Philosophy
For any non-trivial feature, systematically consider edge cases and handle them explicitly.

## Categories of Edge Cases

### Empty or Null Inputs
- Empty arrays/lists
- Null/undefined values
- Empty strings
- Missing required fields
- Zero values

### Boundary Conditions
- Maximum values (overflow)
- Minimum values (underflow)
- Very large numbers
- Very long strings/arrays
- Negative numbers where unexpected

### Invalid States
- End date before start date
- Negative quantities
- Division by zero
- Invalid enum values
- Malformed data

### Concurrency Issues
- Two users editing same data
- Race conditions
- Lock contention
- Stale data reads

### External Dependencies
- API timeouts
- Network failures
- Third-party service downtime
- Rate limiting
- Invalid responses

## Edge Case Protocol
```markdown
## Edge Case Considerations

**Always Consider**:
- Empty/null inputs (empty array, missing fields, zero)
- Boundary values (max/min, overflow, very long text)
- Invalid states (dates out of order, negative values)
- Concurrent access (multiple users, race conditions)
- External failures (API down, network timeout)

**How to Handle**:
1. Identify edge case during design
2. Decide: handle gracefully or fail fast
3. Implement check or validation
4. Add test case for the edge condition
5. Document if behavior is non-obvious

**Fail Fast vs Graceful**:
- Fail fast: Throw error on bad input (development)
- Graceful: Return safe default, log warning (production)
```

## Example Edge Cases

**Date Range Picker**:
- End date before start date → Swap them
- Same start and end date → Valid (single day)
- Dates in far future/past → Validate reasonable range

**Financial Calculations**:
- Empty transaction array → Return 0
- Negative amounts → Throw error or handle as refund
- Floating point precision → Use decimal library

**User Input**:
- Extra whitespace → Trim
- Special characters → Sanitize
- Too long → Truncate or reject
- Empty required field → Show validation error

## Implementation Strategy

**During Planning**:
1. List potential edge cases
2. Decide handling strategy for each
3. Add test cases to verify

**During Coding**:
- Add input validation
- Implement error handling
- Document assumptions
- Use defensive programming

**During Testing**:
- Test each edge case explicitly
- Verify error messages are helpful
- Check logging is appropriate

## Result
AI will proactively identify edge cases ("What if the array is empty?"), implement checks without being asked, and suggest additional test cases for robustness.

# Agentic Workflow Guardrails - Plan, Execute, Verify

**Original concept by Reza Rezvani**

## Philosophy
For complex, multi-step tasks, break them down systematically and verify each step rather than jumping in headfirst.

## The 3-Phase Approach

### Phase 1: Analysis
- Understand the requirements fully
- Identify constraints and dependencies
- Research relevant patterns or solutions
- Ask clarifying questions if anything is unclear

### Phase 2: Planning
- Create structured plan or outline
- Break into logical steps/modules
- Identify risks and edge cases
- Get user approval before coding

### Phase 3: Implementation
- Execute plan incrementally
- Verify each chunk before moving on
- Run tests after each logical unit
- Adjust plan if something doesn't work

## Workflow Guidelines
```markdown
## Complex Task Workflow

**Step 1: Analysis & Planning**
- For multi-step tasks, output a clear plan first
- List steps, modules, or phases
- Identify dependencies and order
- Use extended reasoning for complex decisions

**Step 2: Get Approval**
- Present plan for review
- Wait for user confirmation
- Incorporate feedback
- Only proceed after approval

**Step 3: Incremental Implementation**
- Implement in logical chunks
- After each chunk: verify alignment with plan
- Run relevant tests
- Commit working code before next chunk

**Step 4: Error Recovery**
- If solution isn't working, backtrack and rethink
- Don't stubbornly persist with failing approach
- Consider alternative approaches
- Ask for guidance if stuck after 2-3 attempts

**Step 5: Review & Polish**
- Ensure all plan items completed
- Run full test suite
- Check documentation is updated
- Review for clean code principles
```

## When to Use This Workflow

**Always Plan For**:
- Features with 3+ significant components
- Architectural changes
- Database migrations
- Refactoring large modules
- New integrations (OAuth, payment APIs, etc.)
- Security-critical features

**Quick Implementation OK For**:
- Small bug fixes
- Style/formatting changes
- Adding simple tests
- Documentation updates

## Extended Reasoning

**Use "Think Harder" When**:
- Designing complex algorithms
- Making architectural decisions
- Debugging mysterious issues
- Optimizing performance
- Resolving conflicting requirements

Better to spend more tokens on solid approach than rush into flawed code.

## Example Workflow

**Task**: Add OAuth2 login flow

**Phase 1 - Plan** (AI outputs):
```markdown
1. Set up OAuth provider (Google)
2. Create callback endpoint /auth/google/callback
3. Handle token exchange and validation
4. Store user session
5. Add refresh token logic
6. Update frontend with "Sign in with Google" button
7. Add tests for auth flow
```

**Phase 2 - User approves plan** (adds refresh token requirement)

**Phase 3 - Implement incrementally**:
- Step 1: OAuth config ✓ (test: config loads)
- Step 2: Callback endpoint ✓ (test: route responds)
- Step 3: Token exchange ✓ (test: validates token)
- etc.

## Pro Tips

**Document Plans**:
- Save plan to PLAN.md file
- Reference later with @filename
- Keeps context size manageable

**Custom Trigger Words**:
- "Let's brainstorm" → Enter planning mode
- "Think harder" → Use extended reasoning
- "Ship it" → Final review and merge

**Sub-Agent Strategies**:
- Spin up specialized agents for testing, review, etc.
- Coordinate multiple agents for parallel work
- Use appropriate agent for task type

## Result
AI will propose structured plans, get your approval before major work, implement incrementally with verification, and recover intelligently from failures. Code quality and success rate dramatically improve.

<!-- AGENT-BRAIN-GROUP-END: TYPE=TEMPLATE ID=bundled.reza-rezvani-essentials -->
