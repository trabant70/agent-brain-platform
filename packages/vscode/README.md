# Agent Brain Platform

**Transform AI Coding Agents into Senior Developers** - Give coding agents institutional memory, enforce organizational standards, inject expert solutions, and maintain a complete audit trail of their work.

![Agent Brain Architecture](images/screenshots/architecture-diagram.png)

## 🚨 The Problem

AI coding agents are powerful but suffer from critical limitations:

- **🧠 Amnesia**: They forget project context between sessions
- **⚡ Overeagerness**: They jump to solutions without understanding standards
- **📏 No Compliance**: They don't automatically follow organizational rules
- **🎓 Junior-Level Solutions**: They miss senior developer patterns and best practices
- **👻 Invisible Work**: No audit trail of what agents actually did

**Result:** Developers spend time reviewing, correcting, and explaining the same things repeatedly.

## ✅ The Solution

Agent Brain Platform solves these problems by providing:

- **📊 Visual Timeline** - Complete audit trail showing what agents and developers did
- **📚 Knowledge Management** - Capture standards, patterns, ADRs, and expert solutions
- **📝 Session Journals** - Track multi-prompt agent sessions with full context
- **🎯 AI Guidance System** - Inject knowledge into claude.md files for automatic compliance
- **🔄 Institutional Memory** - Agents access project history and learnings every session

**Result:** Treat coding agents like senior developers who understand your codebase, follow standards, and learn from experience.

## 🎯 Key Features

### Timeline Visualization

![Timeline View](images/screenshots/timeline-view.png)

Transform your git history into an interactive visual timeline:

- **Multiple Event Types**: Commits, branches, merges, releases, PRs, knowledge items, and session journals
- **Smart Filtering**: Filter by branch, author, event type, time range, or search text
- **Interactive Controls**: Zoom, pan, brush selection, and range selector
- **Statistics Dashboard**: Track visible events, contributors, branches, velocity, and time windows
- **Dual Color Modes**: Switch between event types and branches for different perspectives
- **Performance**: Handles thousands of events with smooth D3-powered rendering

### Knowledge Management

![Knowledge Management](images/screenshots/knowledge-view.png)

Capture and organize development knowledge:

- **20+ Knowledge Types**: ADRs, design patterns, golden paths, learnings, snippets, standards, and more
- **Flexible Organization**: Group by type, scope (personal/team/org), or tags
- **File-Based Storage**: All knowledge stored as markdown with YAML frontmatter in `.agent-brain/`
- **Template System**: Save knowledge templates and inject them into claude.md files
- **Search & Filter**: Quickly find relevant knowledge across your repository
- **Import/Export**: Share knowledge packages with your team or organization

### Session Journals

Track your multi-prompt coding sessions:

- **Automatic Discovery**: Finds session journals in `.agent-brain/sessions/`
- **Rich Metadata**: Title, summary, duration, topics, tags, files modified
- **Timeline Integration**: Session events appear on the timeline
- **Search & Sort**: Find sessions by topic, file, or time period
- **Learning Extraction**: Convert session insights into reusable knowledge items

### AB Support

View the complete architecture and understand how everything connects:

- **Architecture Diagram**: Visual representation of the knowledge flow and learning cycle
- **Theme-Aware**: Automatically switches between light and dark diagram versions
- **High-Level Overview**: Understand the relationship between external expertise, personal discovery, and AI guidance

## 🚀 Getting Started

### 1. Install the Extension

Install from the VSCode marketplace or from VSIX file:

```bash
code --install-extension agent-brain-platform-X.X.X.vsix
```

### 2. Open Your Repository

