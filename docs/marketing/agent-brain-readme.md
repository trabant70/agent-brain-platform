# Agent Brain 🧠
## The Wisdom Layer for AI Coding Assistants

[![Version](https://img.shields.io/visual-studio-marketplace/v/agent-brain.svg)](https://marketplace.visualstudio.com/items?itemName=agent-brain)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/agent-brain.svg)](https://marketplace.visualstudio.com/items?itemName=agent-brain)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/agent-brain.svg)](https://marketplace.visualstudio.com/items?itemName=agent-brain)
[![License](https://img.shields.io/github/license/agent-brain/agent-brain.svg)](https://github.com/agent-brain/agent-brain/blob/main/LICENSE)

**Agent Brain** is a VSCode extension that acts as an intelligent intermediary between developers and AI coding assistants (Claude, GitHub Copilot, Cursor). It preserves context across long sessions, enforces architectural patterns, prevents technical debt, and builds institutional knowledge from every interaction.

## ✨ The Problem

AI coding assistants are powerful but suffer from critical limitations:
- **Context amnesia** after ~20 exchanges (token limit compaction)
- **Pattern amnesia** - forgetting your architectural decisions
- **Quick fix tendency** - creating technical debt
- **Knowledge isolation** - every developer solves the same problems

## 🎯 The Solution

Agent Brain provides a "wisdom layer" that:
- **Remembers** what AI assistants forget
- **Enforces** your architectural decisions
- **Prevents** technical debt before it's created
- **Shares** learnings across your team

## 🚀 Quick Start

### Installation

**Via VSCode Marketplace:**
```bash
ext install agent-brain
```

**Via Command Line:**
```bash
code --install-extension agent-brain
```

### First Use

1. **Initialize your project:**
   ```
   Cmd/Ctrl + Shift + P → "Agent Brain: Initialize Project"
   ```

2. **Capture your intent:**
   ```
   "What are you building?" → "A real-time collaboration tool"
   Agent Brain suggests relevant patterns → Select what applies
   ```

3. **Use enhanced prompts:**
   ```
   Cmd/Ctrl + Shift + A → Opens Prompt Intelligence UI
   Type your request → See enhanced versions → Send to AI
   ```

## 🎯 Core Features

### 1. Prompt Intelligence Center
Before your prompt reaches the AI, Agent Brain enriches it:

**You type:**
```
Fix the authentication bug
```

**AI receives:**
```xml
<context>
  <recent_work>Modified AuthService.ts 10 minutes ago</recent_work>
  <test_failures>3 failures in auth.test.ts</test_failures>
  <patterns>Repository Pattern (ADR-001), JWT with refresh tokens</patterns>
  <similar_fix>UserService line 45-67 has working pattern</similar_fix>
</context>

<task>
Fix the authentication bug in AuthService.validateUser()
causing intermittent 401 errors
</task>

<constraints>
- Maintain backward compatibility
- Follow existing error handling patterns
- Update tests to prevent regression
</constraints>
```

### 2. Context Persistence
Survives AI "compaction events" (context loss):

```
10:30 AM: "Use Repository pattern, no direct DB"
[... 20 exchanges later ...]
11:45 AM: [AI COMPACTION - Context Lost]
11:46 AM: Agent Brain auto-reinforces all rules ✅
```

### 3. Pattern Enforcement
Real-time pattern checking:

```typescript
// You save this:
const user = await db.query('SELECT * FROM users');

// Agent Brain warns:
⚠️ Pattern Violation: Direct database access
   ADR-001 requires Repository pattern
   Quick Fix: Use UserRepository.findById()
```

### 4. Tech Debt Prevention

```
⚠️ Agent Brain: Quality Check
━━━━━━━━━━━━━━━━━━━━━━━
Quick fix detected. Analysis:
- Time now: 5 minutes
- Time to fix later: 2+ hours
- Breaks 3 patterns
- Similar issue caused bug #432

[Get Proper Solution] [Proceed Anyway]
```

### 5. Team Knowledge Sharing

```bash
# Senior dev sets up patterns
agent-brain init --team
agent-brain add-adr ./architecture/decisions/

# Team members get wisdom
git pull
# .agent-brain/ folder contains all patterns

# AI now follows team conventions automatically
```

## 📁 Project Structure

Your `.agent-brain/` folder:
```
.agent-brain/
├── project-intent.json     # High-level goals and context
├── patterns.json          # Active patterns and rules
├── adrs/                  # Architecture Decision Records
│   ├── ADR-001.md
│   └── ADR-002.md
├── session-context.json   # Current session memory
├── timeline.json          # AI interaction history
├── learnings.json         # Accumulated wisdom
└── cache/                 # External pattern cache
```

## 🛠️ Configuration

**`.vscode/settings.json`**
```json
{
  "agentBrain.enabled": true,
  "agentBrain.promptUI.autoEnhance": true,
  "agentBrain.contextPersistence.enabled": true,
  "agentBrain.contextPersistence.reinforceOnCompaction": true,
  "agentBrain.techDebtPrevention.level": "warn",
  "agentBrain.patterns.enforcement": "strict",
  "agentBrain.patterns.source": "https://github.com/org/patterns"
}
```

## 🤖 Supported AI Assistants

| Assistant | Support Level | Integration Method |
|-----------|--------------|-------------------|
| Claude (Terminal) | ✅ Full | Terminal monitoring |
| Claude (Extension) | ✅ Full | Extension API |
| GitHub Copilot | ✅ Full | Prompt injection |
| Cursor | ✅ Full | File monitoring |
| Continue | ✅ Full | API integration |
| Custom | 🔧 Configurable | Adapter system |

## 📊 Architecture

### The Prompt-Based Event Model
Agent Brain uses prompts as natural session boundaries:

```
User Prompt → [AI Work Session] → Next Prompt/Timeout
     ↓              ↓                    ↓
Start Session   Accumulate          Create Event
                Activities
```

Each session becomes a single timeline event with all activities grouped.

### Component Architecture

```
┌─────────────────────────────────────────┐
│        Prompt Intelligence Center        │
├─────────────────────────────────────────┤
│          Session Rollup Engine          │
├─────────────────────────────────────────┤
│        Context Persistence Manager       │
├─────────────────────────────────────────┤
│         Pattern Enforcement Engine       │
├─────────────────────────────────────────┤
│              Storage Layer               │
│          (.agent-brain/ folder)         │
└─────────────────────────────────────────┘
```

## 🧪 Development

### Prerequisites
- Node.js 18+
- VSCode 1.74+
- TypeScript 5.0+

### Setup

```bash
# Clone repository
git clone https://github.com/agent-brain/agent-brain.git
cd agent-brain

# Install dependencies
npm install

# Build extension
npm run compile

# Run tests
npm test

# Package for local install
npm run package
```

### Testing Locally

```bash
# Open in VSCode
code .

# Press F5 to launch Extension Development Host
# This opens a new VSCode window with the extension loaded
```

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Quick contribution guide:**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📈 Metrics & Analytics

Agent Brain tracks (locally, privacy-first):
- Prompt enhancement success rate
- Context reinforcement frequency
- Pattern violations caught
- Technical debt prevented
- Session duration and productivity

View your metrics:
```
Cmd/Ctrl + Shift + P → "Agent Brain: Show Analytics"
```

## 🔒 Privacy & Security

- **100% Local**: All data stays on your machine
- **No Telemetry**: Unless explicitly opted in
- **Git-friendly**: `.agent-brain/` can be shared or gitignored
- **Encrypted**: Sensitive patterns can be encrypted
- **Audit Trail**: Complete history of all AI interactions

## 🗺️ Roadmap

### Current Release (v1.0)
- ✅ Prompt Intelligence Center
- ✅ Context Persistence
- ✅ Pattern Enforcement
- ✅ Basic Tech Debt Prevention
- ✅ Team Knowledge Sharing

### Next Release (v1.1)
- 🚧 Multi-model consensus for critical code
- 🚧 Advanced learning algorithms
- 🚧 Visual pattern editor
- 🚧 Integration with more AI assistants
- 🚧 Pattern marketplace

### Future (v2.0)
- 📋 Enterprise compliance features
- 📋 Advanced analytics dashboard
- 📋 Custom pattern languages
- 📋 AI model fine-tuning
- 📋 Cross-IDE support

## 💬 Community & Support

- **Discord**: [Join our community](https://discord.gg/agentbrain)
- **GitHub Issues**: [Report bugs](https://github.com/agent-brain/agent-brain/issues)
- **Discussions**: [Share ideas](https://github.com/agent-brain/agent-brain/discussions)
- **Twitter**: [@AgentBrainDev](https://twitter.com/AgentBrainDev)

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [VSCode Extension API](https://code.visualstudio.com/api)
- [TypeScript](https://www.typescriptlang.org/)
- [Pathway Testing Pattern](https://github.com/pathway-testing)

Special thanks to all contributors and early adopters who helped shape Agent Brain.

## 🏆 Sponsors

### Gold Sponsors
- [Your Company Here]

### Silver Sponsors
- [Your Company Here]

[Become a Sponsor](https://github.com/sponsors/agent-brain)

---

<div align="center">
  
**Stop fighting your AI assistant. Start building with confidence.**

[Install Extension](https://marketplace.visualstudio.com/items?itemName=agent-brain) • 
[Read Docs](https://agentbrain.dev) • 
[Watch Demo](https://youtube.com/watch?v=demo)

Made with ❤️ by developers, for developers

</div>