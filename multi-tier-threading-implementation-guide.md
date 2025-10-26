# Multi-Tier Threading System Implementation Guide
## Enhancing the Current Level 4 System with Progressive Maturity Support

### Executive Summary

This guide instructs the coding agent to enhance the existing Level 4 threading system to support multiple maturity levels (0-4), enabling teams to adopt threading progressively. The system must be resilient to inconsistent agent implementations and provide value at every level.

### Core Principle: Working WITH Agents

The threading system assumes coding agents are partners with varying reliability. We design for:
- **Partial compliance**: Value even if only 60% of instructions are followed
- **Pattern recognition**: Detect what was actually implemented vs. instructed  
- **Graceful degradation**: Extract maximum value from whatever exists
- **Progressive enhancement**: Build on what works, ignore what doesn't

---

## Architecture Enhancement Requirements

### 1. Maturity Level Detection System

Implement automatic detection that determines what level of threading is actually present (not what was requested):

```typescript
// src/threading/detection/MaturityDetector.ts
export class MaturityDetector {
  /**
   * Detect actual implementation level by scanning codebase
   * This is resilient to partial/inconsistent implementations
   */
  async detectActualLevel(workspacePath: string): Promise<DetectionResult> {
    const indicators = {
      level4: await this.findDecorators(workspacePath),
      level3: await this.findThreadContext(workspacePath),
      level2: await this.findJSDocThreads(workspacePath),
      level1: await this.findSemanticLogs(workspacePath),
      level0: await this.findAnyLogs(workspacePath)
    };
    
    // Return HIGHEST consistently implemented level
    // Not highest attempted - highest WORKING
    return {
      detectedLevel: this.determineConsistentLevel(indicators),
      coverage: this.calculateCoverage(indicators),
      inconsistencies: this.findInconsistencies(indicators),
      recommendations: this.generateRecommendations(indicators)
    };
  }
  
  private async findDecorators(path: string): Promise<ImplementationIndicator> {
    // Look for @ThreadSpec, @ThreadLog
    // Count occurrences, check for imports
    // Verify reflect-metadata is installed
    // Return confidence score 0-1
  }
  
  private async findSemanticLogs(path: string): Promise<ImplementationIndicator> {
    // Search for [THREAD:*] patterns in:
    // - console.* calls
    // - logger.* calls  
    // - Custom logging functions
    // Be flexible - agents might use [Thread:], [THREAD=], etc.
    const patterns = [
      /\[THREAD:\w+\]/gi,
      /\[Thread:\w+\]/gi,
      /\{thread:\s*['"`]\w+['"`]/gi,
      /\.thread\s*=\s*['"`]\w+['"`]/gi
    ];
    
    // Return percentage of log statements with thread indicators
  }
  
  private determineConsistentLevel(indicators: Indicators): MaturityLevel {
    // If >70% of files have Level 4 indicators, return Level 4
    // If <30% have Level 4 but >70% have Level 3, return Level 3
    // Etc.
    // This handles partial implementations gracefully
  }
}
```

### 2. Resilient Log Parsing System

Enhance the analyzer to handle inconsistent implementations:

```typescript
// src/threading/analysis/ResilientAnalyzer.ts
export class ResilientAnalyzer {
  /**
   * Parse logs regardless of format inconsistencies
   */
  async analyze(logPath: string, detectedLevel: MaturityLevel): Promise<Analysis> {
    const parsers = [
      new StrictParser(),      // Try strict format first
      new FlexibleParser(),    // Try flexible patterns
      new InferenceParser()    // Fall back to inference
    ];
    
    let results = [];
    for (const parser of parsers) {
      try {
        const parsed = await parser.parse(logPath);
        if (parsed.confidence > 0.5) {
          results.push(parsed);
        }
      } catch (e) {
        // Parser failed, try next
        continue;
      }
    }
    
    // Merge results from multiple parsers
    return this.mergeResults(results);
  }
}

