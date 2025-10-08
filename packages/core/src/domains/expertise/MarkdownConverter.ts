/**
 * Markdown Converter
 *
 * Converts Markdown files (ADRs, Patterns, Golden Paths, Planning Templates)
 * into ExpertisePackage format for loading into the package system
 */

import type {
  ExpertisePackage,
  ExpertiseRule,
  ExpertisePattern,
  PlanningTemplate,
  PlanningSection,
  PackageMetadata
} from './types';

export class MarkdownConverter {
  /**
   * Convert ADRs markdown to package
   * Format: docs/agent_brain_intelligence/agentbrain-adrs.md
   */
  convertADRsToPackage(markdown: string): ExpertisePackage {
    const adrs = this.parseADRs(markdown);

    return {
      id: 'com.agentbrain.adrs',
      name: 'Agent Brain Architectural Decision Records',
      version: '1.0.0',
      description: 'Core architectural decisions guiding Agent Brain development',
      author: {
        name: 'Agent Brain Core Team',
        role: 'Architecture Team',
        organization: 'Agent Brain Platform'
      },
      domain: 'architecture',
      authority: 'organizational',
      enforcement: 'recommended',
      scope: {
        projects: ['agent-brain-platform'],
        languages: ['typescript', 'javascript']
      },
      rules: adrs,
      patterns: [],
      planningTemplates: [],
      validationCriteria: [],
      examples: [],
      metadata: this.createMetadata('adrs'),
      conflicts: [],
      dependencies: [],
      overrides: 'supplement'
    };
  }

  /**
   * Convert Patterns markdown to package
   * Format: docs/agent_brain_intelligence/agentbrain-patterns.md
   */
  convertPatternsToPackage(markdown: string): ExpertisePackage {
    const patterns = this.parsePatterns(markdown);

    return {
      id: 'com.agentbrain.patterns',
      name: 'Agent Brain Development Patterns',
      version: '1.0.0',
      description: 'Proven patterns for Agent Brain development',
      author: {
        name: 'Agent Brain Core Team',
        role: 'Development Team',
        organization: 'Agent Brain Platform'
      },
      domain: 'development-patterns',
      authority: 'domain-expert',
      enforcement: 'recommended',
      scope: {
        projects: ['agent-brain-platform'],
        languages: ['typescript', 'javascript']
      },
      rules: [],
      patterns,
      planningTemplates: [],
      validationCriteria: [],
      examples: [],
      metadata: this.createMetadata('patterns'),
      conflicts: [],
      dependencies: [],
      overrides: 'supplement'
    };
  }

  /**
   * Convert Golden Paths markdown to package
   * Format: docs/agent_brain_intelligence/agentbrain-golden-paths.md
   */
  convertGoldenPathsToPackage(markdown: string): ExpertisePackage {
    const paths = this.parseGoldenPaths(markdown);

    return {
      id: 'com.agentbrain.golden-paths',
      name: 'Agent Brain Golden Paths',
      version: '1.0.0',
      description: 'Step-by-step workflows for common development tasks',
      author: {
        name: 'Agent Brain Core Team',
        role: 'Development Team',
        organization: 'Agent Brain Platform'
      },
      domain: 'workflows',
      authority: 'domain-expert',
      enforcement: 'optional',
      scope: {
        projects: ['agent-brain-platform'],
        languages: ['typescript', 'javascript']
      },
      rules: [],
      patterns: paths,  // Golden paths stored as patterns
      planningTemplates: [],
      validationCriteria: [],
      examples: [],
      metadata: this.createMetadata('golden-paths'),
      conflicts: [],
      dependencies: [],
      overrides: 'supplement'
    };
  }

