# 🧠 Agent Brain Platform

> Enhance AI-assisted development with knowledge tracking and timeline visualization

[![VSCode](https://img.shields.io/badge/VSCode-Extension-blue)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-green)](PROJECT_STATUS.md)

---

## What is Agent Brain?

Agent Brain Platform is a VSCode extension that makes AI-assisted development smarter by:

1. **📝 Enhancing your prompts** with relevant patterns, architectural decisions, and learnings
2. **📊 Tracking your AI coding sessions** from prompt to completion
3. **🔍 Visualizing project evolution** showing both git commits and AI-assisted work
4. **🎯 Building knowledge over time** that makes future prompts even better

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/agent-brain-platform

# Install dependencies
cd agent-brain-platform
npm install

# Build the extension
cd packages/vscode
npm run build

# Package as .vsix
npm run package

# Install in VSCode
code --install-extension agent-brain-platform-*.vsix
```

### First Steps

1. **Open Timeline**: Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on Mac)
2. **Create Enhanced Prompt**: Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac)
3. **Work with AI**: Use the enhanced prompt with your favorite AI coding assistant
4. **Track Progress**: Your sessions appear in the timeline as green stars ⭐

---

## Key Features

### 🚀 Knowledge-Enhanced Prompts

Transform basic prompts into knowledge-rich instructions:

**Before:**
```
"Add user authentication"
```

**After (with Agent Brain):**
```
Add user authentication

## Context from Agent Brain

**Patterns to follow:**
- Repository Pattern: Use repository for data access layer
- Service Layer: Keep business logic in service classes

**Architecture decisions:**
- ADR-3: Use JWT for stateless authentication
  Decision: Implement JWT tokens for API auth...

**Related learnings:**
- Auth Token Expiry (seen 3x)
  → Always set reasonable expiry times to prevent security issues
```

### 📊 Session Tracking

Track your AI-assisted coding sessions:
- **What you built**: Original prompt preserved
- **How long it took**: Duration tracking
- **What changed**: Files modified, lines added/removed
- **Which AI**: Claude, Copilot, Cursor, or others

### 🗺️ Visual Timeline

See your entire project evolution:
- **Git commits** appear as cyan circles ●
- **AI sessions** appear as green stars ⭐
- **Zoom and filter** to focus on specific timeframes
- **Click events** for detailed information

### 🎯 Knowledge Base

Build institutional knowledge automatically:
- **Patterns**: Reusable code patterns
- **ADRs**: Architectural Decision Records
- **Learnings**: Learn from test failures automatically

---

## Usage Examples

### Example 1: Quick Prompt Enhancement

```bash
# Press Ctrl+Shift+A

You: "Refactor database layer"
Agent: Claude

# Agent Brain enhances with:
# - Repository pattern
# - Past database ADRs
# - Previous refactoring learnings

# Click "Copy to Clipboard"
# Paste into Claude Code
# Start coding with context!
```

### Example 2: Tracked Session

```bash
# Press Ctrl+Shift+A

You: "Add OAuth2 integration"
Agent: GitHub Copilot

# Click "Start Session"
# Work on your code
# Files are tracked automatically
#
# When done:
# Command Palette → "End Session" → "Complete"
#
# Result: Green star ⭐ in timeline showing your work
```

### Example 3: Record Decision

```bash
# Command Palette → "Record Architectural Decision"

Title: "Use PostgreSQL for primary database"
Context: "Need ACID compliance and relational data"
Decision: "PostgreSQL chosen over MongoDB"
Consequences: "Stronger consistency, less schema flexibility"

# Result: ADR saved and enhances future database prompts
```

---

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| **Agent Brain: New Enhanced Prompt** | `Ctrl+Shift+A` | Create knowledge-enhanced prompt |
| **Agent Brain: End Session** | - | End current AI coding session |
| **Agent Brain: Show Session Status** | - | View active session details |
| **Timeline: Show Repository Timeline** | `Ctrl+Shift+T` | Open timeline visualization |
| **Timeline: Record ADR** | - | Record architectural decision |

---

## How It Works

### Architecture

```
┌─────────────────────────────────────┐
│  Your Prompt                        │
│  "Add user authentication"          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Knowledge System                    │
│  • Patterns (Repository, Service)   │
│  • ADRs (JWT, Security)              │
│  • Learnings (Past mistakes)        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Enhanced Prompt                     │
│  [Original + Knowledge Context]     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  AI Agent (Claude/Copilot/etc)      │
│  Better context = Better code!      │
└─────────────────────────────────────┘
```

### Data Storage

All data stored locally in `.agent-brain/` folder:

```
<workspace-root>/.agent-brain/
├── patterns.json       # Code patterns
├── adrs.json          # Architectural decisions
└── sessions/          # Completed sessions
    └── session-*.json
```

**Privacy**: Everything stays on your machine. No cloud sync required.

---

## Project Structure

```
agent-brain-platform/
├── packages/
│   ├── core/           # Domain logic (zero VSCode deps)
│   │   └── src/
│   │       ├── domains/
│   │       │   ├── sessions/      # Session tracking
│   │       │   ├── knowledge/     # Patterns/ADRs/Learnings
│   │       │   └── visualization/ # Timeline rendering
│   │       └── infrastructure/    # Storage, logging
│   │
│   └── vscode/         # VSCode extension
│       └── src/
│           ├── commands/          # User commands
│           ├── adapters/          # File tracking
│           └── providers/         # Views
│
├── PROJECT_STATUS.md   # Detailed status report
├── PHASE_*.md         # Phase completion summaries
└── README.md          # This file
```

---

## Development

### Prerequisites

- Node.js 18+
- VSCode 1.80+
- TypeScript 5+

### Build from Source

```bash
# Install dependencies
npm install

# Build VSCode extension
cd packages/vscode
npm run build

# Run in development mode
npm run watch  # Terminal 1
# Press F5 in VSCode to launch Extension Development Host
```

### Testing

```bash
# Manual testing
# 1. F5 to launch Extension Development Host
# 2. Open a git repository
# 3. Press Ctrl+Shift+A to test prompt enhancement
# 4. Press Ctrl+Shift+T to test timeline
```

---

## FAQ

**Q: Does this work with Claude Code?**
A: Yes! Create an enhanced prompt and paste it into Claude Code's chat.

**Q: Does this work with GitHub Copilot?**
A: Yes! Start a session and Copilot will benefit from the enhanced context.

**Q: Does this work with Cursor?**
A: Yes! Any AI coding assistant can use the enhanced prompts.

**Q: Where is my data stored?**
A: Locally in your workspace's `.agent-brain/` folder. Nothing goes to the cloud.

**Q: Can I share knowledge with my team?**
A: Yes! The `.agent-brain/` folder can be committed to git (if you choose).

**Q: Does this slow down VSCode?**
A: No. The extension adds ~50ms to startup and has negligible runtime overhead.

---

## Roadmap

### ✅ Completed (v0.1.24)
- [x] Session management and tracking
- [x] Knowledge system (patterns, ADRs, learnings)
- [x] Prompt enhancement with knowledge
- [x] Timeline visualization with session events
- [x] File activity tracking
- [x] VSCode command integration

### 🚧 Planned (v0.2.x)
- [ ] Session details popup (click to see activities)
- [ ] Filter by agent type
- [ ] Search within sessions
- [ ] Export session reports

### 🔮 Future (v0.3.x+)
- [ ] Context rules and reinforcement
- [ ] Team collaboration features
- [ ] Analytics dashboard
- [ ] More AI agent integrations

---

## Documentation

- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Comprehensive project status and technical details
- **[PHASE_3_COMPLETE.md](PHASE_3_COMPLETE.md)** - VSCode integration details
- **[PHASE_4_COMPLETE.md](PHASE_4_COMPLETE.md)** - Timeline integration details
- **[BUILD_GUIDE.md](packages/vscode/docs/BUILD_GUIDE.md)** - Build and packaging guide
- **[KNOWN_ISSUES.md](packages/core/tests/integration/knowledge/KNOWN_ISSUES.md)** - Known test issues

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Documentation**: See [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **Issues**: Report bugs via GitHub Issues
- **Questions**: Open a GitHub Discussion

---

## Acknowledgments

Built with:
- [TypeScript](https://www.typescriptlang.org/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [D3.js](https://d3js.org/) for timeline visualization

---

**Made with 🧠 by developers, for developers**

**Version**: 0.1.24 | **Status**: Production Ready ✅
