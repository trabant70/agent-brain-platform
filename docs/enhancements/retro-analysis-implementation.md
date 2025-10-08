# Agent Brain Retroactive Analysis Implementation Guide
## Code Insights & Personal Learning System

**Version**: 1.0  
**Status**: Implementation Ready  
**Philosophy**: Gentle guidance for humans, firm directives for AI

---

## Core Architecture

### Domain Structure
```
packages/core/src/domains/retro-analysis/
├── types.ts                    # Core types and interfaces
├── RetroAnalysisEngine.ts      # Main analysis engine
├── InsightClassifier.ts        # Gentle classification system
├── PatternDiscovery.ts         # Pattern detection
├── LearningGenerator.ts        # Convert insights to learnings
├── DualVoiceFormatter.ts       # Human vs AI messaging
├── storage/
│   ├── AnalysisCache.ts        # Prevent redundant analysis
│   └── InsightStorage.ts       # Store discoveries
└── filters/
    ├── BranchFilter.ts
    ├── AuthorFilter.ts
    ├── TimeWindowFilter.ts
    └── LanguageFilter.ts
```

---

## Core Types

### `packages/core/src/domains/retro-analysis/types.ts`

```typescript
/**
 * Core philosophy: Discoveries, not violations
 */
export interface CodeInsight {
  id: string;
  type: 'observation' | 'pattern' | 'question' | 'opportunity';
  
  // Humble confidence levels
  confidence: 'certain' | 'likely' | 'possible' | 'uncertain';
  
  // Always supportive
  tone: 'informative' | 'curious' | 'supportive' | 'encouraging';
  
  // The dual voice
  humanMessage: string;    // Gentle, questioning, supportive
  aiDirective?: string;    // Firm, clear, mandatory
  
  // Context
  location: CodeLocation;
  pattern?: DiscoveredPattern;
  similarInstances?: CodeLocation[];
  
  // Learning opportunity
  learningPotential?: {
    suggested: boolean;
    reason: string;
    proposedLearning?: Learning;
  };
  
  // Timeline integration
  firstSeen?: CommitInfo;
  evolution?: CommitInfo[];
  
  // No scores, just observations
  metadata: {
    occurrences: number;
    lastAnalyzed: Date;
    affectedLines?: number;
  };
}

export interface AnalysisOptions {
  // Limits to prevent overwhelming analysis
  branch?: string;           // Specific branch only
  author?: string;           // Your code only
  timeWindow?: {            // Recent code only
    from?: Date;
    to?: Date;
    lastNDays?: number;
  };
  
  languages?: Language[];   // Focus languages
  paths?: PathFilter[];     // Include/exclude paths
  
  // Feature flags for progressive rollout
  features?: {
    patternDiscovery?: boolean;      // Default: true
    learningGeneration?: boolean;    // Default: true
    aiInstructionGen?: boolean;      // Default: false (advanced)
    teamInsights?: boolean;           // Default: false (premium)
  };
  
  // Analysis depth
  depth?: 'quick' | 'standard' | 'thorough';
  
  // Caching
  useCache?: boolean;
  forceRefresh?: boolean;
}

export interface AnalysisResult {
  // Not a report card, a conversation
  summary: InsightSummary;
  insights: CodeInsight[];
  patterns: DiscoveredPattern[];
  opportunities: LearningOpportunity[];
  
  // Your code's story
  timeline: {
    firstCommit: Date;
    lastCommit: Date;
    evolutionStory: string;  // Narrative of how code evolved
  };
  
  // For the knowledge system
  suggestedLearnings: Learning[];
  suggestedPatterns: Pattern[];
  aiInstructions?: AIInstructionSet;
  
  // Metadata
  metadata: {
    filesAnalyzed: number;
    commitsSpanned: number;
    executionTime: number;
    cacheHits: number;
    analysisDepth: string;
  };
}

export interface DualVoiceMessage {
  // To human: gentle, supportive
  human: {
    message: string;
    tone: 'suggestion' | 'observation' | 'question';
    emoji?: string;  // Optional friendly emoji
  };
  
  // To AI: clear, directive
  ai?: {
    instruction: string;
    severity: 'must' | 'should' | 'consider';
    example?: string;
  };
}
```

---

## Implementation Components

### 1. RetroAnalysisEngine

