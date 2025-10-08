# Agent Brain User Guide
## Your AI Development Companion

Version 2.0 | Last Updated: January 2025

---

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [The Knowledge System](#the-knowledge-system)
- [Working with AI Agents](#working-with-ai-agents)
- [Retroactive Analysis](#retroactive-analysis)
- [Expertise Packages](#expertise-packages)
- [Timeline & Visualization](#timeline--visualization)
- [Advanced Topics](#advanced-topics)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### What is Agent Brain?

Agent Brain is a VS Code extension that makes AI coding assistants actually useful by:
- Learning from your code and decisions
- Adding context to AI prompts automatically
- Tracking what works and what doesn't
- Building a knowledge base from your experience

Think of it as a helpful colleague who remembers everything about your project and whispers the right context to your AI assistant.

### Installation (5 minutes)

1. **Install the Extension**
   ```bash
   # From VS Code
   Ext + Shift + X → Search "Agent Brain" → Install
   
   # Or from command line
   code --install-extension agent-brain
   ```

2. **Initialize Your Project**
   ```bash
   # In your project root
   agentbrain init
   ```
   This creates a `.agent-brain/` folder for your knowledge base.

3. **Record Your First Decision**
   - Click the brain icon (🧠) in the activity bar
   - Click "Record Project Rule"
   - Example: "We use PostgreSQL for our database"
   - This is now part of your project's knowledge

4. **Create Your First Enhanced Prompt**
   - Click "🧠 New AI Prompt" in the timeline panel
   - Type what you want: "Add user login endpoint"
   - Agent Brain adds your project rules automatically
   - Copy the enhanced prompt to your AI tool

### Your First Day Workflow

**Morning: Set Your Context**
1. Open the Agent Brain sidebar
2. Check which rules are active (✅ checked)
3. Uncheck any that don't apply today

**During Development:**
1. Before asking AI for help → Click "New AI Prompt"
2. When AI makes a mistake → Agent Brain offers to save it as a learning
3. When you find a good pattern → Right-click → "Save as Pattern"

**End of Day:**
1. Run retroactive analysis: `Cmd/Ctrl + Shift + P` → "Reflect on Today's Code"
2. Review discoveries (no judgment, just observations)
3. Save any useful patterns for tomorrow

---

## Core Concepts

### The Learning Cycle

```
You code → Agent Brain observes → Patterns emerge → 
AI gets smarter → You code better → Cycle continues
```

Agent Brain creates a continuous improvement loop where your experience makes AI assistance better over time.

### The Dual Voice Philosophy

Agent Brain speaks differently to humans and AI:

**To You (Human):**
- "I noticed you usually handle errors this way..."
- "Have you considered this approach?"
- "This pattern worked well in these 5 places"

**To AI:**
- "MUST use try-catch for all async operations"
- "ALWAYS follow the Repository pattern"
- "NEVER use global state"

You get gentle suggestions; AI gets firm rules.

### Knowledge Hierarchy

Not all knowledge is equal. Agent Brain respects priorities:

1. 🔒 **Organizational Rules** (Mandatory - can't be disabled)
2. ⭐ **Expert Guidance** (Strongly recommended)
3. 👥 **Team Patterns** (Shared practices)
4. 💡 **Personal Learnings** (Your discoveries)
5. 🛤️ **Golden Paths** (Step-by-step workflows)

---

## The Knowledge System

### Types of Knowledge

#### Project Rules (formerly ADRs)
Fundamental decisions about your project:
- "We use REST APIs, not GraphQL"
- "All dates stored in UTC"
- "Component files max 200 lines"

**How to add:**
- Right-click in editor → "Record Project Rule"
- Or: Activity bar → 🧠 → "Add Rule"

#### Code Templates (Patterns)
Reusable code structures that work:
```typescript
// Example: Error handling pattern
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  logger.error(error);
  return { success: false, error: error.message };
}
```

**How to add:**
- Select code → Right-click → "Save as Template"

#### Mistakes to Avoid (Learnings)
Things that went wrong and how to prevent them:
- "Forgot to validate email format → Always use zod schema"
- "Null pointer in user.name → Always use optional chaining"

**Created automatically when:**
- AI generates code with errors
- You fix a bug
- Tests fail

#### Step-by-Step Guides (Golden Paths)
Workflows for common tasks:
1. Create model
2. Add validation
3. Write tests
4. Create endpoint
5. Update documentation

**How to create:**
- After successful task → "Save this workflow"

### Managing Knowledge

#### The Knowledge Tree (Activity Bar)

```
📦 Expertise Packages
  🔒 Company Standards (3)     [Can't uncheck]
  ⭐ Best Practices (5)        [Recommended]
  ☑️ Community Patterns (12)    [Optional]

📋 Your Project Rules (8)       [✅ Check to include]
🎨 Code Templates (15)          [✅ Check to include]
💡 Mistakes to Avoid (23)       [✅ Check to include]
🛤️ Step-by-Step Guides (4)      [✅ Check to include]
```

**Checkbox Control:**
- ✅ Checked = Will be added to AI prompts
- ☐ Unchecked = Available but not used
- 🔒 Locked = Mandatory (can't uncheck)

**Right-Click Actions:**
- View details
- Edit
- Delete
- Always include (pin)
- Never include (mute)

---

## Working with AI Agents

### Creating Enhanced Prompts

#### Method 1: Quick Prompt Panel

1. Click "🧠 New AI Prompt" in timeline
2. Type your request
3. See knowledge count update in real-time
4. Choose your AI (Claude, Copilot, Cursor, etc.)
5. Click "Copy Enhanced Prompt" or "Start Session"

#### Method 2: Command Palette

```
Cmd/Ctrl + Shift + P → "Agent Brain: Enhance Prompt"
```

#### Method 3: Context Menu

Right-click in editor → "Create AI Prompt Here"

### What Gets Added Automatically

Based on your context, Agent Brain adds:

**Always:**
- Current file path
- Language/framework context
- Active project rules

**When relevant:**
- Recent errors in this file
- Related patterns you've used
- Test failures
- Similar code in project

**When available:**
- Organizational standards
- Expert guidance packages
- Team patterns

### Enhancement Stages

Agent Brain progressively enhances prompts:

**Stage 1-2:** Basic context (file, errors) - Mechanical, always works
**Stage 3-4:** Templates and patterns - Based on request type
**Stage 5-6:** Agent optimization - Tuned for specific AI
**Stage 7-8:** Advanced (LLM-assisted) - Optional, needs second AI

Most value comes from Stages 1-4 (no AI needed).

### Session Tracking

When you "Start Session" instead of just copying:
- Timeline shows active session marker
- Changes are tracked
- Success/failure recorded
- Learnings extracted automatically

**End session:** Click the stop button or `Cmd/Ctrl + Shift + P` → "End Session"

---

## Retroactive Analysis

### Understanding Your Code Better

Retroactive analysis discovers patterns in your existing code without judgment.

#### Run Analysis

```bash
# Analyze everything
agentbrain analyze

# Just your code
agentbrain analyze --author "Your Name"

# Last week's code
agentbrain analyze --days 7

# Specific branch
agentbrain analyze --branch feature/auth
```

#### What You'll See

```
📊 Code Insights
━━━━━━━━━━━━━━━━
I noticed 12 interesting patterns in your code:

🔍 Observation: You consistently use try-catch for database calls
   → Found in 23 places
   → Consider documenting as pattern

💡 Opportunity: That cache pattern from auth.js might help in 3 other files

🤔 Question: You handle user input 5 different ways - intentional?
   → Could standardize if you want

No judgment, just observations to consider.
```

#### Creating Learnings from Analysis

When analysis finds patterns:
1. Review the observation
2. Click "Save as Learning" if useful
3. Learning is automatically applied to future prompts

### Limits and Filters

To avoid overwhelming analysis:

**By Author:** `--author "Your Name"` (just your code)
**By Time:** `--days 30` (last month)
**By Branch:** `--branch main` (specific branch)
**By Language:** `--lang typescript` (skip configs)
**By Path:** `--path src/` (specific folders)

**Smart Caching:** Won't re-analyze unchanged code with same knowledge

---

## Expertise Packages

### What Are Packages?

Expertise packages are bundles of knowledge from experts:
- Organizational standards
- Migration guides (e.g., Fortran to C++)
- Industry best practices
- Domain-specific patterns

### Installing Packages

#### From Organization
```bash
agentbrain package install https://company.com/standards.agentbrain
```

#### From Marketplace
1. Activity bar → 🧠 → "Browse Packages"
2. Search by domain
3. Click "Install"

#### From File
```bash
agentbrain package install ./expertise-package.json
```

### Package Priority

When packages conflict, hierarchy wins:
1. 🔒 Organizational (mandatory) - Always wins
2. ⭐ Expert (recommended) - Usually wins
3. ☑️ Community (optional) - You decide

### Creating Your Own Package

After gaining expertise, share it:

1. **Gather Your Knowledge**
   ```bash
   agentbrain package create --name "React Best Practices"
   ```

2. **Select What to Include**
   - Choose patterns that work
   - Add rules to enforce
   - Include examples

3. **Publish**
   ```bash
   agentbrain package publish
   ```

---

## Timeline & Visualization

### Understanding the Timeline

The timeline shows your development story:

```
─────●─────●─────●─────●─────●─────→
  Package  Pattern  Learning  Session  Insight
  loaded   found    created   complete applied
```

**Event Types:**
- 📦 **Package Loaded:** External expertise added
- 🎯 **Pattern Discovered:** Consistent approach found
- 💡 **Learning Created:** Mistake avoided in future
- ✅ **Session Complete:** AI-assisted work finished
- 🔍 **Insight Applied:** Discovery influenced code

### Timeline Filters

Control Center → Filter by:
- Event type
- Time range
- Success/failure
- Knowledge type

### Reading Your Story

The timeline tells you:
- When you're most productive
- Which patterns emerge when
- How AI assistance improves over time
- Where learnings prevent repeated mistakes

---

## Advanced Topics

### Multi-Team Coordination

For organizations with multiple teams/vendors:

#### Set Up Synchronization
```bash
agentbrain vendor sync --config vendors.json
```

#### Monitor Compliance
- Activity bar → 🧠 → "Team Dashboard"
- See which teams follow standards
- No "violations" - just "alignment observations"

### Custom Project Profiles

Different projects need different focus:

#### Create Profile
1. 🧠 → "Edit Profile"
2. Choose project type (API, Frontend, Mobile, etc.)
3. Set priorities (Security, Performance, etc.)
4. Select experience level

#### Switch Profiles
```bash
agentbrain profile switch "Mobile App"
```

### Planning Templates

Force AI to think before coding:

#### Enable Planning
```bash
agentbrain config set require-planning true
```

Now AI must create a plan before implementing:
1. Analyze requirements
2. List components needed
3. Identify error cases
4. Design approach
5. Then implement

### Integration with CI/CD

#### Pre-commit Hook
```bash
# .git/hooks/pre-commit
agentbrain check --staged
```

#### GitHub Actions
```yaml
- name: Agent Brain Check
  run: agentbrain analyze --branch ${{ github.head_ref }}
```

---

## Troubleshooting

### Common Issues

#### "No knowledge found"
- Check: Is `.agent-brain/` initialized?
- Check: Are items checked in sidebar?
- Try: `agentbrain repair`

#### "Enhancement not working"
- Check: Which stage is active? (See status bar)
- Check: Is knowledge relevant to current file?
- Try: Force refresh with `agentbrain enhance --force`

#### "Analysis taking too long"
- Use filters: `--days 7` or `--author "you"`
- Enable cache: `agentbrain config set cache true`
- Exclude folders: Add to `.agentbrainignore`

#### "Package conflicts"
- View conflicts: `agentbrain package conflicts`
- Resolve by hierarchy (org > expert > community)
- Or disable package temporarily

### Getting Help

#### Built-in Help
- Hover any UI element for tooltips
- 💬 AI Companion provides contextual tips
- `agentbrain help [command]`

#### Community Support
- GitHub: github.com/agentbrain/support
- Discord: discord.gg/agentbrain
- Docs: docs.agentbrain.io

#### Debug Mode
```bash
agentbrain debug --verbose
```
Shows what Agent Brain is doing step-by-step.

---

## Best Practices

### Daily Workflow

**Morning:**
1. Check active knowledge (sidebar)
2. Review yesterday's learnings
3. Update project profile if needed

**During Coding:**
1. Use quick prompt for all AI requests
2. Let Agent Brain track sessions
3. Save patterns when you find them

**End of Day:**
1. Run retroactive analysis
2. Review discoveries
3. Create learnings from insights

### Knowledge Gardening

**Weekly:**
- Review and prune outdated rules
- Consolidate similar patterns
- Share useful discoveries with team

**Monthly:**
- Export successful patterns as package
- Update project profile
- Review timeline for productivity insights

### Team Collaboration

**Sharing Knowledge:**
1. Export your patterns: `agentbrain export`
2. Team imports: `agentbrain import team-patterns.json`
3. Discuss in retrospectives

**Standardization:**
1. Agree on core patterns
2. Create team package
3. Mark as ⭐ recommended

---

## Philosophy

### Why Agent Brain Exists

AI coding assistants promise to revolutionize development, but they fail because they lack context. Agent Brain bridges this gap by:
- Capturing your project's reality
- Learning from your experience
- Making AI actually useful

### The Journey

```
Novice → Learning → Proficient → Expert → Contributor
  ↓         ↓          ↓           ↓          ↓
Day 1    Week 1     Month 1     Month 3    Share back
```

### Remember

- **For Humans:** Gentle guidance, no judgment
- **For AI:** Clear rules, firm direction
- **For Everyone:** Continuous improvement

Agent Brain isn't about compliance or scores. It's about making you and your AI assistant an effective team.

---

## Appendix: Commands Reference

### Essential Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `agentbrain init` | Initialize project | - |
| `agentbrain prompt` | Create enhanced prompt | `Cmd/Ctrl + Shift + A` |
| `agentbrain analyze` | Run retroactive analysis | `Cmd/Ctrl + Shift + R` |
| `agentbrain session start` | Begin tracking | - |
| `agentbrain session end` | Stop tracking | - |

### Knowledge Commands

| Command | Description |
|---------|-------------|
| `agentbrain add rule` | Record project decision |
| `agentbrain add pattern` | Save code template |
| `agentbrain add learning` | Create from mistake |
| `agentbrain list` | Show all knowledge |
| `agentbrain export` | Share knowledge |

### Package Commands

| Command | Description |
|---------|-------------|
| `agentbrain package install` | Add expertise |
| `agentbrain package create` | Build package |
| `agentbrain package publish` | Share package |
| `agentbrain package list` | Show installed |

### Analysis Commands

| Command | Options |
|---------|---------|
| `agentbrain analyze` | `--author`, `--days`, `--branch`, `--lang` |
| `agentbrain insights` | Show recent discoveries |
| `agentbrain patterns` | List found patterns |

---

*Agent Brain: Making AI assistance actually useful through your experience.*