/**
 * FramingTemplates - Context-specific content presentation
 *
 * Provides instructional framing and learning prompts based on
 * the user's current maturity quadrant. Each quadrant has a unique
 * framing that adapts the tone and focus of injected knowledge.
 */

import {
  OperatorMaturity,
  ProjectMaturity,
  DomainComplexity,
  QuadrantMapping
} from './types';

/**
 * Framing template for a specific context
 * Defines how knowledge should be presented
 */
export interface FramingTemplate {
  /** Prefix emoji and verb (e.g., "📚 Learn:", "⚡ Build:") */
  prefix: string;

  /** Instructional tone (e.g., "instructional", "action-oriented") */
  tone: string;

  /** Learning prompt for this context */
  learningPrompt: string;
}

/**
 * FramingTemplates - Static mappings for context-specific framing
 */
export class FramingTemplates {

  /**
   * Complete 5x5 quadrant mapping (25 quadrants)
   * Maps quadrant number to operator/project/label/framing
   */
  static readonly QUADRANT_MAP: Record<number, QuadrantMapping> = {
    // Planning row (Y=1)
    1:  { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.PLANNING, label: 'Learning Explorer', framing: 'Discover' },
    2:  { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.PLANNING, label: 'Research Assistant', framing: 'Learn' },
    3:  { operator: OperatorMaturity.MID, project: ProjectMaturity.PLANNING, label: 'Tech Evaluator', framing: 'Assess' },
    4:  { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.PLANNING, label: 'Solution Architect', framing: 'Design' },
    5:  { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.PLANNING, label: 'Strategic Planner', framing: 'Strategize' },

    // Inception row (Y=2)
    6:  { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.INCEPTION, label: 'Guided Starter', framing: 'Follow' },
    7:  { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.INCEPTION, label: 'Learning Starter', framing: 'Learn' },
    8:  { operator: OperatorMaturity.MID, project: ProjectMaturity.INCEPTION, label: 'Applying Foundations', framing: 'Apply' },
    9:  { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.INCEPTION, label: 'Architecting', framing: 'Design' },
    10: { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.INCEPTION, label: 'Framework Creator', framing: 'Define' },

    // Development row (Y=3)
    11: { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.DEVELOPMENT, label: 'Assisted Builder', framing: 'Practice' },
    12: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.DEVELOPMENT, label: 'Growing Builder', framing: 'Study' },
    13: { operator: OperatorMaturity.MID, project: ProjectMaturity.DEVELOPMENT, label: 'Productive Builder', framing: 'Build' },
    14: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.DEVELOPMENT, label: 'Lead Builder', framing: 'Guide' },
    15: { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.DEVELOPMENT, label: 'Principal Engineer', framing: 'Architect' },

    // Established row (Y=4)
    16: { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.ESTABLISHED, label: 'Code Explorer', framing: 'Explore' },
    17: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.ESTABLISHED, label: 'Feature Developer', framing: 'Implement' },
    18: { operator: OperatorMaturity.MID, project: ProjectMaturity.ESTABLISHED, label: 'System Contributor', framing: 'Enhance' },
    19: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.ESTABLISHED, label: 'System Steward', framing: 'Improve' },
    20: { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.ESTABLISHED, label: 'Tech Lead', framing: 'Evolve' },

    // Mature row (Y=5)
    21: { operator: OperatorMaturity.NOVICE, project: ProjectMaturity.MATURE, label: 'Codebase Learner', framing: 'Understand' },
    22: { operator: OperatorMaturity.JUNIOR, project: ProjectMaturity.MATURE, label: 'Learning Maintainer', framing: 'Explore' },
    23: { operator: OperatorMaturity.MID, project: ProjectMaturity.MATURE, label: 'System Maintainer', framing: 'Maintain' },
    24: { operator: OperatorMaturity.SENIOR, project: ProjectMaturity.MATURE, label: 'System Expert', framing: 'Document' },
    25: { operator: OperatorMaturity.EXPERT, project: ProjectMaturity.MATURE, label: 'Platform Owner', framing: 'Govern' }
  };

  /**
   * Framing templates by operator + project combination
   * Used for detailed content framing
   */
  private static readonly FRAMING_MAP: Record<string, FramingTemplate> = {
    // Planning row
    'novice-planning': {
      prefix: '🔍 Discover',
      tone: 'exploratory',
      learningPrompt: 'What did you discover while exploring options?'
    },
    'junior-planning': {
      prefix: '📚 Learn',
      tone: 'instructional',
      learningPrompt: 'What did you learn while researching approaches?'
    },
    'mid-planning': {
      prefix: '⚖️ Assess',
      tone: 'analytical',
      learningPrompt: 'What criteria did you use to evaluate options?'
    },
    'senior-planning': {
      prefix: '🎯 Design',
      tone: 'strategic',
      learningPrompt: 'What architectural decisions did you make?'
    },
    'expert-planning': {
      prefix: '♟️ Strategize',
      tone: 'visionary',
      learningPrompt: 'What strategic considerations guided your planning?'
    },

    // Inception row
    'novice-inception': {
      prefix: '👣 Follow',
      tone: 'guided',
      learningPrompt: 'What foundational steps did you follow?'
    },
    'junior-inception': {
      prefix: '📚 Learn',
      tone: 'instructional',
      learningPrompt: 'What foundational decisions did you make?'
    },
    'mid-inception': {
      prefix: '🔨 Apply',
      tone: 'practical',
      learningPrompt: 'What established patterns did you choose?'
    },
    'senior-inception': {
      prefix: '🎯 Design',
      tone: 'strategic',
      learningPrompt: 'What architectural decisions were made?'
    },
    'expert-inception': {
      prefix: '🏗️ Define',
      tone: 'authoritative',
      learningPrompt: 'What frameworks or conventions did you establish?'
    },

    // Development row
    'novice-development': {
      prefix: '💪 Practice',
      tone: 'hands-on',
      learningPrompt: 'What did you practice while building?'
    },
    'junior-development': {
      prefix: '💡 Study',
      tone: 'educational',
      learningPrompt: 'What patterns did you discover?'
    },
    'mid-development': {
      prefix: '⚡ Build',
      tone: 'action-oriented',
      learningPrompt: 'What implementation patterns emerged?'
    },
    'senior-development': {
      prefix: '🌟 Guide',
      tone: 'mentoring',
      learningPrompt: 'What guidance did you provide the team?'
    },
    'expert-development': {
      prefix: '🏛️ Architect',
      tone: 'systematic',
      learningPrompt: 'What architectural patterns did you establish?'
    },

    // Established row
    'novice-established': {
      prefix: '🔍 Explore',
      tone: 'investigative',
      learningPrompt: 'What did you discover in the existing system?'
    },
    'junior-established': {
      prefix: '🛠️ Implement',
      tone: 'practical',
      learningPrompt: 'What features did you add to the system?'
    },
    'mid-established': {
      prefix: '📈 Enhance',
      tone: 'improvement-focused',
      learningPrompt: 'What improvements did you make?'
    },
    'senior-established': {
      prefix: '🔧 Improve',
      tone: 'refinement-focused',
      learningPrompt: 'What refinements improved the system?'
    },
    'expert-established': {
      prefix: '🚀 Evolve',
      tone: 'transformational',
      learningPrompt: 'How did you evolve the system architecture?'
    },

    // Mature row
    'novice-mature': {
      prefix: '📖 Understand',
      tone: 'learning-focused',
      learningPrompt: 'What did you learn from the existing system?'
    },
    'junior-mature': {
      prefix: '🔍 Explore',
      tone: 'investigative',
      learningPrompt: 'What did you learn from the existing system?'
    },
    'mid-mature': {
      prefix: '🔧 Maintain',
      tone: 'systematic',
      learningPrompt: 'What consistency patterns did you maintain?'
    },
    'senior-mature': {
      prefix: '📝 Document',
      tone: 'authoritative',
      learningPrompt: 'What should be documented for the team?'
    },
    'expert-mature': {
      prefix: '👑 Govern',
      tone: 'governance-focused',
      learningPrompt: 'What governance decisions did you make?'
    }
  };

  /**
   * Learning prompts by project phase
   */
  private static readonly LEARNING_PROMPTS: Record<ProjectMaturity, string> = {
    [ProjectMaturity.PLANNING]: 'What did you discover while planning?',
    [ProjectMaturity.INCEPTION]: 'What foundational decisions did you make?',
    [ProjectMaturity.DEVELOPMENT]: 'What patterns emerged during implementation?',
    [ProjectMaturity.ESTABLISHED]: 'What improvements did you make?',
    [ProjectMaturity.MATURE]: 'What optimizations or fixes were discovered?'
  };

  /**
   * Default framing for items without specific context
   */
  private static readonly DEFAULT_FRAMING: FramingTemplate = {
    prefix: '💡 Consider',
    tone: 'balanced',
    learningPrompt: 'What did you learn during this task?'
  };

  /**
   * Get framing template for specific operator/project combination
   *
   * @param operator - Operator maturity level
   * @param project - Project maturity level
   * @returns Framing template with prefix, tone, and learning prompt
   */
  static getFraming(operator: OperatorMaturity, project: ProjectMaturity): FramingTemplate {
    const key = `${operator}-${project}`;
    return FramingTemplates.FRAMING_MAP[key] || FramingTemplates.DEFAULT_FRAMING;
  }

  /**
   * Get learning prompt for current project phase
   *
   * @param project - Project maturity level
   * @returns Learning prompt question
   */
  static getLearningPrompt(project: ProjectMaturity): string {
    return FramingTemplates.LEARNING_PROMPTS[project] || FramingTemplates.DEFAULT_FRAMING.learningPrompt;
  }

  /**
   * Get quadrant metadata by quadrant number
   *
   * @param quadrant - Quadrant number (1-25)
   * @returns Quadrant mapping with operator, project, label, framing
   */
  static getQuadrantInfo(quadrant: number): QuadrantMapping {
    if (quadrant < 1 || quadrant > 25) {
      throw new Error(`Invalid quadrant: ${quadrant}. Must be 1-25.`);
    }

    const mapping = FramingTemplates.QUADRANT_MAP[quadrant];
    if (!mapping) {
      throw new Error(`No mapping found for quadrant ${quadrant}`);
    }

    return mapping;
  }

  /**
   * Wrap knowledge item content with appropriate framing
   *
   * @param title - Item title
   * @param body - Item body content
   * @param operator - Operator maturity level
   * @param project - Project maturity level
   * @returns Framed markdown content
   */
  static wrapItem(
    title: string,
    body: string,
    operator: OperatorMaturity,
    project: ProjectMaturity
  ): string {
    const framing = FramingTemplates.getFraming(operator, project);

    return `
### ${framing.prefix}: ${title}

${body}

---
`;
  }

  /**
   * Generate context header for injection
   *
   * @param complexity - Complexity level
   * @param quadrant - Quadrant number (1-25)
   * @param itemCount - Number of items selected
   * @param totalCount - Total number of items in template
   * @param operator - Operator maturity level
   * @param project - Project maturity level
   * @returns Markdown header with context info
   */
  static generateContextHeader(
    complexity: DomainComplexity,
    quadrant: number,
    itemCount: number,
    totalCount: number,
    operator: OperatorMaturity,
    project: ProjectMaturity
  ): string {
    const framing = FramingTemplates.getFraming(operator, project);
    const quadrantInfo = FramingTemplates.getQuadrantInfo(quadrant);
    const learningPrompt = FramingTemplates.getLearningPrompt(project);

    // Capitalize complexity
    const complexityLabel = complexity.charAt(0).toUpperCase() + complexity.slice(1);

    return `<!-- Agent Brain Context: ${complexityLabel} Complexity, Q${quadrant} (${quadrantInfo.label}) -->
<!-- ${itemCount} items selected from ${totalCount} total -->

## ${framing.prefix}: Context-Relevant Knowledge

<!-- Learning Prompt: ${learningPrompt} -->

`;
  }

  /**
   * Get complexity label with description
   *
   * @param complexity - Complexity level
   * @returns Label with short description
   */
  static getComplexityLabel(complexity: DomainComplexity): string {
    const labels: Record<DomainComplexity, string> = {
      [DomainComplexity.SIMPLE]: 'Simple (Basic CRUD, straightforward logic)',
      [DomainComplexity.STANDARD]: 'Standard (Typical business logic, common patterns)',
      [DomainComplexity.COMPLEX]: 'Complex (Distributed systems, advanced algorithms)'
    };
    return labels[complexity];
  }

  /**
   * Get operator maturity label
   *
   * @param operator - Operator maturity level
   * @returns Human-readable label
   */
  static getOperatorLabel(operator: OperatorMaturity): string {
    const labels: Record<OperatorMaturity, string> = {
      [OperatorMaturity.NOVICE]: 'Novice',
      [OperatorMaturity.JUNIOR]: 'Junior',
      [OperatorMaturity.MID]: 'Mid',
      [OperatorMaturity.SENIOR]: 'Senior',
      [OperatorMaturity.EXPERT]: 'Expert'
    };
    return labels[operator];
  }

  /**
   * Get project maturity label
   *
   * @param project - Project maturity level
   * @returns Human-readable label
   */
  static getProjectLabel(project: ProjectMaturity): string {
    const labels: Record<ProjectMaturity, string> = {
      [ProjectMaturity.PLANNING]: 'Planning',
      [ProjectMaturity.INCEPTION]: 'Inception',
      [ProjectMaturity.DEVELOPMENT]: 'Development',
      [ProjectMaturity.ESTABLISHED]: 'Established',
      [ProjectMaturity.MATURE]: 'Mature'
    };
    return labels[project];
  }
}