```typescript
export class RetroAnalysisEngine {
  private cache: AnalysisCache;
  private classifier: InsightClassifier;
  private patternDiscovery: PatternDiscovery;
  private learningGen: LearningGenerator;
  private voiceFormatter: DualVoiceFormatter;
  
  /**
   * Main entry point - always gentle, never judgmental
   */
  async analyzeCodebase(
    rootPath: string,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    // Check if we should run (prevent redundant analysis)
    if (!options.forceRefresh && await this.shouldSkipAnalysis(rootPath, options)) {
      return this.getCachedResult(rootPath, options);
    }
    
    // Apply filters progressively
    const scope = await this.determineScope(rootPath, options);
    
    // Gentle progress indication
    await this.notifyProgress('Starting code reflection...', 0);
    
    // Discover, don't judge
    const insights = await this.discoverInsights(scope);
    
    // Find patterns, celebrate consistency
    const patterns = await this.findPatterns(insights);
    
    // Generate learning opportunities
    const opportunities = await this.generateOpportunities(insights, patterns);
    
    // Create the narrative
    const summary = await this.createNarrative(insights, patterns, opportunities);
    
    // Cache for efficiency
    await this.cacheResult(summary);
    
    return summary;
  }
  
  /**
   * Discover insights without judgment
   */
  private async discoverInsights(scope: AnalysisScope): Promise<CodeInsight[]> {
    const insights: CodeInsight[] = [];
    
    for (const file of scope.files) {
      const fileInsights = await this.analyzeFile(file, scope.options);
      
      // Frame everything positively or curiously
      for (const insight of fileInsights) {
        insights.push(this.frameInsightPositively(insight));
      }
    }
    
    return insights;
  }
  
  /**
   * Frame insights supportively
   */
  private frameInsightPositively(raw: RawInsight): CodeInsight {
    return {
      ...raw,
      humanMessage: this.voiceFormatter.toHuman(raw),
      aiDirective: this.voiceFormatter.toAI(raw),
      tone: this.selectSupportiveTone(raw)
    };
  }
  
  /**
   * Should we skip this analysis?
   */
  private async shouldSkipAnalysis(
    path: string, 
    options: AnalysisOptions
  ): Promise<boolean> {
    // Don't waste time on identical analysis
    const cacheKey = this.cache.generateKey(path, options);
    const cached = await this.cache.get(cacheKey);
    
    if (cached && !this.knowledgeChanged(cached.knowledgeVersion)) {
      // Gentle reminder
      vscode.window.showInformationMessage(
        'Using recent analysis results. Add new patterns or use "force refresh" for new analysis.'
      );
      return true;
    }
    
    return false;
  }
}
```

### 2. InsightClassifier (Humble Classification)

```typescript
export class InsightClassifier {
  /**
   * Classify with humility and uncertainty
   */
  classify(pattern: CodePattern, context: AnalysisContext): CodeInsight {
    // Never certain about subjective things
    const confidence = this.assessConfidence(pattern, context);
    
    // Always frame as observation, not judgment
    if (confidence === 'certain') {
      return this.createObservation(pattern, context);
    }
    
    if (confidence === 'likely') {
      return this.createSuggestion(pattern, context);
    }
    
    if (confidence === 'possible') {
      return this.createQuestion(pattern, context);
    }
    
    // When uncertain, be curious
    return this.createCuriosity(pattern, context);
  }
  
  private createObservation(pattern: CodePattern, context: Context): CodeInsight {
    return {
      type: 'observation',
      confidence: 'certain',
      tone: 'informative',
      
      humanMessage: `I noticed you handle ${pattern.type} this way in ${pattern.count} places. ` +
                   `It's working well!`,
      
      aiDirective: `ALWAYS use ${pattern.name} pattern as demonstrated in ${pattern.examples[0]}`,
      
      learningPotential: {
        suggested: true,
        reason: 'Consistent successful pattern'
      }
    };
  }
  
  private createSuggestion(pattern: CodePattern, context: Context): CodeInsight {
    return {
      type: 'opportunity',
      confidence: 'likely',
      tone: 'supportive',
      
      humanMessage: `You might find it helpful to look at how you handled ` +
                   `${pattern.similar} - it worked really well there.`,
      
      aiDirective: `CONSIDER using the ${pattern.name} approach from ${pattern.goodExample}`,
      
      learningPotential: {
        suggested: false,
        reason: 'Still exploring best approach'
      }
    };
  }
}
```

### 3. DualVoiceFormatter

```typescript
export class DualVoiceFormatter {
  /**
   * Gentle voice for humans
   */
  toHuman(insight: RawInsight): string {
    const templates = {
      observation: [
        `I noticed ${insight.description}. Interesting approach!`,
        `You've developed a pattern for ${insight.context}.`,
        `This ${insight.pattern} appears in several places.`
      ],
      
      opportunity: [
        `Have you considered ${insight.suggestion}?`,
        `This reminds me of ${insight.similar} which worked well.`,
        `Might be worth looking at ${insight.alternative}.`
      ],
      
      question: [
        `I'm curious about ${insight.pattern} - is this intentional?`,
        `This is unique - worth documenting?`,
        `Different from your usual approach - experimenting?`
      ]
    };
    
    return this.selectTemplate(templates[insight.type], insight);
  }
  
