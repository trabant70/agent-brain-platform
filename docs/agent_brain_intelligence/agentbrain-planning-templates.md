# Agent Brain Planning Templates

## Template: Enhancement Stage Development

**Trigger Patterns**: "add enhancement stage", "new prompt enhancement", "implement stage"

### Planning Sections

#### 1. Capability Analysis [REQUIRED]
Before implementing, identify:
- What specific capability will this stage add?
- What problem does it solve that previous stages don't?
- What makes this a mechanical vs semantic enhancement?
- What percentage of prompts will benefit from this?
- What are the measurable success criteria?

#### 2. Stage Integration [REQUIRED]
Document the integration approach:
- Which stage number will this be?
- What stage does it extend?
- How will it chain to previous stages?
- What happens if this stage fails?
- Can it be disabled independently?

#### 3. Implementation Strategy [REQUIRED]
Plan the implementation:
- Input/output examples (at least 3)
- Edge cases to handle
- Performance considerations
- Test scenarios (positive and negative)
- Documentation needs

#### 4. Validation Approach [REQUIRED]
Define how to validate success:
- Unit test coverage targets
- Integration test scenarios
- Performance benchmarks
- User acceptance criteria
- A/B testing strategy

### Completion Criteria
- [ ] Stage adds exactly ONE capability
- [ ] Previous stages still function correctly
- [ ] Can be enabled/disabled via config
- [ ] Tests achieve >80% coverage
- [ ] Documentation includes examples

---

## Template: Knowledge Package Creation

**Trigger Patterns**: "create expertise package", "package knowledge", "distribute expertise"

### Planning Sections

#### 1. Domain Analysis [REQUIRED]
Analyze the expertise domain:
- What specific domain does this cover?
- Who is the target audience?
- What problems does this expertise solve?
- What are common mistakes in this domain?
- What existing packages might conflict?

#### 2. Content Inventory [REQUIRED]
List all content to include:
- Number and types of rules
- Planning templates needed
- Code patterns to document
- Good/bad examples to provide
- Dependencies on other packages

#### 3. Authority and Enforcement [REQUIRED]
Define governance model:
- Authority level (organizational/expert/community)
- Enforcement (mandatory/recommended/optional)
- Scope (projects/languages/teams)
- Conflict resolution approach
- Override permissions

#### 4. Validation Strategy [REQUIRED]
Plan validation approach:
- Rule condition testing
- Template effectiveness metrics
- Example code verification
- Package compatibility checks
- Security scanning needs

### Completion Criteria
- [ ] All rules have clear conditions and requirements
- [ ] Templates improve AI planning success
- [ ] Examples demonstrate clear value
- [ ] Package passes validation
- [ ] Documentation complete

---

## Template: UI Component Development

**Trigger Patterns**: "add ui panel", "create interface", "new webview component"

### Planning Sections

#### 1. User Experience Design [REQUIRED]
Design the experience:
- Primary user goal
- Essential vs common vs advanced features
- Progressive disclosure strategy
- Mobile/responsive considerations
- Accessibility requirements (ARIA, keyboard nav)

#### 2. State Management [REQUIRED]
Plan state handling:
- Component state variables
- Message passing with extension
- Persistence needs (workspace/global)
- State synchronization approach
- Error state handling

#### 3. Guidance Integration [REQUIRED]
Plan contextual help:
- First-use guidance
- Error recovery help
- Success reinforcement
- Tooltip triggers
- Tutorial integration points

#### 4. Testing Approach [REQUIRED]
Define testing strategy:
- Unit tests for controller
- Integration tests with extension
- Visual regression tests
- Accessibility testing
- Performance testing

### Completion Criteria
- [ ] Essential features work without configuration
- [ ] Progressive disclosure implemented
- [ ] Responsive on narrow screens
- [ ] Contextual help appears appropriately
- [ ] All tests pass

---

## Template: Enterprise Feature Implementation

**Trigger Patterns**: "enterprise feature", "multi-team", "vendor coordination"

### Planning Sections

#### 1. Requirements Analysis [REQUIRED]
Analyze enterprise needs:
- Number of teams/vendors to support
- Compliance requirements
- Security constraints
- Performance requirements (scale)
- Integration points with existing systems

#### 2. Architecture Design [REQUIRED]
Design the architecture:
- Data model (organizations, teams, vendors)
- Synchronization approach
- Conflict resolution strategy
- Rollback mechanism
- Audit logging approach

#### 3. Security Planning [REQUIRED]
Plan security measures:
- Authentication/authorization
- Data encryption (at rest/in transit)
- Package signing/verification
- Sandboxing approach
- Vulnerability scanning

#### 4. Rollout Strategy [REQUIRED]
Plan the rollout:
- Pilot team selection
- Phased deployment approach
- Training requirements
- Support documentation
- Success metrics

### Completion Criteria
- [ ] Supports 100+ vendors
- [ ] Compliance dashboard functional
- [ ] Audit trail complete
- [ ] Security review passed
- [ ] Performance acceptable at scale

---

## Template: Error Recovery Flow

**Trigger Patterns**: "handle error", "error recovery", "create learning from error"

