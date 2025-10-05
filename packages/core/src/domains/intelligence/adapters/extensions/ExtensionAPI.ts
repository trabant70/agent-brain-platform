/**
 * Agent Brain Extension API
 * Allows teams to extend Agent Brain with custom patterns and rules
 */

// Import shared types from types module
import type {
    RuntimePattern, Intent, InterventionStrategy, Learning, Command, Configuration, Logger,
    PatternMatcher, LearningSystem, ASTAnalyzer, PatternMatch, Intervention, AnalysisContext, AnalysisResult
} from '../base/RuntimeTypes';

export interface AgentBrainExtension {
    name: string;
    version: string;

    /**
     * Initialize extension with context
     */
    initialize?(context: ExtensionContext): Promise<void>;

    /**
     * Register custom patterns
     */
    patterns?(): RuntimePattern[] | Promise<RuntimePattern[]>;

    /**
     * Register custom analyzers
     */
    analyzers?(): Analyzer[] | Promise<Analyzer[]>;

    /**
     * Hook into analysis pipeline
     */
    beforeAnalysis?(code: string, context: AnalysisContext): Promise<void>;
    afterAnalysis?(results: AnalysisResult): Promise<AnalysisResult>;

    /**
     * Custom intervention strategies
     */
    interventionStrategy?(intent: Intent): InterventionStrategy | null;

    /**
     * Learning hooks
     */
    onLearn?(learning: Learning): Promise<void>;

    /**
     * Custom commands
     */
    commands?(): Command[];
}

export interface ExtensionContext {
    workspaceRoot: string;
    configuration: Configuration;
    storage: ExtensionStorage;
    logger: Logger;

    // Core services available to extensions
    patternMatcher: PatternMatcher;
    learningSystem: LearningSystem;
    astAnalyzer: ASTAnalyzer;
}

export interface ExtensionStorage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
}

export interface Analyzer {
    name: string;
    analyze(code: string, context: any): any;
}

export abstract class BaseExtension implements AgentBrainExtension {
    constructor(
        public name: string,
        public version: string
    ) {}

    // Helper methods for common tasks
    protected async loadPatternsFromFile(filePath: string): Promise<RuntimePattern[]> {
        const fs = require('fs-extra');
        const yaml = require('js-yaml');

        if (filePath?.endsWith('.yaml') || filePath?.endsWith('.yml')) {
            const content = await fs?.readFile(filePath, 'utf8');
            return yaml?.load(content).patterns || [];
        } else if (filePath?.endsWith('.json')) {
            return require(filePath).patterns || [];
        }

        throw new Error(`Unsupported pattern file format: ${filePath}`);
    }

    protected createPattern(config: Partial<RuntimePattern>): RuntimePattern {
        return {
            severity: 'warning',
            source: this?.name,
            ...config
        } as RuntimePattern;
    }
}
