# Agent Brain Architectural Decision Records

## ADR-001: Progressive Enhancement Over Pretense
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Chief Architect

### Context
AI assistance tools often pretend to be more intelligent than they are, using "confidence theater" with meaningless scores and multiple versions that are just verbosity variations.

### Decision
We will implement honest progressive enhancement where each stage adds real, measurable capability without pretending to have intelligence we don't possess.

### Consequences
- **Positive**: Users trust the system because it's honest about capabilities
- **Positive**: Each stage can be tested and validated independently  
- **Negative**: May appear less sophisticated initially
- **Mitigation**: Clear value delivery at each stage builds trust

### Implementation
```typescript
// WRONG: Pretending to be intelligent
confidence: 0.95 // Arbitrary number

// RIGHT: Honest about capabilities  
stage: 2 // Mechanical pattern expansion, no AI
```

---

## ADR-002: Novice-First Design Philosophy
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: UX Lead

### Context
Target users are frustrated novices who were promised "AI will code for me" but find AI tools produce broken code without context.

### Decision
Every interface element, message, and feature must be understandable by someone with <6 months coding experience. No jargon without explanation.

### Consequences
- **Positive**: Broader adoption among intended audience
- **Positive**: Forces clarity in communication
- **Negative**: May frustrate power users wanting advanced features immediately
- **Mitigation**: Progressive disclosure - simple first, complex on demand

### Examples
```typescript
// WRONG: Developer jargon
"ADRs" // What's an ADR?

// RIGHT: Friendly naming
"Project Rules" // Clear what this is
```

---

## ADR-003: Context Injection Before Intelligence
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Technical Lead

### Context
80% of prompt failures are mechanical (missing context), not semantic (misunderstood intent). We don't need AI to fix mechanical problems.

### Decision
Prioritize mechanical context injection (Stage 1-3) before any semantic understanding (Stage 7+). Context injection alone provides 60-80% of value.

### Consequences
- **Positive**: Immediate value without LLM costs
- **Positive**: Predictable, testable behavior
- **Negative**: Can't handle ambiguous requests initially
- **Mitigation**: Stage 6 adds interactive clarification

### Validation
Track prompt success rate at each stage to validate 80/20 rule.

---

## ADR-004: Learning From Success, Not Theory
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: ML Engineer

### Context
We could guess what makes prompts better, or we could measure what actually works in production.

### Decision
Every enhancement strategy must be validated by actual success metrics. Failed sessions generate learnings. Successful patterns become templates.

### Consequences
- **Positive**: System improves based on reality, not assumptions
- **Positive**: Learnings are specific to user's actual work
- **Negative**: Requires time to build training data
- **Mitigation**: Ship with reasonable defaults, improve over time

### Implementation
```typescript
// Track everything
interface SessionResult {
  prompt: string;
  enhancement: string;
  success: boolean;
  errors: Error[];
  duration: number;
}
```

---

## ADR-005: Visual Knowledge Management
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Product Manager

### Context
Developers don't understand why AI fails. Abstract "context" is invisible and mysterious.

### Decision
Make all knowledge visible with checkboxes. Users see exactly what context will be added to prompts. Check = included, uncheck = excluded.

### Consequences
- **Positive**: Users understand cause and effect
- **Positive**: Easy experimentation without fear
- **Negative**: UI can become cluttered with many items
- **Mitigation**: Hierarchical tree with collapsible sections

### Principle
"If users can't see it, they won't trust it."

---

## ADR-006: Multi-Modal Storage Strategy
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Backend Architect

### Context
Need to store patterns, learnings, sessions, and packages with different persistence and sharing requirements.

### Decision
Use `.agent-brain/` directory for all persistent storage with JSON/Markdown files. Human-readable, version-controllable, shareable.

### Consequences
- **Positive**: Git-friendly for team sharing
- **Positive**: No database dependency
- **Positive**: Easy backup/restore
- **Negative**: File I/O overhead
- **Mitigation**: In-memory caching with file watching

