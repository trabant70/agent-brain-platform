/**
 * PRAGMATIC PROMPT ENHANCER EVOLUTION
 * 
 * A honest progression from mechanical string processing to intelligent enhancement
 * Each stage builds on the previous, adding capabilities without pretense
 */

// ============================================================================
// STAGE 1: MECHANICAL CONTEXT INJECTION (No Intelligence Required)
// ============================================================================

class Stage1_PureContextInjector {
  /**
   * The honest baseline: We just add context we already have
   * No intelligence, no pretense, just mechanical concatenation
   */
  
  enhance(prompt: string, context: Context): string {
    const parts = [prompt];
    
    // Add current file if we have it
    if (context.currentFile) {
      parts.push(`\nCurrent file: ${context.currentFile}`);
    }
    
    // Add recent errors if any
    if (context.recentErrors?.length > 0) {
      parts.push(`\nRecent errors:\n${context.recentErrors.join('\n')}`);
    }
    
    // Add test failures if any
    if (context.testFailures?.length > 0) {
      parts.push(`\nFailing tests: ${context.testFailures.join(', ')}`);
    }
    
    return parts.join('\n');
  }
}

// ============================================================================
// STAGE 2: PATTERN-BASED EXPANSION (Rule-Based Processing)
// ============================================================================

class Stage2_PatternExpander extends Stage1_PureContextInjector {
  /**
   * Add mechanical pattern matching to fix common deficiencies
   * Still no intelligence, but uses linguistic patterns
   */
  
  private pronounPatterns = {
    // Map vague pronouns to their likely referents
    '\\bit\\b': () => this.context.lastNoun || 'the code',
    '\\bthis\\b': () => this.context.currentFocus || 'the current implementation',
    '\\bthat\\b': () => this.context.lastMentioned || 'the previous approach',
    '\\bthere\\b': () => this.context.currentLocation || 'in the file'
  };
  
  private missingSpecPatterns = [
    {
      trigger: /^(add|create|implement)/i,
      missing: /test|spec/i,
      suggest: '\n[Consider: Should this include tests?]'
    },
    {
      trigger: /(async|await|fetch|api)/i,
      missing: /error|handle|catch|try/i,
      suggest: '\n[Consider: How should errors be handled?]'
    },
    {
      trigger: /refactor/i,
      missing: /maintain|backward|compatible/i,
      suggest: '\n[Consider: Should this maintain backward compatibility?]'
    }
  ];
  
  enhance(prompt: string, context: Context): string {
    let enhanced = prompt;
    
    // Stage 2a: Expand vague references
    for (const [pattern, replacer] of Object.entries(this.pronounPatterns)) {
      enhanced = enhanced.replace(new RegExp(pattern, 'gi'), replacer());
    }
    
    // Stage 2b: Detect and suggest missing specifications
    const suggestions = [];
    for (const spec of this.missingSpecPatterns) {
      if (spec.trigger.test(enhanced) && !spec.missing.test(enhanced)) {
        suggestions.push(spec.suggest);
      }
    }
    
    if (suggestions.length > 0) {
      enhanced += '\n' + suggestions.join('');
    }
    
    // Apply Stage 1 context injection
    return super.enhance(enhanced, context);
  }
}

// ============================================================================
// STAGE 3: STRUCTURAL TEMPLATES (Proven Patterns)
// ============================================================================

class Stage3_StructuredEnhancer extends Stage2_PatternExpander {
  /**
   * Apply proven structural templates based on request type
   * Still mechanical, but using empirically successful patterns
   */
  
