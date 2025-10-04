/**
 * Agent Brain Core Engine
 * Main orchestrator for pattern matching, analysis, and learning
 */

import { Pattern, PatternMatch, AnalysisContext, AnalysisResult, PatternMatcher, LearningSystem, ASTAnalyzer } from '../api/types';
import { createPatternSystem } from '../patterns/index';

export interface AgentBrainCoreConfig {
    enableLearning?: boolean;
    patterns?: Pattern[];
    debug?: boolean;
}

export class AgentBrainCore {
    public readonly patternMatcher: PatternMatcher;
    public readonly learningSystem: LearningSystem;
    public readonly astAnalyzer: ASTAnalyzer;

    private config: AgentBrainCoreConfig;
    private patterns: Map<string, Pattern> = new Map();

    constructor(config: AgentBrainCoreConfig = {}) {
        this.config = {
            enableLearning: true,
            patterns: [],
            debug: false,
            ...config
        };

        // Initialize core services
        this.patternMatcher = new SimplePatternMatcher();
        this.learningSystem = new SimpleLearningSystem();
        this.astAnalyzer = new SimpleASTAnalyzer();

        // Load default patterns from PatternSystem
        const patternSystem = createPatternSystem({ enableValidation: true });
        const defaultPatterns = patternSystem.getPatterns();

        // Convert EnginePatterns to runtime Patterns
        defaultPatterns.forEach(enginePattern => {
            const runtimePattern: Pattern = {
                id: enginePattern.id,
                name: enginePattern.name,
                category: enginePattern.category,
                description: enginePattern.description,
                trigger: enginePattern.trigger,
                message: enginePattern.message,
                severity: enginePattern.severity === 'suggestion' ? 'info' : enginePattern.severity as 'error' | 'warning' | 'info',
                source: enginePattern.metadata?.source || 'default'
            };
            this.addPattern(runtimePattern);
        });

        // Load additional patterns from config
        if (this.config.patterns) {
            this.config.patterns.forEach(pattern => {
                this.addPattern(pattern);
            });
        }
    }

    /**
     * Analyze a document for patterns and issues
     */
    async analyzeDocument(code: string, context: AnalysisContext): Promise<AnalysisResult> {
        const patterns = Array.from(this.patterns.values());
        const matches = this.patternMatcher.match(code, patterns);

        // TODO: Add AST analysis
        // const ast = await this.astAnalyzer.parse(code, context.language);
        // const astResults = await this.astAnalyzer.analyze(ast, patterns);

        const result: AnalysisResult = {
            patterns: matches,
            interventions: [],
            learnings: []
        };

        // Learn from the analysis if enabled
        if (this.config.enableLearning && matches.length > 0) {
            for (const match of matches) {
                await this.learningSystem.learn({
                    type: 'pattern-match',
                    data: { pattern: match.pattern, context },
                    timestamp: new Date(),
                    source: 'agent-brain-core'
                });
            }
        }

        return result;
    }

    /**
     * Get suggestions for the current context
     */
    async getSuggestions(code: string, context: any): Promise<any[]> {
        // Basic implementation - can be extended by extensions
        return [];
    }

    /**
     * Get hover information for a symbol
     */
    async getHoverInfo(symbol: string, context: any): Promise<any> {
        // Basic implementation - can be extended by extensions
        return null;
    }

    /**
     * Add a pattern to the engine
     */
    addPattern(pattern: Pattern): void {
        this.patterns.set(pattern.id, pattern);
        this.patternMatcher.addPattern(pattern);
    }

    /**
     * Remove a pattern from the engine
     */
    removePattern(patternId: string): void {
        this.patterns.delete(patternId);
        this.patternMatcher.removePattern(patternId);
    }

    /**
     * Get all registered patterns
     */
    getPatterns(): Pattern[] {
        return Array.from(this.patterns.values());
    }
}

/**
 * Simple pattern matcher implementation
 */
class SimplePatternMatcher implements PatternMatcher {
    private patterns: Map<string, Pattern> = new Map();

    match(code: string, patterns: Pattern[]): PatternMatch[] {
        const matches: PatternMatch[] = [];

        for (const pattern of patterns) {
            const regex = typeof pattern.trigger === 'string'
                ? new RegExp(pattern.trigger, 'g')
                : pattern.trigger;

            let match;
            while ((match = regex.exec(code)) !== null) {
                const linesBefore = code.substring(0, match.index).split('\n');
                const line = linesBefore.length;
                const column = linesBefore[linesBefore.length - 1].length;

                matches.push({
                    pattern,
                    location: {
                        file: 'current',
                        line,
                        column,
                        endLine: line,
                        endColumn: column + match[0].length
                    },
                    confidence: 0.8,
                    context: this.extractContext(code, match.index, 50)
                });

                // Prevent infinite loops
                if (regex.global === false) break;
            }
        }

        return matches;
    }

    addPattern(pattern: Pattern): void {
        this.patterns.set(pattern.id, pattern);
    }

    removePattern(patternId: string): void {
        this.patterns.delete(patternId);
    }

    private extractContext(code: string, index: number, length: number): string {
        const start = Math.max(0, index - length);
        const end = Math.min(code.length, index + length);
        return code.substring(start, end);
    }
}

/**
 * Simple learning system implementation
 */
class SimpleLearningSystem implements LearningSystem {
    private learnings: any[] = [];

    async learn(learning: any): Promise<void> {
        this.learnings.push(learning);
        // In a real implementation, this would persist to storage
    }

    async getLearnings(filter?: any): Promise<any[]> {
        return filter ? this.learnings.filter(filter) : this.learnings;
    }

    async suggest(context: any): Promise<any[]> {
        // Basic suggestion based on past learnings
        return [];
    }
}

/**
 * Simple AST analyzer implementation
 */
class SimpleASTAnalyzer implements ASTAnalyzer {
    async parse(code: string, language: string): Promise<any> {
        // Placeholder implementation
        // In a real system, this would use language-specific parsers
        return { type: 'placeholder', language, code };
    }

    async analyze(ast: any, patterns: Pattern[]): Promise<AnalysisResult> {
        // Placeholder implementation
        return {
            patterns: [],
            interventions: [],
            learnings: []
        };
    }
}