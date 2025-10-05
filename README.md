# Agent Brain Platform

**Unified platform for AI-assisted development with timeline visualization, architectural guidance, and pathway testing**

## Overview

Agent Brain Platform combines the power of:
- 📊 **Timeline Visualization**: Rich D3-based visualization of development events
- 🧠 **Agent Brain Core**: Pattern detection, learning, and architectural guidance
- 🧪 **Pathway Testing**: Revolutionary milestone-based testing framework
- 🔌 **Plugin Marketplace**: Extensible architecture pattern plugins

## Architecture

This is a monorepo using Lerna and npm workspaces:

```
packages/
├── shared/     - Shared types and utilities
├── core/       - Agent Brain core engine (patterns, learning, analysis)
├── timeline/   - Timeline visualization and event management
├── testing/    - Pathway testing framework
└── vscode/     - Unified VSCode extension
```

## Getting Started

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Watch mode for development
npm run watch
```

## Package Details

### @agent-brain/shared
Core types and utilities used across all packages. Includes:
- `CanonicalEvent` - Universal event format
- Provider interfaces
- Session management types

### @agent-brain/core
Pattern detection and learning engine:
- Pattern matching and detection
- Learning from development activities
- Code analysis capabilities

### @agent-brain/timeline
Timeline visualization system:
- D3-based event visualization
- Multi-provider event orchestration
- Advanced filtering and time-range selection
- Event type differentiation with shapes and colors

### @agent-brain/testing
Pathway testing framework:
- Milestone-based test assertions
- AI-friendly debugging output
- Performance tracking
- Test generation from sessions

### @agent-brain/vscode
Unified VSCode extension integrating all capabilities.

## 📂 Data Storage

Agent-Brain stores intelligence data locally to remember learnings across VSCode sessions.

### Storage Location

**When workspace is open:**
```
your-project/
  .agent-brain/
    learnings.json    # Captured patterns from test failures and code analysis
    patterns.json     # Code pattern detection rules (future)
```

**When no workspace is open:**
```
~/.vscode/extensions/.../globalStorage/agent-brain/
```

### Privacy Options

Agent-Brain learnings may contain code snippets and error messages from your project.

**Option 1: Keep learnings private** (add to `.gitignore`):
```bash
echo ".agent-brain/" >> .gitignore
```

**Option 2: Share learnings with team** (commit to git):
```bash
git add .agent-brain/
git commit -m "Add team learnings from Agent-Brain"
```

### What's Stored?

- **Learning Patterns**: Insights from test failures, build errors, and code analysis
- **Pattern Rules**: Custom detection rules you've configured
- **ADRs**: Architectural Decision Records (future feature)

All data is stored in **human-readable JSON format** and can be inspected or edited manually.

### Data Sanitization

⚠️ **Note:** Future versions will include automatic sanitization of sensitive data (API keys, credentials, etc.). For now, review `.agent-brain/learnings.json` before committing to version control.

See [packages/vscode/docs/STORAGE.md](packages/vscode/docs/STORAGE.md) for detailed documentation.

## Development

### Building a Single Package

```bash
npm run build:shared
npm run build:core
npm run build:timeline
npm run build:testing
npm run build:vscode
```

### Running Tests

```bash
# All tests
npm test

# Timeline tests
npm run test:timeline

# Pathway tests
npm run test:pathway
```

## Migration Status

This repository is a unified platform created by merging:
- `repo-timeline-extension` - Timeline visualization & pathway testing
- `agent-brain` - Core analysis, patterns, and learning

See `UNIFIED_PLATFORM_MIGRATION.md` for migration progress.

## License

MIT

## Contributing

See individual package READMEs for specific contribution guidelines.