  private templates = {
    bugFix: {
      trigger: /fix|bug|broken|error|issue/i,
      structure: (prompt: string, context: Context) => `
ISSUE: ${prompt}

SYMPTOMS:
- Current behavior: ${context.recentErrors?.[0] || '[Describe what happens]'}
- Expected behavior: [Inferred from context]
- When it started: ${context.lastWorkingCommit ? `After ${context.lastWorkingCommit}` : 'Unknown'}

CONTEXT:
- File: ${context.currentFile || 'Unknown'}
- Related tests: ${context.testFailures?.join(', ') || 'None failing'}
- Recent changes: ${context.recentChanges || 'See git log'}

CONSTRAINTS:
- Maintain existing API contracts
- Don't break passing tests
- Follow existing error handling patterns`
    },
    
    feature: {
      trigger: /add|create|implement|build|feature/i,
      structure: (prompt: string, context: Context) => `
TASK: ${prompt}

REQUIREMENTS:
- Primary goal: ${this.extractGoal(prompt)}
- Success criteria: Tests pass, follows patterns

CONTEXT:
- Working in: ${context.currentFile || 'New file needed'}
- Related code: ${this.findSimilarCode(prompt, context)}
- Patterns to follow: ${context.patterns?.filter(p => this.isRelevant(p, prompt)).join(', ') || 'Repository, Result<T,E>'}

CONSTRAINTS:
${context.constraints?.map(c => `- ${c}`).join('\n') || '- Follow existing architectural decisions'}

EXAMPLES:
${this.findExamples(prompt, context) || '- See similar implementations in codebase'}`
    },
    
    refactor: {
      trigger: /refactor|clean|improve|optimize|reorganize/i,
      structure: (prompt: string, context: Context) => `
REFACTORING: ${prompt}

CURRENT STATE:
- Code location: ${context.currentFile}
- Technical debt: ${this.identifyDebt(context)}
- Test coverage: ${context.testCoverage || 'Unknown'}

GOALS:
- ${this.extractRefactorGoals(prompt).join('\n- ')}

CONSTRAINTS:
- Maintain all existing functionality
- Keep API backward compatible
- All tests must still pass
- Performance should not degrade

APPROACH:
1. Identify all consumers of changed code
2. Update tests first (if needed)
3. Refactor incrementally
4. Verify no regression`
    }
  };
  
  private detectRequestType(prompt: string): string | null {
    for (const [type, template] of Object.entries(this.templates)) {
      if (template.trigger.test(prompt)) {
        return type;
      }
    }
    return null;
  }
  
  enhance(prompt: string, context: Context): string {
    const requestType = this.detectRequestType(prompt);
    
    if (requestType && this.templates[requestType]) {
      // Apply structural template
      return this.templates[requestType].structure(prompt, context);
    }
    
    // Fall back to Stage 2 enhancement
    return super.enhance(prompt, context);
  }
  
  // Helper methods (mechanical extraction, no AI needed)
  private extractGoal(prompt: string): string {
    const verbMatch = prompt.match(/^(add|create|implement|build)\s+(.+)/i);
    return verbMatch ? verbMatch[2] : prompt;
  }
  
  private findSimilarCode(prompt: string, context: Context): string {
    // Simple keyword matching against known files
    const keywords = prompt.toLowerCase().split(/\s+/);
    const similar = context.files?.filter(f => 
      keywords.some(k => f.toLowerCase().includes(k))
    );
    return similar?.slice(0, 3).join(', ') || 'None found';
  }
  
  private isRelevant(pattern: Pattern, prompt: string): boolean {
    // Mechanical keyword matching
    return prompt.toLowerCase().includes(pattern.name.toLowerCase());
  }
}

// ============================================================================
// STAGE 4: LEARNING FROM SUCCESS (Pattern Recognition)
// ============================================================================

class Stage4_LearningEnhancer extends Stage3_StructuredEnhancer {
  /**
   * Track which enhancements lead to success and adapt
   * Still no AI, but uses statistical pattern matching
   */
  
  private successDatabase = new Map<string, SuccessPattern>();
  
  interface SuccessPattern {
    originalFeatures: string[];  // Keywords, structure markers
    enhancementType: string;     // Which template/approach was used
    successRate: number;         // How often it worked
    averageSessionLength: number; // Proxy for quality
    userModifications: string[];  // What users typically add/change
  }
  
  async enhance(prompt: string, context: Context): string {
    // Extract features from the prompt
    const features = this.extractFeatures(prompt);
    
    // Find similar successful patterns
    const bestPattern = this.findBestMatchingPattern(features);
    
    if (bestPattern && bestPattern.successRate > 0.7) {
      // Apply the successful pattern
      return this.applySuccessPattern(prompt, context, bestPattern);
    }
    
    // Fall back to Stage 3
    const enhanced = super.enhance(prompt, context);
    
    // Track this enhancement for future learning
    this.trackEnhancement(prompt, enhanced, features);
    
    return enhanced;
  }
  