### Planning Sections

#### 1. Error Detection [REQUIRED]
Plan detection approach:
- Types of errors to detect
- Detection mechanisms
- False positive prevention
- Severity classification
- User notification approach

#### 2. Pattern Extraction [REQUIRED]
Design pattern extraction:
- Pattern components to capture
- Similarity matching algorithm
- Deduplication strategy
- Pattern generalization approach
- Storage format

#### 3. Learning Creation [REQUIRED]
Plan learning creation:
- User interaction flow
- Information to capture
- Validation before saving
- Immediate application approach
- Success tracking mechanism

#### 4. Recovery Actions [REQUIRED]
Define recovery options:
- Automated fix attempts
- Manual fix guidance
- Rollback options
- Alternative approaches
- Escalation path

### Completion Criteria
- [ ] Common errors detected accurately
- [ ] Patterns extracted meaningfully
- [ ] Learnings prevent recurrence
- [ ] Recovery flow is non-scary
- [ ] Success rate improves over time

---

## Template: Performance Optimization

**Trigger Patterns**: "optimize performance", "improve speed", "reduce latency"

### Planning Sections

#### 1. Performance Analysis [REQUIRED]
Analyze current performance:
- Baseline measurements
- Bottleneck identification
- User-perceived vs actual performance
- Critical path analysis
- Resource usage patterns

#### 2. Optimization Strategy [REQUIRED]
Plan optimizations:
- Quick wins vs long-term improvements
- Caching opportunities
- Lazy loading candidates
- Parallel processing options
- Algorithm improvements

#### 3. Implementation Approach [REQUIRED]
Detail implementation:
- Changes to make
- Risk assessment
- Rollback plan
- Testing strategy
- Monitoring approach

#### 4. Validation Method [REQUIRED]
Define success metrics:
- Performance targets
- Measurement methodology
- A/B testing approach
- User experience metrics
- Resource usage limits

### Completion Criteria
- [ ] 50% improvement in target metric
- [ ] No functionality regression
- [ ] User experience improved
- [ ] Resource usage acceptable
- [ ] Monitoring in place

---

## Template: Integration Development

**Trigger Patterns**: "integrate with", "add integration", "connect to"

### Planning Sections

#### 1. Integration Analysis [REQUIRED]
Analyze the integration:
- System to integrate with
- API/interface available
- Data flow direction
- Authentication requirements
- Rate limits/quotas

#### 2. Mapping Design [REQUIRED]
Design data mapping:
- Data model differences
- Transformation requirements
- Validation needs
- Error handling approach
- Synchronization strategy

#### 3. Implementation Plan [REQUIRED]
Plan implementation:
- Connection approach
- Error recovery mechanism
- Testing strategy
- Performance considerations
- Monitoring needs

#### 4. Maintenance Strategy [REQUIRED]
Plan ongoing maintenance:
- Version compatibility
- Breaking change detection
- Update mechanism
- Support documentation
- Troubleshooting guide

### Completion Criteria
- [ ] Integration functional
- [ ] Error handling robust
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Monitoring active

---

## Template: Feature Migration

**Trigger Patterns**: "migrate feature", "upgrade system", "refactor architecture"

### Planning Sections

#### 1. Current State Analysis [REQUIRED]
Analyze what exists:
- Current implementation details
- Dependencies identified
- Usage patterns understood
- Pain points documented
- Technical debt assessed

#### 2. Target State Design [REQUIRED]
Design the target:
- New architecture
- Improvement goals
- Breaking changes
- Migration path
- Rollback strategy

#### 3. Migration Strategy [REQUIRED]
Plan the migration:
- Phases breakdown
- Dual-run period
- Data migration approach
- Testing at each phase
- Communication plan

#### 4. Validation Approach [REQUIRED]
Define validation:
- Functional equivalence tests
- Performance comparison
- User acceptance criteria
- Rollback triggers
- Success metrics

### Completion Criteria
- [ ] Zero data loss
- [ ] Functionality preserved
- [ ] Performance improved
- [ ] Users trained
- [ ] Rollback tested

---

## Meta-Template: Creating New Templates

**Trigger Patterns**: "create template", "new planning template"

### Planning Sections

#### 1. Template Requirements [REQUIRED]
Define the template:
- Problem it solves
- Trigger patterns
- Target users
- Expected outcomes
- Success criteria

#### 2. Section Design [REQUIRED]
Design sections:
- Required vs optional sections
- Prompts for each section
- Validation criteria
- Examples for each section
- Dependencies between sections

#### 3. Integration Planning [REQUIRED]
Plan integration:
- Where template fits in hierarchy
- Conflict with existing templates
- Enhancement stage to apply at
- UI presentation approach
- Tracking mechanisms

#### 4. Effectiveness Measurement [REQUIRED]
Define metrics:
- Usage tracking
- Success rate measurement
- User feedback collection
- Iteration approach
- Retirement criteria

### Completion Criteria
- [ ] Template triggers correctly
- [ ] Sections guide thinking effectively
- [ ] AI follows template structure
- [ ] Measurable improvement shown
- [ ] Documentation complete