// Flexible parser that handles agent variations
class FlexibleParser {
  parse(content: string): ParseResult {
    // Handle various agent interpretations:
    // - [THREAD:DATA_FLOW] (correct)
    // - [Thread: DATA_FLOW] (spacing variation)
    // - Thread=DATA_FLOW (format variation)
    // - @thread DATA_FLOW (in logs instead of JSDoc)
    // - dataflow thread (natural language)
    
    const threads = new Set<string>();
    const patterns = this.getAllPossiblePatterns();
    
    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const thread = this.normalizeThreadName(match[1]);
        threads.add(thread);
      }
    }
    
    return {
      threads: Array.from(threads),
      confidence: this.calculateConfidence(threads, content)
    };
  }
  
  private normalizeThreadName(raw: string): string {
    // DATA_FLOW, DataFlow, data-flow, data flow -> DATA_FLOW
    return raw
      .toUpperCase()
      .replace(/[\s-]/g, '_')
      .replace(/[^A-Z_]/g, '');
  }
}
```

### 3. Level-Specific Template System

Create templates that are resilient to partial implementation:

```typescript
// src/threading/templates/LevelTemplates.ts
export class LevelTemplateProvider {
  /**
   * Provide templates with fallback strategies
   */
  getTemplateForLevel(level: MaturityLevel): Template {
    const templates = {
      0: this.getObservationTemplate(),
      1: this.getSemanticTemplate(),
      2: this.getAnnotationTemplate(),
      3: this.getConditionalTemplate(),
      4: this.getDecoratorTemplate()
    };
    
    // Include fallback instructions
    const template = templates[level];
    template.fallbackInstructions = this.getFallbackInstructions(level);
    template.validationRules = this.getValidationRules(level);
    
    return template;
  }
  
  private getSemanticTemplate(): Template {
    return {
      id: 'level-1-semantic',
      name: 'Semantic Logging Pattern',
      instructions: `
        PRIMARY APPROACH:
        Add [THREAD:X] prefix to existing log statements.
        
        EXAMPLES:
        // For console.log
        console.log('[THREAD:DATA_FLOW] Fetching user');
        
        // For custom logger
        logger.info('[THREAD:CACHE] Cache miss', { key });
        
        // For structured logging
        log({ thread: 'VALIDATION', message: 'Validating input' });
        
        ACCEPTABLE VARIATIONS (we will parse these):
        - [Thread:DATA_FLOW] (mixed case)
        - [THREAD=DATA_FLOW] (equals sign)
        - {thread: "DATA_FLOW"} (object property)
        - @thread DATA_FLOW (annotation style)
        
        THREAD NAMES TO USE:
        - DATA_FLOW: Any data fetching, processing, transformation
        - CACHE: Cache operations (get, set, invalidate)
        - VALIDATION: Input/output validation
        - ERROR_RECOVERY: Error handling and recovery
        - AGENT_BRAIN: AI/ML operations
        
        IF UNCERTAIN:
        - Use your best guess for thread name
        - Consistency within a function is more important than perfect naming
        - We will normalize variations (DataFlow, data_flow, data-flow all become DATA_FLOW)
      `,
      validationRules: {
        required: ['At least one [THREAD:*] pattern per file with logging'],
        optional: ['Consistent thread names within same function'],
        ignored: ['Case sensitivity', 'Exact format']
      }
    };
  }
  
  private getFallbackInstructions(level: MaturityLevel): string {
    return `
      IF PRIMARY APPROACH FAILS:
      - Level 1: Just add any thread indicator to logs
      - Level 2: Add thread info as regular comments if JSDoc fails
      - Level 3: Fall back to Level 1 if ThreadContext is too complex
      - Level 4: Fall back to Level 2 if decorators won't compile
      
      PARTIAL IMPLEMENTATION IS ACCEPTABLE:
      - Implement in new code, skip complex legacy code
      - Focus on public methods, skip private utilities
      - Prioritize hot paths and problem areas
    `;
  }
}
```

### 4. Progressive Control Center UI

Implement UI that adapts to detected (not configured) level:

```typescript
// src/threading/ui/AdaptiveControlCenter.ts
export class AdaptiveControlCenter {
  private detectedLevel: MaturityLevel;
  private configuredLevel: MaturityLevel;
  private coverage: CoverageReport;
  
  async initialize(): Promise<void> {
    // Detect what's actually implemented
    const detection = await this.detector.detectActualLevel();
    this.detectedLevel = detection.detectedLevel;
    
    // Load what user wants
    this.configuredLevel = this.config.get('threading.targetLevel');
    
    // Show appropriate UI
    this.render();
  }
  
  render(): void {
    if (this.detectedLevel < this.configuredLevel) {
      this.showUpgradeGuidance();
    } else if (this.detectedLevel > this.configuredLevel) {
      this.showDowngradeOption();
    } else {
      this.showCurrentLevelControls();
    }
  }
  