  private extractFeatures(prompt: string): string[] {
    const features = [];
    
    // Length category
    features.push(`length:${prompt.length < 20 ? 'short' : prompt.length < 50 ? 'medium' : 'long'}`);
    
    // Verb used
    const verb = prompt.match(/^(\w+)/i)?.[1]?.toLowerCase();
    if (verb) features.push(`verb:${verb}`);
    
    // Contains question
    if (prompt.includes('?')) features.push('has:question');
    
    // Technical terms
    const techTerms = ['async', 'api', 'database', 'test', 'error', 'performance'];
    techTerms.forEach(term => {
      if (prompt.toLowerCase().includes(term)) {
        features.push(`tech:${term}`);
      }
    });
    
    // Sentence count
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim()).length;
    features.push(`sentences:${sentences}`);
    
    return features;
  }
  
  private findBestMatchingPattern(features: string[]): SuccessPattern | null {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [key, pattern] of this.successDatabase.entries()) {
      const score = this.calculateSimilarity(features, pattern.originalFeatures);
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = pattern;
      }
    }
    
    return bestMatch;
  }
  
  private calculateSimilarity(features1: string[], features2: string[]): number {
    const set1 = new Set(features1);
    const set2 = new Set(features2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size; // Jaccard similarity
  }
  
  recordSuccess(originalPrompt: string, enhancedPrompt: string, success: boolean, sessionLength: number) {
    // This would be called after a session completes
    const features = this.extractFeatures(originalPrompt);
    const key = features.join('|');
    
    const existing = this.successDatabase.get(key) || {
      originalFeatures: features,
      enhancementType: this.detectRequestType(originalPrompt) || 'generic',
      successRate: 0,
      averageSessionLength: 0,
      userModifications: []
    };
    
    // Update success rate (exponential moving average)
    existing.successRate = existing.successRate * 0.8 + (success ? 1 : 0) * 0.2;
    existing.averageSessionLength = existing.averageSessionLength * 0.8 + sessionLength * 0.2;
    
    this.successDatabase.set(key, existing);
  }
}

// ============================================================================
// STAGE 5: AGENT-SPECIFIC OPTIMIZATION (Voice Calibration)
// ============================================================================

class Stage5_AgentOptimizedEnhancer extends Stage4_LearningEnhancer {
  /**
   * Optimize prompts for specific AI agents based on known preferences
   * Still rule-based, but sophisticated rules from empirical observation
   */
  
  private agentProfiles = {
    claude: {
      preferences: {
        style: 'analytical',
        structure: 'hierarchical',
        detail: 'comprehensive'
      },
      transformations: [
        // Claude responds well to thinking prompts
        { pattern: /^fix/i, replacement: 'Analyze and resolve' },
        { pattern: /^make/i, replacement: 'Design and implement' },
        { pattern: /quick/i, replacement: '' }, // Remove "quick", Claude is thorough
      ],
      prefixes: ['Let\'s think through this step-by-step:\n'],
      suffixes: ['\nPlease ensure the solution is maintainable and well-tested.']
    },
    
    copilot: {
      preferences: {
        style: 'imperative',
        structure: 'linear',
        detail: 'concise'
      },
      transformations: [
        // Copilot prefers direct commands
        { pattern: /could you please/gi, replacement: '' },
        { pattern: /would you mind/gi, replacement: '' },
        { pattern: /I think/gi, replacement: '' },
      ],
      prefixes: [],
      suffixes: ['\n// TODO: Add error handling']
    },
    
    cursor: {
      preferences: {
        style: 'conversational',
        structure: 'flexible',
        detail: 'moderate'
      },
      transformations: [
        // Cursor works well with context markers
        { pattern: /in this file/gi, replacement: 'in the current file' },
      ],
      prefixes: [],
      suffixes: []
    }
  };
  
  enhance(prompt: string, context: Context & { targetAgent?: string }): string {
    let enhanced = super.enhance(prompt, context);
    
    // Apply agent-specific optimizations if we know the target
    if (context.targetAgent && this.agentProfiles[context.targetAgent]) {
      enhanced = this.optimizeForAgent(enhanced, this.agentProfiles[context.targetAgent]);
    }
    
    return enhanced;
  }
  
  private optimizeForAgent(prompt: string, profile: AgentProfile): string {
    let optimized = prompt;
    
    // Apply transformations
    for (const transform of profile.transformations) {
      optimized = optimized.replace(transform.pattern, transform.replacement);
    }
    
    // Add prefix if appropriate
    if (profile.prefixes.length > 0 && !optimized.includes('step-by-step')) {
      optimized = profile.prefixes[0] + optimized;
    }
    
    // Add suffix if appropriate
    if (profile.suffixes.length > 0) {
      optimized = optimized + profile.suffixes[0];
    }
    
    return optimized;
  }
}