### Structure
```
.agent-brain/
├── patterns/      # Markdown files
├── learnings/     # JSON files  
├── sessions/      # JSON with references
├── packages/      # Imported expertise
└── profile.json   # Project configuration
```

---

## ADR-007: Extension as Platform, Not Tool
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Chief Architect

### Context
Enterprise adoption requires supporting multiple teams, vendors, and governance requirements.

### Decision
Build Agent Brain as a platform that supports expertise packages, vendor coordination, and compliance monitoring, not just a productivity tool.

### Consequences
- **Positive**: Enterprise market opportunity
- **Positive**: Network effects from shared packages
- **Negative**: Increased complexity
- **Mitigation**: Platform features are optional add-ons

### Key Abstractions
- ExpertisePackage: Distributable knowledge units
- VendorCoordinator: Multi-team synchronization
- ComplianceMonitor: Real-time validation

---

## ADR-008: Planning Before Coding
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Senior Developer

### Context
AI agents suffer from "execution myopia" - diving into code without considering requirements, errors, or integration.

### Decision
Inject planning templates that force AI to think through approach before implementation. Plans are validated against execution.

### Consequences
- **Positive**: Better structured solutions
- **Positive**: Fewer missed requirements
- **Negative**: Slower initial response
- **Mitigation**: Quick mode for simple tasks

### Template Example
```markdown
Before coding, list:
1. Main components needed
2. Error cases to handle
3. Integration points
4. Test scenarios
```

---

## ADR-009: Graceful Degradation
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Reliability Engineer

### Context
Advanced features (LLM intent recognition, package validation) may fail or be unavailable.

### Decision
Every advanced feature must gracefully degrade to simpler functionality. System remains useful even with all advanced features disabled.

### Consequences
- **Positive**: Resilient to failures
- **Positive**: Works in restricted environments
- **Negative**: Must maintain multiple code paths
- **Mitigation**: Clear stage boundaries minimize complexity

### Implementation
```typescript
try {
  return await stage7.enhanceWithLLM(prompt);
} catch {
  return stage2.mechanicalEnhance(prompt);
}
```

---

## ADR-010: Error Recovery as Learning Opportunity
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: UX Designer

### Context
When AI generates broken code, novices panic and don't know how to recover.

### Decision
Every error is an opportunity to create a learning. Proactive error detection with guided recovery flow.

### Consequences
- **Positive**: Errors become less scary
- **Positive**: System improves from failures
- **Negative**: Requires error detection logic
- **Mitigation**: Start with common syntax errors

### UI Flow
1. Detect error
2. Find similar past errors
3. Offer to create learning
4. Suggest fix options

---

## ADR-011: Community-Driven Evolution
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Community Manager

### Context
We can't anticipate all use cases. Community has collective wisdom.

### Decision
Enable sharing of patterns, learnings, golden paths, and expertise packages. Community contributions improve everyone's experience.

### Consequences
- **Positive**: Network effects increase value
- **Positive**: Diverse use cases covered
- **Negative**: Quality control challenges
- **Mitigation**: Ratings, verification, and sandboxing

### Sharing Mechanisms
- Import/export patterns
- Package marketplace
- Golden path templates
- Success metrics sharing

---

## ADR-012: Measurement Over Speculation
**Status**: Accepted  
**Date**: 2025-01-07  
**Author**: Data Scientist

### Context
We could guess what helps or measure what actually helps.

### Decision
Instrument everything. Every enhancement, session, error, and success is tracked. Data drives feature decisions.

### Consequences
- **Positive**: Evidence-based improvements
- **Positive**: Clear ROI metrics
- **Negative**: Privacy concerns
- **Mitigation**: Local-only analytics with opt-in sharing

### Key Metrics
```typescript
interface Metrics {
  enhancementStages: StageMetrics[];
  sessionSuccess: number;
  errorReduction: number;
  timeToFirstSuccess: number;
  knowledgeGrowth: number;
}
```