  private showUpgradeGuidance(): void {
    const message = `
      Threading Level Mismatch:
      - Configured: Level ${this.configuredLevel}
      - Detected: Level ${this.detectedLevel}
      - Coverage: ${this.coverage.percentage}%
      
      Would you like to:
      1. Upgrade implementation to Level ${this.configuredLevel}
      2. Use Level ${this.detectedLevel} features only
      3. View upgrade guide
    `;
    
    vscode.window.showInformationMessage(message, 
      'Upgrade', 'Use Detected', 'View Guide'
    ).then(choice => {
      if (choice === 'Upgrade') {
        this.initiateUpgrade();
      } else if (choice === 'View Guide') {
        this.showUpgradeGuide();
      }
    });
  }
  
  private showCurrentLevelControls(): void {
    // Adapt controls to what actually exists
    const controls = {
      0: this.getObservationControls(),    // Just on/off
      1: this.getSemanticControls(),       // Thread filter
      2: this.getAnnotationControls(),     // Static analysis options
      3: this.getConditionalControls(),    // Runtime enable/disable
      4: this.getFullControls()            // Complete system
    };
    
    this.statusBar.text = this.getStatusText();
    this.statusBar.command = controls[this.detectedLevel].command;
  }
}
```

### 5. Instruction Injection System

Implement robust instruction system for coding agents:

```typescript
// src/threading/instructions/AgentInstructionInjector.ts
export class AgentInstructionInjector {
  /**
   * Inject level-appropriate instructions into agent context
   */
  async injectInstructions(level: MaturityLevel): Promise<void> {
    const instructions = this.getInstructionsForLevel(level);
    
    // Multiple injection points for reliability
    await this.injectViaComments(instructions);
    await this.injectViaConfig(instructions);
    await this.injectViaContext(instructions);
    await this.injectViaTemplates(instructions);
  }
  
  private async injectViaComments(instructions: Instructions): Promise<void> {
    // Add instructions as comments in key files
    const entryPoints = await this.findEntryPoints();
    
    for (const file of entryPoints) {
      const header = `
/**
 * THREADING INSTRUCTIONS FOR CODING AGENT:
 * ${instructions.summary}
 * 
 * @threading-level ${instructions.level}
 * @threading-pattern ${instructions.pattern}
 * @threading-example ${instructions.example}
 */
`;
      await this.prependToFile(file, header);
    }
  }
  
  private async injectViaConfig(instructions: Instructions): Promise<void> {
    // Add to .vscode/settings.json
    const settings = {
      "threading.agent.level": instructions.level,
      "threading.agent.instructions": instructions.full,
      "threading.agent.examples": instructions.examples,
      "threading.agent.validation": instructions.validation
    };
    
    await this.updateVSCodeSettings(settings);
  }
  
  private getInstructionsForLevel(level: number): Instructions {
    const base = {
      level,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    };
    
    const levelSpecific = {
      0: {
        summary: 'No code changes needed - observation only',
        pattern: 'none',
        example: 'Continue using existing logging',
        full: 'The system will observe your existing logs. No threading implementation required.',
        validation: 'Any logging present'
      },
      1: {
        summary: 'Add [THREAD:NAME] prefixes to log messages',
        pattern: '[THREAD:${threadName}] ${originalMessage}',
        example: 'logger.info("[THREAD:DATA_FLOW] Fetching user " + userId)',
        full: this.getLevel1FullInstructions(),
        validation: 'At least 50% of logs have thread prefixes'
      },
      2: {
        summary: 'Add @thread JSDoc annotations to functions',
        pattern: '/** @thread THREAD_NAME */',
        example: this.getLevel2Example(),
        full: this.getLevel2FullInstructions(),
        validation: 'Public methods have @thread annotations'
      },
      3: {
        summary: 'Implement ThreadContext pattern',
        pattern: 'ThreadContext.enter(thread, context)',
        example: this.getLevel3Example(),
        full: this.getLevel3FullInstructions(),
        validation: 'ThreadContext used in main flows'
      },
      4: {
        summary: 'Implement full decorator pattern',
        pattern: '@ThreadSpec/@ThreadLog decorators',
        example: this.getLevel4Example(),
        full: this.getLevel4FullInstructions(),
        validation: 'Decorators on key services'
      }
    };
    
    return { ...base, ...levelSpecific[level] };
  }
  