// ============================================================================
// STAGE 6: INTERACTIVE REFINEMENT (User Collaboration)
// ============================================================================

class Stage6_InteractiveEnhancer extends Stage5_AgentOptimizedEnhancer {
  /**
   * When mechanical enhancement isn't enough, ask for clarification
   * Admits limitations honestly and collaborates with user
   */
  
  async enhance(prompt: string, context: Context): Promise<EnhancedPrompt> {
    // First, try mechanical enhancement
    const mechanicalEnhancement = super.enhance(prompt, context);
    
    // Detect ambiguities and missing information
    const clarifications = this.detectNeededClarifications(prompt, context);
    
    if (clarifications.length > 0) {
      return {
        enhanced: mechanicalEnhancement,
        clarificationsNeeded: clarifications,
        confidence: 0.6, // Honest about uncertainty
        enhancementType: 'incomplete'
      };
    }
    
    return {
      enhanced: mechanicalEnhancement,
      clarificationsNeeded: [],
      confidence: 0.85, // Confident in mechanical enhancements
      enhancementType: 'complete'
    };
  }
  
  private detectNeededClarifications(prompt: string, context: Context): Clarification[] {
    const clarifications = [];
    
    // Check for unresolved pronouns
    if (prompt.match(/\b(it|this|that)\b/i) && !context.lastNoun) {
      clarifications.push({
        issue: 'ambiguous-reference',
        question: `What does "${RegExp.$1}" refer to?`,
        suggestions: this.guessPossibleReferents(context)
      });
    }
    
    // Check for vague quantities
    if (prompt.match(/\b(some|few|many|several)\b/i)) {
      clarifications.push({
        issue: 'vague-quantity',
        question: `How many specifically?`,
        suggestions: ['2-3', '5-10', 'all']
      });
    }
    
    // Check for missing scope
    if (prompt.match(/\b(refactor|optimize|improve)\b/i) && !prompt.match(/\b(function|class|file|module)\b/i)) {
      clarifications.push({
        issue: 'unclear-scope',
        question: 'What scope should this cover?',
        suggestions: ['Current function', 'Entire class', 'Whole file', 'All related files']
      });
    }
    
    // Check for missing error handling strategy
    if (prompt.match(/\b(api|fetch|async|database)\b/i) && !prompt.match(/\b(error|catch|handle)\b/i)) {
      clarifications.push({
        issue: 'missing-error-strategy',
        question: 'How should errors be handled?',
        suggestions: ['Throw to caller', 'Return Result<T,E>', 'Log and continue', 'Retry with backoff']
      });
    }
    
    return clarifications;
  }
  
  async applyUserClarifications(
    originalPrompt: string, 
    clarifications: ClarificationResponse[]
  ): Promise<string> {
    let refined = originalPrompt;
    
    for (const response of clarifications) {
      switch (response.issue) {
        case 'ambiguous-reference':
          // Replace the pronoun with the clarified reference
          refined = refined.replace(/\b(it|this|that)\b/i, response.answer);
          break;
          
        case 'vague-quantity':
          // Replace vague quantities with specific numbers
          refined = refined.replace(/\b(some|few|many|several)\b/i, response.answer);
          break;
          
        case 'unclear-scope':
          // Add scope specification
          refined += `\nScope: ${response.answer}`;
          break;
          
        case 'missing-error-strategy':
          // Add error handling specification
          refined += `\nError handling: ${response.answer}`;
          break;
      }
    }
    
    // Re-enhance with the clarified prompt
    return super.enhance(refined, context);
  }
}

// ============================================================================
// STAGE 7: LLM-ASSISTED INTENT RECOGNITION (When Available)
// ============================================================================

class Stage7_LLMAssistedEnhancer extends Stage6_InteractiveEnhancer {
  /**
   * When a second agent is available for intent recognition
   * Uses LLM for understanding, but keeps enhancement mechanical
   */
  
  private intentAgent?: LLMAgent; // Optional second agent
  
  async enhance(prompt: string, context: Context): Promise<EnhancedPrompt> {
    // If we have an intent agent, use it for semantic understanding
    if (this.intentAgent) {
      try {
        const intent = await this.analyzeIntent(prompt);
        return this.enhanceWithIntent(prompt, context, intent);
      } catch (error) {
        // Fall back to mechanical enhancement if LLM fails
        console.log('Intent analysis failed, using mechanical enhancement');
      }
    }
    
    // Fall back to Stage 6 interactive enhancement
    return super.enhance(prompt, context);
  }
  