  /**
   * Convert Planning Templates markdown to package
   * Format: docs/agent_brain_intelligence/agentbrain-planning-templates.md
   */
  convertPlanningTemplatesToPackage(markdown: string): ExpertisePackage {
    const templates = this.parsePlanningTemplates(markdown);

    return {
      id: 'com.agentbrain.planning-templates',
      name: 'Agent Brain Planning Templates',
      version: '1.0.0',
      description: 'Planning templates for structured development',
      author: {
        name: 'Agent Brain Core Team',
        role: 'Architecture Team',
        organization: 'Agent Brain Platform'
      },
      domain: 'planning',
      authority: 'organizational',
      enforcement: 'recommended',
      scope: {
        projects: ['agent-brain-platform'],
        languages: ['typescript', 'javascript']
      },
      rules: [],
      patterns: [],
      planningTemplates: templates,
      validationCriteria: [],
      examples: [],
      metadata: this.createMetadata('planning-templates'),
      conflicts: [],
      dependencies: [],
      overrides: 'supplement'
    };
  }

  // ===== Private Parsing Methods =====

  /**
   * Parse ADRs from markdown
   */
  private parseADRs(markdown: string): ExpertiseRule[] {
    const rules: ExpertiseRule[] = [];

    // Split by ADR headers (## ADR-XXX:)
    const adrSections = markdown.split(/## ADR-\d+:/);

    for (let i = 1; i < adrSections.length; i++) {
      const section = adrSections[i];

      // Extract title (first line)
      const lines = section.trim().split('\n');
      const title = lines[0].trim();

      // Extract status
      const statusMatch = section.match(/\*\*Status\*\*:\s*(\w+)/);
      const status = statusMatch ? statusMatch[1] : 'unknown';

      // Extract context
      const contextMatch = section.match(/### Context\n([\s\S]*?)\n### /);
      const context = contextMatch ? contextMatch[1].trim() : '';

      // Extract decision
      const decisionMatch = section.match(/### Decision\n([\s\S]*?)\n### /);
      const decision = decisionMatch ? decisionMatch[1].trim() : '';

      // Extract consequences
      const consequencesMatch = section.match(/### Consequences\n([\s\S]*?)(?:\n### |\n## |$)/);
      const consequences = consequencesMatch ? consequencesMatch[1].trim() : '';

      // Convert ADR to rule
      rules.push({
        id: `adr-${i}`,
        name: title,
        category: 'architecture',
        severity: status.toLowerCase() === 'accepted' ? 'warning' : 'info',
        description: context,
        condition: {
          patterns: this.extractKeywords(title + ' ' + decision),
          context: ['architecture', 'design', 'development']
        },
        requirement: decision,
        rationale: context,
        validation: consequences
      });
    }

    return rules;
  }

  /**
   * Parse Patterns from markdown
   */
  private parsePatterns(markdown: string): ExpertisePattern[] {
    const patterns: ExpertisePattern[] = [];

    // Split by pattern headers (## Pattern:)
    const patternSections = markdown.split(/## Pattern:/);

    for (let i = 1; i < patternSections.length; i++) {
      const section = patternSections[i];

      // Extract pattern name (first line)
      const lines = section.trim().split('\n');
      const name = lines[0].trim();

      // Extract category
      const categoryMatch = section.match(/\*\*Category\*\*:\s*(.+)/);
      const category = categoryMatch ? categoryMatch[1].trim() : 'general';

      // Extract "When to Use"
      const whenMatch = section.match(/\*\*When to Use\*\*:\s*(.+)/);
      const when = whenMatch ? whenMatch[1].trim() : '';

      // Extract description (### Context section)
      const descMatch = section.match(/### Context\n([\s\S]*?)\n### /);
      const description = descMatch ? descMatch[1].trim() : '';

      // Extract template (### Implementation or Solution section)
      const templateMatch = section.match(/```(?:typescript|javascript)?\n([\s\S]*?)```/);
      const template = templateMatch ? templateMatch[1].trim() : '';

      // Extract benefits
      const benefitsMatch = section.match(/### Benefits\n([\s\S]*?)(?:\n### |\n## |$)/);
      const benefitsText = benefitsMatch ? benefitsMatch[1].trim() : '';
      const benefits = benefitsText.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim());

      patterns.push({
        id: `pattern-${i}`,
        name,
        description,
        template,
        when: when || category,
        benefits: benefits.length > 0 ? benefits : ['Improves code quality']
      });
    }

    return patterns;
  }

  /**
   * Parse Golden Paths from markdown
   */
  private parseGoldenPaths(markdown: string): ExpertisePattern[] {
    const paths: ExpertisePattern[] = [];

    // Split by golden path headers (## Golden Path:)
    const pathSections = markdown.split(/## Golden Path:/);

    for (let i = 1; i < pathSections.length; i++) {
      const section = pathSections[i];

      // Extract name (first line)
      const lines = section.trim().split('\n');
      const name = lines[0].trim();

      // Extract purpose
      const purposeMatch = section.match(/\*\*Purpose\*\*:\s*(.+)/);
      const purpose = purposeMatch ? purposeMatch[1].trim() : '';

      // Extract steps (all ### Step sections)
      const steps: string[] = [];
      const stepMatches = section.matchAll(/### (Step \d+[^#\n]*)\n([\s\S]*?)(?=\n### |\n## |$)/g);
      for (const match of stepMatches) {
        steps.push(`${match[1]}\n${match[2].trim()}`);
      }

      const template = steps.join('\n\n');

      paths.push({
        id: `golden-path-${i}`,
        name,
        description: purpose,
        template,
        when: purpose,
        benefits: ['Structured workflow', 'Reduced errors', 'Faster development']
      });
    }

    return paths;
  }

  /**
   * Parse Planning Templates from markdown
   */
  private parsePlanningTemplates(markdown: string): PlanningTemplate[] {
    const templates: PlanningTemplate[] = [];

    // Split by template headers (## Template:)
    const templateSections = markdown.split(/## Template:/);

    for (let i = 1; i < templateSections.length; i++) {
      const section = templateSections[i];

      // Extract name (first line)
      const lines = section.trim().split('\n');
      const name = lines[0].trim();

      // Extract trigger patterns
      const triggerMatch = section.match(/\*\*Trigger Patterns\*\*:\s*(.+)/);
      const triggerText = triggerMatch ? triggerMatch[1].trim() : '';
      const triggerPatterns = triggerText.split(',').map(p => p.trim().replace(/['"]/g, ''));

      // Extract sections
      const sections: PlanningSection[] = [];
      const sectionMatches = section.matchAll(/#### (\d+\.\s*.+?)\s*\[?(REQUIRED|OPTIONAL)?\]?\n([\s\S]*?)(?=\n#### |\n### |$)/g);

      for (const match of sectionMatches) {
        const sectionTitle = match[1].trim();
        const required = match[2]?.includes('REQUIRED') ?? true;
        const content = match[3].trim();

        // Extract prompt (everything before validation if present)
        const validationMatch = content.match(/validation:\s*(.+)/i);
        const validation = validationMatch ? validationMatch[1].trim() : undefined;

        const prompt = validationMatch
          ? content.substring(0, content.indexOf(validationMatch[0])).trim()
          : content;

        sections.push({
          id: sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: sectionTitle,
          required,
          prompt,
          validation
        });
      }

      // Extract completion criteria
      const criteriaMatch = section.match(/### Completion Criteria\n([\s\S]*?)(?:\n## |$)/);
      const criteriaText = criteriaMatch ? criteriaMatch[1].trim() : '';
      const completionCriteria = criteriaText.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim().replace(/^\[.\]\s*/, ''));

      templates.push({
        id: `template-${i}`,
        name,
        triggerPatterns: triggerPatterns.length > 0 ? triggerPatterns : [name.toLowerCase()],
        sections,
        completionCriteria: completionCriteria.length > 0 ? completionCriteria : []
      });
    }

    return templates;
  }

  /**
   * Extract keywords from text for pattern matching
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - split on spaces, filter short words
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have'].includes(word));

    // Return unique keywords as regex patterns
    return [...new Set(words)].map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }

  /**
   * Create package metadata
   */
  private createMetadata(type: string): PackageMetadata {
    return {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0.0',
      compatibility: 'agentbrain@2.0+',
      tags: ['agent-brain', 'core', type],
      icon: this.getIcon(type)
    };
  }

  /**
   * Get icon for package type
   */
  private getIcon(type: string): string {
    switch (type) {
      case 'adrs': return '📋';
      case 'patterns': return '🎨';
      case 'golden-paths': return '🛤️';
      case 'planning-templates': return '📝';
      default: return '📦';
    }
  }
}