  private getLevel1FullInstructions(): string {
    return `
LEVEL 1: SEMANTIC LOGGING IMPLEMENTATION

OBJECTIVE:
Add thread identification to existing log statements without changing application behavior.

APPROACH:
1. Identify existing log statements (console.*, logger.*, winston.*, etc.)
2. Add [THREAD:NAME] prefix to message
3. Preserve original functionality

THREAD IDENTIFICATION RULES:
- DATA_FLOW: Database queries, API calls, data transformation
- CACHE: Redis, memory cache, localStorage, sessionStorage
- VALIDATION: Input validation, schema validation, assertions
- ERROR_RECOVERY: try/catch blocks, error handlers, fallbacks
- AGENT_BRAIN: AI/ML operations, embeddings, completions

EXAMPLES:

// Original:
console.log('Fetching user from database');

// Modified (any of these are acceptable):
console.log('[THREAD:DATA_FLOW] Fetching user from database');
console.log('[Thread:DataFlow] Fetching user from database');  // We handle case
console.log({thread: 'DATA_FLOW', msg: 'Fetching user from database'}); // Structured

// Original:
logger.error('Cache connection failed', error);

// Modified:
logger.error('[THREAD:CACHE] Cache connection failed', error);

PARTIAL IMPLEMENTATION:
- Start with public methods
- Skip test files
- Skip node_modules
- Focus on business logic

VALIDATION:
Success if >50% of log statements have thread indicators.

FALLBACK:
If string prefixing is problematic, use structured logging:
log.info({thread: 'DATA_FLOW', ...originalLogObject})
    `;
  }
}
```

### 6. Testing Framework for Multi-Level System

Implement tests that validate each level works with partial compliance:

```typescript
// src/threading/tests/MultiLevelValidation.test.ts
describe('Multi-Level Threading Validation', () => {
  describe('Level 1: Semantic Logging', () => {
    it('should detect threads with various formats', () => {
      const logs = [
        '[THREAD:DATA_FLOW] message',      // Correct
        '[Thread: DATA_FLOW] message',     // Space variation
        '[thread=DATA_FLOW] message',      // Format variation
        'Thread: DATA_FLOW - message',     // Natural language
        '{"thread":"DATA_FLOW","msg":"x"}' // Structured
      ];
      
      const analyzer = new FlexibleParser();
      const result = analyzer.parse(logs.join('\n'));
      
      expect(result.threads).toContain('DATA_FLOW');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
    
    it('should work with 60% compliance', () => {
      const logs = [
        '[THREAD:DATA_FLOW] message1',
        'message2',  // Missing thread
        '[THREAD:CACHE] message3',
        'message4',  // Missing thread  
        '[THREAD:DATA_FLOW] message5',
        'message6'   // Missing thread - 50% compliance
      ];
      
      const analyzer = new ResilientAnalyzer();
      const result = analyzer.analyze(logs);
      
      expect(result.detectedLevel).toBe(MaturityLevel.SEMANTIC);
      expect(result.coverage).toBeCloseTo(0.5, 1);
      expect(result.isUsable).toBe(true);
    });
    
    it('should normalize thread name variations', () => {
      const variations = [
        'DATA_FLOW',
        'data_flow', 
        'DataFlow',
        'data-flow',
        'Data Flow',
        'DATAFLOW'
      ];
      
      const normalizer = new ThreadNormalizer();
      const normalized = variations.map(v => normalizer.normalize(v));
      
      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('DATA_FLOW');
    });
  });
  
  describe('Level Detection', () => {
    it('should detect mixed implementation levels', () => {
      const workspace = {
        'serviceA.ts': 'uses @ThreadSpec decorators',      // Level 4
        'serviceB.ts': 'uses ThreadContext',               // Level 3
        'serviceC.ts': 'uses /** @thread */ comments',     // Level 2
        'serviceD.ts': 'uses [THREAD:X] in logs',         // Level 1
        'serviceE.ts': 'uses console.log only'            // Level 0
      };
      
      const detector = new MaturityDetector();
      const result = detector.detectActualLevel(workspace);
      
      expect(result.detectedLevel).toBe(1); // Lowest consistent level
      expect(result.coverage.byLevel).toEqual({
        0: 1.0,  // 100% have basic logging
        1: 0.8,  // 80% have semantic
        2: 0.6,  // 60% have annotations
        3: 0.4,  // 40% have conditional
        4: 0.2   // 20% have decorators
      });
      expect(result.recommendation).toBe('Standardize on Level 1 first');
    });
  });
});
```

### 7. Migration and Rollback System

Implement safe migration between levels:

```typescript
// src/threading/migration/LevelMigrationManager.ts
export class LevelMigrationManager {
  /**
   * Safely migrate between levels with rollback capability
   */
  async migrate(
    fromLevel: MaturityLevel,
    toLevel: MaturityLevel
  ): Promise<MigrationResult> {
    // Create backup
    const backup = await this.createBackup();
    
    try {
      if (toLevel > fromLevel) {
        return await this.upgradeLevel(fromLevel, toLevel, backup);
      } else {
        return await this.downgradeLevel(fromLevel, toLevel, backup);
      }
    } catch (error) {
      await this.rollback(backup);
      throw new MigrationError('Migration failed, rolled back', error);
    }
  }
  
  private async upgradeLevel(
    from: MaturityLevel,
    to: MaturityLevel,
    backup: Backup
  ): Promise<MigrationResult> {
    const steps = this.getUpgradeSteps(from, to);
    const results = [];
    
    for (const step of steps) {
      try {
        const result = await this.executeStep(step);
        results.push(result);
        
        // Validate after each step
        const validation = await this.validateStep(step, result);
        if (validation.coverage < 0.5) {
          // Partial success - ask user
          const choice = await this.askUserAboutPartialSuccess(validation);
          if (choice === 'rollback') {
            await this.rollback(backup);
            return { success: false, rolled: true };
          }
        }
      } catch (error) {
        // Step failed - try fallback
        const fallback = await this.tryFallback(step, error);
        if (fallback.success) {
          results.push(fallback);
        } else {
          // Cannot proceed
          break;
        }
      }
    }
    
    return {
      success: true,
      fromLevel: from,
      toLevel: to,
      results,
      backup
    };
  }
}
```

### 8. Configuration Schema Updates

Update configuration to support multi-level system:

```typescript
// src/threading/config/threading.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "threading": {
      "type": "object",
      "properties": {
        "targetLevel": {
          "type": "integer",
          "minimum": 0,
          "maximum": 4,
          "description": "Desired maturity level"
        },
        "detectionMode": {
          "type": "string",
          "enum": ["automatic", "manual", "hybrid"],
          "default": "automatic",
          "description": "How to detect current level"
        },
        "enforcement": {
          "type": "object",
          "properties": {
            "strict": {
              "type": "boolean",
              "default": false,
              "description": "Require full compliance"
            },
            "minimumCoverage": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "default": 0.5,
              "description": "Minimum coverage to consider level active"
            }
          }
        },
        "resilience": {
          "type": "object",
          "properties": {
            "handleVariations": {
              "type": "boolean",
              "default": true,
              "description": "Parse format variations"
            },
            "normalizeNames": {
              "type": "boolean", 
              "default": true,
              "description": "Normalize thread name variations"
            },
            "inferMissing": {
              "type": "boolean",
              "default": true,
              "description": "Infer threads when not specified"
            }
          }
        },
        "levels": {
          "type": "object",
          "properties": {
            "0": { "$ref": "#/definitions/levelConfig" },
            "1": { "$ref": "#/definitions/levelConfig" },
            "2": { "$ref": "#/definitions/levelConfig" },
            "3": { "$ref": "#/definitions/levelConfig" },
            "4": { "$ref": "#/definitions/levelConfig" }
          }
        }
      }
    }
  },
  "definitions": {
    "levelConfig": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "autoUpgrade": { "type": "boolean" },
        "template": { "type": "string" },
        "validation": { "type": "object" }
      }
    }
  }
}
```

### 9. Agent Communication Protocol

Implement robust communication with coding agents:

```typescript
// src/threading/agent/AgentCommunicator.ts
export class AgentCommunicator {
  /**
   * Communicate threading requirements to coding agents
   * with multiple channels for reliability
   */
  async communicateRequirements(level: MaturityLevel): Promise<void> {
    // 1. File-based communication
    await this.writeRequirementsFile(level);
    
    // 2. Comment-based communication  
    await this.addInlineComments(level);
    
    // 3. Configuration-based communication
    await this.updateProjectConfig(level);
    
    // 4. Interactive communication (if available)
    if (this.isAgentInteractive()) {
      await this.sendDirectMessage(level);
    }
  }
  