Open any git repository in VSCode. Agent Brain will automatically:
- Scan your git history
- Look for `.agent-brain/` directory
- Initialize the knowledge base (if it doesn't exist)

### 3. Open the Timeline

Press **`Ctrl+Shift+T`** (Mac: **`Cmd+Shift+T`**) or use the Command Palette:

```
> Show Repository Timeline
```

The timeline opens in the bottom panel with 4 tabs:
- **AB Timeline**: Visual repository history
- **AB Knowledge**: Knowledge management system
- **AB Sessions**: Session journals
- **AB Support**: Architecture and documentation

### 4. Start Capturing Knowledge

Create your first knowledge item:

1. Switch to the **AB Knowledge** tab
2. Click **"+ Add Item"**
3. Choose a type (e.g., "Golden Path" or "Learning")
4. Write your knowledge in markdown
5. Save it to `.agent-brain/` directory

Knowledge items automatically appear on the timeline!

## 📖 Usage Guide

### Timeline Navigation

- **Scroll/Drag**: Navigate through time
- **Hover Events**: See detailed tooltips
- **Click Events**: Open detailed popup with tabs (Overview, Impact, Related, Technical)
- **Brush Selection**: Drag on the range selector to focus on a specific time period
- **Legend**: Click "Legend" button to see event type markers

### Filtering Events

Click **"Controls"** button to open the filter panel:

- **Event Types**: Show/hide commits, branches, merges, releases, PRs, knowledge, sessions
- **Branches**: Filter to specific branches
- **Authors**: Filter to specific contributors
- **Time Range**: Use the range selector or date inputs
- **Search**: Text search across event titles and descriptions

### Managing Knowledge

**Creating Items:**
1. Click **"+ Add Item"** in AB Knowledge tab
2. Fill in metadata (title, type, scope, tags)
3. Write content in markdown
4. File is saved to `.agent-brain/{type}/` directory

**Using Templates:**
1. Select knowledge items using checkboxes
2. Click **"💾 Save Template"**
3. Later, click **"📋 Apply Template"** to inject into claude.md

**Scanning Claude.md Files:**
1. Click **scan icon** in the left panel
2. Agent Brain finds all claude.md files in your workspace
3. View and manage knowledge injection points

### Session Journals

**Creating Sessions:**

Create a markdown file in `.agent-brain/sessions/YYYY-MM/` with frontmatter:

```markdown
---
id: session-2025-10-22-001
title: Implement dark theme for architecture diagram
startTime: 2025-10-22T00:00:00.000Z
endTime: 2025-10-22T01:30:00.000Z
summary: Added dark theme version of SVG with automatic theme detection
tags: ui, theme, svg
topics: visualization, user-experience
filesModified:
  - docs/agentbrain-complete-diagram-dark.svg
  - packages/core/src/domains/visualization/webview/main.ts
---

# Session Content

[Details about what was accomplished...]
```

Sessions automatically appear on the timeline as 📝 events.

## ⚙️ Configuration

### Provider Settings

```json
{
  "agentBrain.providers.gitLocal.enabled": true,
  "agentBrain.providers.github.enabled": false,
  "agentBrain.providers.knowledgeEvents.enabled": true,
  "agentBrain.providers.sessionJournals.enabled": true
}
```

### Logging Settings

Control pathway logging for debugging:

```json
{
  "agentBrain.logging.pathwayMode": "exclusive",
  "agentBrain.logging.enabledPathways": [
    "DATA_INGESTION",
    "RENDER_PIPELINE",
    "KNOWLEDGE_MANAGEMENT"
  ],
  "agentBrain.logging.logLevel": "INFO"
}
```

## 🎯 Use Cases

### Primary: AI-Assisted Development

**Elevate coding agents from junior to senior level:**

- **Before Coding**: Inject standards, patterns, and constraints into claude.md
- **During Coding**: Agents follow organizational rules automatically
- **After Coding**: Review timeline to verify agent compliance and capture learnings
- **Next Session**: Agent has full context from previous sessions

**Example Workflow:**
1. Create knowledge items for your authentication pattern
2. Save as template and inject into claude.md
3. Coding agent reads claude.md and follows your pattern automatically
4. Session journal captures what agent did
5. Timeline shows agent's work alongside developer commits
6. Extract learnings and add to knowledge base for next time

### For Teams

- **Standardize Agent Behavior**: Everyone's agents follow the same rules
- **Share Expert Solutions**: Senior devs create patterns, agents apply them
- **Audit Agent Work**: Timeline shows which agent did what and when
- **Onboard New Developers**: Knowledge base + session history = fast ramp-up

### For Technical Leaders

- **Enforce Compliance**: Standards in knowledge base → automatic agent compliance
- **Track Agent ROI**: Timeline shows velocity improvements with agent assistance
- **Knowledge Gaps**: Identify areas where agents struggle (need more knowledge)
- **Institutional Memory**: Knowledge persists even as team members change

## 📁 File Structure

Agent Brain creates this structure in your repository:

```
.agent-brain/
├── golden-paths/          # Recommended approaches
├── patterns/              # Design patterns
├── standards/             # Coding standards
├── learnings/             # Session learnings
├── adrs/                  # Architecture decisions
├── snippets/              # Code snippets
├── templates/             # Saved knowledge templates (JSON)
├── sessions/              # Session journals
│   └── YYYY-MM/          # Organized by year-month
├── events/               # Event tracking
│   └── knowledge-events.json
└── exports/              # Exported templates

claude.md                  # Optional: AI agent guidance file
```

All files are markdown with YAML frontmatter - easy to read, edit, and version control.

## 🔧 Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Open Timeline | `Ctrl+Shift+T` | `Cmd+Shift+T` |
| Refresh Data | Click refresh icon | Click refresh icon |

## 🎨 Themes

Agent Brain respects your VSCode theme:

- **Timeline**: Uses VSCode color variables for consistent theming
- **Architecture Diagram**: Automatically switches between light/dark versions
- **Knowledge UI**: Adapts to your editor's color scheme

## 🚧 Roadmap

- [ ] GitHub integration (PRs, issues, releases)
- [ ] Advanced pattern recognition
- [ ] AI-powered knowledge suggestions
- [ ] Team collaboration features
- [ ] Knowledge marketplace
- [ ] Prompt enhancement pipeline

## 🤝 Contributing

This is currently a private/local extension. If you're interested in contributing, please reach out to the maintainers.

## 📝 License

See LICENSE file for details.

## 🆘 Support

Having issues? Check the AB Support tab for architecture documentation, or review the output panel (View → Output → "Agent Brain Platform") for logs.

---

**Agent Brain Platform** - Your second brain for software development 🧠✨