  /**
   * Firm voice for AI
   */
  toAI(insight: RawInsight): string | undefined {
    // Only create AI directives for high-confidence patterns
    if (insight.confidence < 0.7) return undefined;
    
    const severity = this.determineSeverity(insight);
    
    const templates = {
      must: `MUST ${insight.action} - found ${insight.issues} issues when not followed`,
      should: `SHOULD ${insight.action} - improves code quality significantly`,
      consider: `CONSIDER ${insight.action} - matches project patterns`
    };
    
    return templates[severity];
  }
}
```

### 4. Analysis Filters

```typescript
export class AnalysisFilters {
  /**
   * Progressive filtering to manage scope
   */
  async applyFilters(
    files: string[], 
    options: AnalysisOptions
  ): Promise<string[]> {
    let filtered = files;
    
    // Branch filter
    if (options.branch) {
      filtered = await this.filterByBranch(filtered, options.branch);
    }
    
    // Author filter - "just my code"
    if (options.author) {
      filtered = await this.filterByAuthor(filtered, options.author);
    }
    
    // Time window - "recent code only"
    if (options.timeWindow) {
      filtered = await this.filterByTime(filtered, options.timeWindow);
    }
    
    // Language filter
    if (options.languages?.length) {
      filtered = this.filterByLanguage(filtered, options.languages);
    }
    
    // Path filters
    if (options.paths?.length) {
      filtered = this.filterByPath(filtered, options.paths);
    }
    
    return filtered;
  }
  
  private async filterByAuthor(files: string[], author: string): Promise<string[]> {
    // Use git blame to find author's code
    const authorFiles: string[] = [];
    
    for (const file of files) {
      const blame = await this.git.blame(file);
      const authorLines = blame.filter(line => line.author === author);
      
      // Include if author has significant contribution
      if (authorLines.length / blame.length > 0.3) {
        authorFiles.push(file);
      }
    }
    
    return authorFiles;
  }
}
```

### 5. Learning Generator

```typescript
export class LearningGenerator {
  /**
   * Convert insights to actionable learnings
   */
  async generateLearnings(
    insights: CodeInsight[]
  ): Promise<Learning[]> {
    const learnings: Learning[] = [];
    
    // Group insights by pattern
    const grouped = this.groupByPattern(insights);
    
    for (const [pattern, group] of grouped) {
      if (this.shouldCreateLearning(group)) {
        const learning = await this.createLearning(pattern, group);
        learnings.push(learning);
      }
    }
    
    return learnings;
  }
  
  private createLearning(pattern: string, insights: CodeInsight[]): Learning {
    return {
      id: generateId(),
      name: this.generateFriendlyName(pattern),
      
      // Gentle description
      description: `Based on ${insights.length} observations in your code`,
      
      // What we learned
      lesson: this.extractLesson(insights),
      
      // How to apply
      application: {
        forHuman: `Consider this approach when you see ${pattern}`,
        forAI: `ALWAYS apply this pattern: ${this.extractPattern(insights)}`
      },
      
      // Evidence
      evidence: {
        occurrences: insights.length,
        firstSeen: insights[0].firstSeen,
        successRate: this.calculateSuccess(insights)
      }
    };
  }
}
```

### 6. Timeline Integration

```typescript
export class RetroTimelineIntegration {
  /**
   * Add insights to timeline as gentle markers
   */
  async addToTimeline(insights: CodeInsight[]): Promise<void> {
    const events = insights.map(insight => ({
      timestamp: insight.firstSeen?.date || new Date(),
      type: 'discovery',
      
      // Gentle icons, not judgment
      icon: this.selectGentleIcon(insight),
      
      // Supportive message
      message: insight.humanMessage,
      
      // Link to code
      location: insight.location,
      
      // No severity, just categories
      category: insight.type,
      
      // Learning opportunity
      action: insight.learningPotential ? 'Create Learning' : undefined
    }));
    
    await this.timeline.addEvents(events);
  }
  
  private selectGentleIcon(insight: CodeInsight): string {
    const icons = {
      observation: '🔍',  // Discovery
      pattern: '🎯',      // Pattern found
      question: '🤔',     // Something to consider
      opportunity: '💡'   // Improvement idea
    };
    
    return icons[insight.type] || '📝';
  }
}
```

### 7. Feature Flags

```typescript
export class FeatureFlags {
  private flags: Map<string, boolean> = new Map();
  