  private async writeRequirementsFile(level: MaturityLevel): Promise<void> {
    const requirements = {
      version: '2.0.0',
      level,
      timestamp: new Date().toISOString(),
      instructions: this.getInstructions(level),
      examples: this.getExamples(level),
      validation: this.getValidation(level),
      fallbacks: this.getFallbacks(level)
    };
    
    await fs.writeFile(
      '.threading/AGENT_REQUIREMENTS.md',
      this.formatAsMarkdown(requirements)
    );
  }
  
  private formatAsMarkdown(req: Requirements): string {
    return `# Threading Requirements for Coding Agent

## Current Level: ${req.level}

## Instructions
${req.instructions}

## Examples
${req.examples.map(e => '```typescript\n' + e + '\n```').join('\n')}

## Validation Rules
${req.validation.map(v => '- ' + v).join('\n')}

## Acceptable Fallbacks
${req.fallbacks.map(f => '- ' + f).join('\n')}

## Important Notes
- Partial implementation is acceptable
- Focus on consistency within files
- Prioritize public methods
- Skip test files
- Use fallbacks if primary approach fails
`;
  }
}
```

### 10. Monitoring and Reporting

Implement comprehensive monitoring for multi-level system:

```typescript
// src/threading/monitoring/LevelMonitor.ts
export class LevelMonitor {
  /**
   * Monitor threading implementation health across all levels
   */
  async generateHealthReport(): Promise<HealthReport> {
    const report = {
      timestamp: new Date().toISOString(),
      configuredLevel: this.config.targetLevel,
      detectedLevel: await this.detector.detectActualLevel(),
      coverage: await this.calculateCoverage(),
      consistency: await this.checkConsistency(),
      issues: await this.detectIssues(),
      recommendations: []
    };
    
    // Add level-specific analysis
    report.levelAnalysis = await this.analyzeLevelImplementation(report.detectedLevel);
    
    // Generate recommendations
    if (report.coverage.overall < 0.5) {
      report.recommendations.push({
        priority: 'high',
        action: 'Increase threading coverage',
        details: `Current coverage ${report.coverage.overall * 100}% is below minimum 50%`
      });
    }
    
    if (report.detectedLevel < report.configuredLevel) {
      report.recommendations.push({
        priority: 'medium',
        action: 'Upgrade implementation',
        details: `System configured for Level ${report.configuredLevel} but only Level ${report.detectedLevel} detected`
      });
    }
    
    return report;
  }
  