  private async analyzeIntent(prompt: string): Promise<IntentAnalysis> {
    // Use the second agent ONLY for understanding, not enhancement
    const analysis = await this.intentAgent.analyze(`
      Analyze this prompt and return JSON with:
      - primary_intent: "debug" | "feature" | "refactor" | "test" | "document"
      - entities: array of key nouns/components mentioned
      - missing_context: what information is missing
      - implicit_requirements: what the user probably wants but didn't say
      
      Prompt: "${prompt}"
      
      Respond with JSON only.
    `);
    
    return JSON.parse(analysis);
  }
  
  private async enhanceWithIntent(
    prompt: string, 
    context: Context,
    intent: IntentAnalysis
  ): Promise<EnhancedPrompt> {
    let enhanced = prompt;
    
    // Use intent to select the best template
    const template = this.selectTemplateByIntent(intent.primary_intent);
    if (template) {
      enhanced = template.structure(prompt, context);
    }
    
    // Add entities as explicit context
    if (intent.entities.length > 0) {
      enhanced += `\n\nKey components: ${intent.entities.join(', ')}`;
    }
    
    // Add implicit requirements (but mark them as inferred)
    if (intent.implicit_requirements.length > 0) {
      enhanced += '\n\nInferred requirements (please confirm):';
      intent.implicit_requirements.forEach(req => {
        enhanced += `\n- ${req}`;
      });
    }
    
    // Add missing context as clarification requests
    const clarifications = intent.missing_context.map(missing => ({
      issue: 'missing-context',
      question: missing,
      suggestions: this.generateContextSuggestions(missing, context)
    }));
    
    return {
      enhanced,
      clarificationsNeeded: clarifications,
      confidence: 0.9, // Higher confidence with semantic understanding
      enhancementType: 'llm-assisted',
      intent: intent
    };
  }
  
  configureIntentAgent(agent: LLMAgent) {
    this.intentAgent = agent;
    console.log('Intent recognition enabled with secondary agent');
  }
}

// ============================================================================
// STAGE 8: MULTI-VERSION GENERATION (Advanced)
// ============================================================================

class Stage8_MultiVersionEnhancer extends Stage7_LLMAssistedEnhancer {
  /**
   * Only at this stage do we generate multiple versions
   * Each version optimized for different scenarios
   */
  
  async enhanceMultiple(prompt: string, context: Context): Promise<EnhancedPrompt[]> {
    const versions = [];
    
    // Version 1: Quick and dirty (minimal context)
    versions.push({
      name: 'Quick Fix',
      enhanced: this.generateQuickVersion(prompt, context),
      confidence: 0.7,
      useCase: 'When you need a fast solution and will iterate'
    });
    
    // Version 2: Comprehensive (all context)
    versions.push({
      name: 'Thorough',
      enhanced: await this.enhance(prompt, context),
      confidence: 0.9,
      useCase: 'When you need it done right the first time'
    });
    
    // Version 3: Test-driven (if applicable)
    if (this.couldBenefitFromTDD(prompt)) {
      versions.push({
        name: 'Test-First',
        enhanced: this.generateTDDVersion(prompt, context),
        confidence: 0.85,
        useCase: 'When you want to ensure correctness'
      });
    }
    
    // Version 4: Performance-focused (if applicable)
    if (this.hasPerformanceImplications(prompt)) {
      versions.push({
        name: 'Performance-Optimized',
        enhanced: this.generatePerformanceVersion(prompt, context),
        confidence: 0.8,
        useCase: 'When speed and efficiency matter'
      });
    }
    
    return versions;
  }
  
  private generateQuickVersion(prompt: string, context: Context): string {
    // Minimal enhancement - just the essentials
    return `${prompt}\nFile: ${context.currentFile}\nMake it work, we'll refine later.`;
  }
  
  private generateTDDVersion(prompt: string, context: Context): string {
    const base = super.enhance(prompt, context);
    return `First, write the tests:\n\n${base}\n\nApproach:\n1. Write failing tests\n2. Implement minimal code to pass\n3. Refactor if needed`;
  }
  
  private generatePerformanceVersion(prompt: string, context: Context): string {
    const base = super.enhance(prompt, context);
    return `${base}\n\nPerformance requirements:\n- Optimize for speed over memory\n- Consider caching if applicable\n- Benchmark before and after`;
  }
}

// ============================================================================
// USAGE EVOLUTION EXAMPLE
// ============================================================================