  constructor() {
    // Progressive feature rollout
    this.flags.set('retro.basicAnalysis', true);        // Everyone
    this.flags.set('retro.patternDiscovery', true);     // Everyone
    this.flags.set('retro.learningGeneration', true);   // Everyone
    this.flags.set('retro.aiInstructions', false);      // Advanced users
    this.flags.set('retro.teamInsights', false);        // Premium
    this.flags.set('retro.autoFix', false);            // Future
  }
  
  isEnabled(feature: string): boolean {
    // Check user preferences
    const userOverride = vscode.workspace.getConfiguration('agentBrain.retro').get(feature);
    if (userOverride !== undefined) return userOverride;
    
    // Check license level
    const license = this.getLicenseLevel();
    if (license === 'premium') return true;
    
    // Default flags
    return this.flags.get(feature) ?? false;
  }
}
```

---

## UI Integration

### Retroactive Analysis View

```typescript
export class RetroAnalysisView {
  render(result: AnalysisResult): string {
    return `
      <div class="retro-analysis">
        <h2>🔍 Code Insights</h2>
        
        <!-- Gentle summary, no scores -->
        <div class="summary">
          <p>${result.summary.narrative}</p>
          <div class="stats">
            <span>📝 ${result.insights.length} observations</span>
            <span>🎯 ${result.patterns.length} patterns found</span>
            <span>💡 ${result.opportunities.length} ideas</span>
          </div>
        </div>
        
        <!-- Discoveries, not violations -->
        <div class="discoveries">
          <h3>What I Noticed</h3>
          ${result.insights.map(i => `
            <div class="insight ${i.type}">
              <span class="icon">${this.getIcon(i)}</span>
              <span class="message">${i.humanMessage}</span>
              ${i.learningPotential ? 
                `<button onclick="createLearning('${i.id}')">📚 Save Learning</button>` : ''}
            </div>
          `).join('')}
        </div>
        
        <!-- Your patterns -->
        <div class="patterns">
          <h3>Your Patterns</h3>
          ${result.patterns.map(p => `
            <div class="pattern">
              <strong>${p.name}</strong>: appears ${p.count} times
              <button onclick="documentPattern('${p.id}')">Document This</button>
            </div>
          `).join('')}
        </div>
        
        <!-- Gentle suggestions -->
        <div class="opportunities">
          <h3>Ideas to Consider</h3>
          ${result.opportunities.map(o => `
            <div class="opportunity">
              💡 ${o.suggestion}
              <button onclick="explore('${o.id}')">Explore</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
```

---

## Commands

```typescript
// In package.json
{
  "contributes": {
    "commands": [
      {
        "command": "agentBrain.retroAnalysis",
        "title": "Reflect on Code",
        "category": "Agent Brain"
      },
      {
        "command": "agentBrain.retroAnalysis.myCode",
        "title": "Reflect on My Code Only",
        "category": "Agent Brain"
      },
      {
        "command": "agentBrain.retroAnalysis.recent",
        "title": "Recent Code Insights (Last 7 Days)",
        "category": "Agent Brain"
      }
    ]
  }
}
```

---

## Success Metrics (No Judgment)

Instead of compliance scores:
- Number of patterns discovered
- Learnings generated from code
- AI instruction improvements
- Developer satisfaction (not compliance)

---

## Privacy & Performance

```typescript
export class AnalysisCache {
  /**
   * Prevent redundant analysis
   */
  generateKey(path: string, options: AnalysisOptions): string {
    return crypto.hash({
      path,
      branch: options.branch,
      author: options.author,
      timeWindow: options.timeWindow,
      knowledgeVersion: this.getKnowledgeVersion()
    });
  }
  
  async get(key: string): Promise<AnalysisResult | null> {
    // Check if cached result exists and is fresh
    const cached = await this.storage.get(key);
    
    if (cached && this.isFresh(cached)) {
      return cached;
    }
    
    return null;
  }
}
```

---

## The Philosophy in Code

```typescript
// NEVER
if (violations.length > 0) {
  showError(`Found ${violations.length} violations!`);
}

// ALWAYS
if (insights.length > 0) {
  showInfo(`Discovered ${insights.length} interesting patterns in your code`);
}

// NEVER
return {
  complianceScore: 45,
  technicalDebt: '$50,000',
  violations: 234
};

// ALWAYS
return {
  narrative: 'Your code shows consistent error handling patterns',
  patterns: discoveredPatterns,
  opportunities: growthOpportunities
};
```