  async checkConsistency(): Promise<ConsistencyReport> {
    const files = await this.getAllSourceFiles();
    const results = new Map<string, FileConsistency>();
    
    for (const file of files) {
      const consistency = await this.checkFileConsistency(file);
      results.set(file, consistency);
    }
    
    return {
      overallScore: this.calculateOverallConsistency(results),
      byFile: results,
      issues: this.findConsistencyIssues(results)
    };
  }
}
```

## Implementation Priority Order

1. **Phase 1: Detection & Analysis** (Week 1)
   - Implement MaturityDetector
   - Implement ResilientAnalyzer
   - Add FlexibleParser for variations

2. **Phase 2: UI & Control** (Week 2)
   - Implement AdaptiveControlCenter
   - Add level selector UI
   - Create status bar integration

3. **Phase 3: Templates & Instructions** (Week 3)
   - Create level-specific templates
   - Implement AgentInstructionInjector
   - Add validation rules per level

4. **Phase 4: Migration & Monitoring** (Week 4)
   - Implement LevelMigrationManager
   - Add monitoring and reporting
   - Create health dashboard

## Critical Success Factors

1. **Resilience Over Perfection**: Accept 60% compliance as success
2. **Detection Over Configuration**: Trust what exists, not what's configured
3. **Progressive Over Revolutionary**: Support gradual adoption
4. **Guidance Over Enforcement**: Help agents succeed, don't punish failure
5. **Value at Every Level**: Each level must provide immediate value

## Testing Requirements

Create comprehensive tests that validate:
1. Each level works with partial implementation
2. Detection correctly identifies mixed implementations
3. Parsers handle all reasonable variations
4. Migration preserves functionality
5. Rollback always succeeds

This implementation will create a robust multi-tier threading system that works WITH coding agents of varying reliability while providing value at every maturity level.