/**
 * This shows how the enhancer evolves from simple to sophisticated
 */

async function demonstrateEvolution() {
  const context = {
    currentFile: 'auth.service.ts',
    recentErrors: ['TypeError: Cannot read property user of undefined'],
    testFailures: ['auth.test.ts: login should return user'],
    patterns: ['Repository', 'Result<T,E>'],
    lastNoun: 'authentication service',
    targetAgent: 'claude'
  };
  
  const prompt = "Fix it so that works properly";
  
  console.log("=== ORIGINAL PROMPT ===");
  console.log(prompt);
  
  // Stage 1: Just context
  const stage1 = new Stage1_PureContextInjector();
  console.log("\n=== STAGE 1: Pure Context ===");
  console.log(stage1.enhance(prompt, context));
  
  // Stage 2: Pattern expansion
  const stage2 = new Stage2_PatternExpander();
  console.log("\n=== STAGE 2: Pattern Expansion ===");
  console.log(stage2.enhance(prompt, context));
  
  // Stage 3: Structural templates
  const stage3 = new Stage3_StructuredEnhancer();
  console.log("\n=== STAGE 3: Structured ===");
  console.log(stage3.enhance(prompt, context));
  
  // Stage 4: Learning from success
  const stage4 = new Stage4_LearningEnhancer();
  console.log("\n=== STAGE 4: Learning ===");
  console.log(stage4.enhance(prompt, context));
  
  // Stage 5: Agent optimization
  const stage5 = new Stage5_AgentOptimizedEnhancer();
  console.log("\n=== STAGE 5: Agent Optimized ===");
  console.log(stage5.enhance(prompt, context));
  
  // Stage 6: Interactive
  const stage6 = new Stage6_InteractiveEnhancer();
  console.log("\n=== STAGE 6: Interactive ===");
  const result = await stage6.enhance(prompt, context);
  console.log(result.enhanced);
  if (result.clarificationsNeeded.length > 0) {
    console.log("Clarifications needed:", result.clarificationsNeeded);
  }
  
  // Stage 7: LLM-assisted (if available)
  const stage7 = new Stage7_LLMAssistedEnhancer();
  // stage7.configureIntentAgent(secondaryAgent); // If user provides one
  console.log("\n=== STAGE 7: LLM-Assisted ===");
  console.log("(Would use intent recognition if secondary agent available)");
  
  // Stage 8: Multiple versions
  const stage8 = new Stage8_MultiVersionEnhancer();
  console.log("\n=== STAGE 8: Multiple Versions ===");
  const versions = await stage8.enhanceMultiple(prompt, context);
  versions.forEach(v => {
    console.log(`\n${v.name} (${v.useCase}):`);
    console.log(v.enhanced);
  });
}

// ============================================================================
// CONFIGURATION AND PROGRESSIVE ENHANCEMENT
// ============================================================================

class PromptEnhancerFactory {
  /**
   * Create the appropriate enhancer based on available capabilities
   */
  
  static create(config: EnhancerConfig): PromptEnhancer {
    // Start with the highest capability we can support
    
    if (config.secondaryLLM) {
      const enhancer = new Stage7_LLMAssistedEnhancer();
      enhancer.configureIntentAgent(config.secondaryLLM);
      return enhancer;
    }
    
    if (config.enableInteractive) {
      return new Stage6_InteractiveEnhancer();
    }
    
    if (config.targetAgent) {
      return new Stage5_AgentOptimizedEnhancer();
    }
    
    if (config.enableLearning) {
      return new Stage4_LearningEnhancer();
    }
    
    if (config.useTemplates) {
      return new Stage3_StructuredEnhancer();
    }
    
    if (config.expandPatterns) {
      return new Stage2_PatternExpander();
    }
    
    // Minimum viable enhancer
    return new Stage1_PureContextInjector();
  }
}

/**
 * PHILOSOPHY OF THIS APPROACH:
 * 
 * 1. HONESTY: Each stage does exactly what it claims, no pretense
 * 2. PROGRESSIVE: Each stage builds on the previous, adding real capability
 * 3. FALLBACK: If advanced features fail, we gracefully degrade
 * 4. MEASURABLE: We can test each stage's effectiveness independently
 * 5. OPTIONAL LLM: Stages 1-6 work without any LLM, Stage 7 uses one if available
 * 
 * This is a pragmatic path from "dumb but useful" to "intelligent assistance"
 * without the current design's pretense of intelligence it doesn't have.
 */