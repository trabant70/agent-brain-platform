/**
 * Knowledge Domain Types
 *
 * Core type definitions for the knowledge management system.
 * All knowledge items are stored as markdown files with frontmatter.
 */

/**
 * Knowledge item type taxonomy
 * Categorizes different kinds of development knowledge
 */
export enum KnowledgeType {
  // Architectural Knowledge
  ADR = 'adr',                          // Architecture Decision Record
  DESIGN_PATTERN = 'design-pattern',    // Software design patterns
  ANTI_PATTERN = 'anti-pattern',        // Things to avoid

  // Process & Standards
  GOLDEN_PATH = 'golden-path',          // Recommended way to do something
  STANDARD = 'standard',                // Coding/process standards
  CONVENTION = 'convention',            // Team conventions
  CHECKLIST = 'checklist',              // Process checklists

  // Technical Knowledge
  SNIPPET = 'snippet',                  // Code snippets
  CONFIGURATION = 'configuration',      // Config templates
  COMMAND = 'command',                  // CLI commands/scripts
  API_REFERENCE = 'api-reference',      // API documentation

  // Learning & Experience
  LEARNING = 'learning',                // Session learnings
  TROUBLESHOOTING = 'troubleshooting',  // Problem solutions
  GOTCHA = 'gotcha',                    // Edge cases to watch for
  TIP = 'tip',                          // Quick tips

  // Planning & Documentation
  TEMPLATE = 'template',                // Document templates
  GUIDELINE = 'guideline',              // Process guidelines
  WORKFLOW = 'workflow',                // Step-by-step workflows
  RUNBOOK = 'runbook',                  // Operational runbooks

  // Custom
  CUSTOM = 'custom'                     // User-defined types
}

/**
 * Scope of knowledge item visibility/applicability
 */
export enum KnowledgeScope {
  PERSONAL = 'personal',                // Individual developer
  TEAM = 'team',                        // Team-wide
  PROJECT = 'project',                  // Project-specific
  ORGANIZATION = 'organization',        // Company-wide
  PUBLIC = 'public'                     // Open source/shareable
}

/**
 * Core knowledge item structure
 * Represents a single piece of knowledge loaded from markdown
 */
export interface KnowledgeItem {
  /** Unique identifier (UUID) */
  id: string;

  /** Type of knowledge item */
  type: KnowledgeType;

  /** Scope/visibility of this knowledge */
  scope: KnowledgeScope;

  /** Display title */
  title: string;

  /** Raw markdown content (without frontmatter) */
  body: string;

  /** Optional genealogy path (e.g., "auth.oauth.keycloak") */
  source?: string;

  /** User-defined tags for categorization */
  tags: string[];

  /** Absolute file path */
  path: string;

  /** Path relative to workspace root */
  relativePath: string;

  /** Whether the file was successfully parsed */
  valid: boolean;

  /** Error message if parsing failed */
  parseError?: string;

  /** Metadata about the knowledge item */
  metadata: KnowledgeItemMetadata;
}

/**
 * Metadata associated with a knowledge item
 */
export interface KnowledgeItemMetadata {
  /** When the file was created */
  createdAt: Date;

  /** When the file was last modified */
  updatedAt: Date;

  /** Optional author name */
  author?: string;

  /** Optional version number */
  version?: number;

  /** File size in bytes */
  fileSize?: number;
}

/**
 * Template for combining multiple knowledge items
 * Templates can be applied to claude.md files
 */
export interface Template {
  /** Unique identifier */
  id: string;

  /** Template name */
  name: string;

  /** Description of what this template contains */
  description: string;

  /** Version number */
  version: number;

  /** Array of knowledge item IDs included in this template */
  itemIds: string[];

  /** Template metadata */
  metadata: TemplateMetadata;
}

/**
 * Metadata for templates
 */
export interface TemplateMetadata {
  /** When the template was created */
  createdAt: Date;

  /** When the template was last updated */
  updatedAt: Date;

  /** Optional author */
  author?: string;

  /** Number of times this template has been applied */
  usageCount?: number;
}

/**
 * Represents a claude.md file with applied templates
 */
export interface ClaudeMdFile {
  /** Absolute file path */
  path: string;

  /** Path relative to workspace root */
  relativePath: string;

  /** Full file content */
  content: string;

  /** Detected template sections */
  templates: TemplateSection[];

  /** Whether there are any conflicts in template markers */
  hasConflicts: boolean;

  /** Conflict descriptions if any */
  conflicts?: string[];
}

/**
 * Represents a template section within a claude.md file
 */
export interface TemplateSection {
  /** ID of the template */
  templateId: string;

  /** Name of the template */
  templateName: string;

  /** Start marker comment */
  startMarker: string;

  /** End marker comment */
  endMarker: string;

  /** Content between markers */
  content: string;

  /** Line number where section starts */
  startLine: number;

  /** Line number where section ends */
  endLine: number;
}

/**
 * Statistics about the knowledge base
 */
export interface KnowledgeStats {
  /** Total number of knowledge items */
  totalItems: number;

  /** Count of items by type */
  itemsByType: Map<KnowledgeType, number>;

  /** Count of items by scope */
  itemsByScope: Map<KnowledgeScope, number>;

  /** Total number of templates */
  totalTemplates: number;

  /** Number of items that failed to parse */
  invalidItems: number;

  /** Total tags used across all items */
  uniqueTags: number;

  /** Total size of all knowledge files in bytes */
  totalSize: number;
}

/**
 * Filter criteria for knowledge items
 */
export interface KnowledgeFilter {
  /** Filter by types */
  types?: KnowledgeType[];

  /** Filter by scopes */
  scopes?: KnowledgeScope[];

  /** Filter by tags (items must have ALL tags) */
  tags?: string[];

  /** Search query (searches title, body, source) */
  query?: string;

  /** Only show valid items */
  validOnly?: boolean;
}

/**
 * Result of a knowledge item search
 */
export interface KnowledgeSearchResult {
  /** The matching item */
  item: KnowledgeItem;

  /** Relevance score (0-1) */
  score: number;

  /** Matching snippets from body */
  snippets?: string[];
}

/**
 * Frontmatter data structure
 */
export interface KnowledgeFrontmatter {
  title?: string;
  type?: string;
  scope?: string;
  source?: string;
  tags?: string | string[];
  author?: string;
  version?: number;
  [key: string]: any;  // Allow additional custom fields
}

/**
 * Result of template application
 */
export interface TemplateApplicationResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Updated file content */
  content?: string;

  /** Error message if failed */
  error?: string;

  /** List of conflicts detected */
  conflicts?: string[];

  /** Path where the file was written */
  path?: string;

  /** Additional message for user feedback */
  message?: string;

  /** Whether existing content was replaced */
  wasReplaced?: boolean;
}

/**
 * Options for creating a new knowledge item
 */
export interface CreateKnowledgeItemOptions {
  type: KnowledgeType;
  scope: KnowledgeScope;
  title: string;
  body?: string;
  source?: string;
  tags?: string[];
  author?: string;
}

/**
 * Options for creating a template
 */
export interface CreateTemplateOptions {
  name: string;
  description?: string;
  itemIds: string[];
  author?: string;
}

/**
 * Type guard to check if a string is a valid KnowledgeType
 */
export function isKnowledgeType(value: string): value is KnowledgeType {
  return Object.values(KnowledgeType).includes(value as KnowledgeType);
}

/**
 * Type guard to check if a string is a valid KnowledgeScope
 */
export function isKnowledgeScope(value: string): value is KnowledgeScope {
  return Object.values(KnowledgeScope).includes(value as KnowledgeScope);
}

/**
 * Get display label for knowledge type
 */
export function getKnowledgeTypeLabel(type: KnowledgeType): string {
  const labels: Record<KnowledgeType, string> = {
    [KnowledgeType.ADR]: 'Architecture Decision',
    [KnowledgeType.DESIGN_PATTERN]: 'Design Pattern',
    [KnowledgeType.ANTI_PATTERN]: 'Anti-Pattern',
    [KnowledgeType.GOLDEN_PATH]: 'Golden Path',
    [KnowledgeType.STANDARD]: 'Standard',
    [KnowledgeType.CONVENTION]: 'Convention',
    [KnowledgeType.CHECKLIST]: 'Checklist',
    [KnowledgeType.SNIPPET]: 'Code Snippet',
    [KnowledgeType.CONFIGURATION]: 'Configuration',
    [KnowledgeType.COMMAND]: 'Command',
    [KnowledgeType.API_REFERENCE]: 'API Reference',
    [KnowledgeType.LEARNING]: 'Learning',
    [KnowledgeType.TROUBLESHOOTING]: 'Troubleshooting',
    [KnowledgeType.GOTCHA]: 'Gotcha',
    [KnowledgeType.TIP]: 'Tip',
    [KnowledgeType.TEMPLATE]: 'Template',
    [KnowledgeType.GUIDELINE]: 'Guideline',
    [KnowledgeType.WORKFLOW]: 'Workflow',
    [KnowledgeType.RUNBOOK]: 'Runbook',
    [KnowledgeType.CUSTOM]: 'Custom'
  };
  return labels[type];
}

/**
 * Get display label for knowledge scope
 */
export function getKnowledgeScopeLabel(scope: KnowledgeScope): string {
  const labels: Record<KnowledgeScope, string> = {
    [KnowledgeScope.PERSONAL]: 'Personal',
    [KnowledgeScope.TEAM]: 'Team',
    [KnowledgeScope.PROJECT]: 'Project',
    [KnowledgeScope.ORGANIZATION]: 'Organization',
    [KnowledgeScope.PUBLIC]: 'Public'
  };
  return labels[scope];
}

/**
 * Get emoji icon for knowledge type
 */
export function getKnowledgeTypeIcon(type: KnowledgeType): string {
  const icons: Record<KnowledgeType, string> = {
    [KnowledgeType.ADR]: '📋',
    [KnowledgeType.DESIGN_PATTERN]: '🎨',
    [KnowledgeType.ANTI_PATTERN]: '⚠️',
    [KnowledgeType.GOLDEN_PATH]: '⭐',
    [KnowledgeType.STANDARD]: '📏',
    [KnowledgeType.CONVENTION]: '🤝',
    [KnowledgeType.CHECKLIST]: '✅',
    [KnowledgeType.SNIPPET]: '📝',
    [KnowledgeType.CONFIGURATION]: '⚙️',
    [KnowledgeType.COMMAND]: '💻',
    [KnowledgeType.API_REFERENCE]: '📚',
    [KnowledgeType.LEARNING]: '💡',
    [KnowledgeType.TROUBLESHOOTING]: '🔧',
    [KnowledgeType.GOTCHA]: '⚡',
    [KnowledgeType.TIP]: '💭',
    [KnowledgeType.TEMPLATE]: '📄',
    [KnowledgeType.GUIDELINE]: '📖',
    [KnowledgeType.WORKFLOW]: '🔄',
    [KnowledgeType.RUNBOOK]: '📗',
    [KnowledgeType.CUSTOM]: '🏷️'
  };
  return icons[type];
}

/**
 * Validate a knowledge item
 */
export function validateKnowledgeItem(item: Partial<KnowledgeItem>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!item.id) {
    errors.push('ID is required');
  }

  if (!item.title || item.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!item.type) {
    errors.push('Type is required');
  } else if (!isKnowledgeType(item.type)) {
    errors.push(`Invalid type: ${item.type}`);
  }

  if (!item.scope) {
    errors.push('Scope is required');
  } else if (!isKnowledgeScope(item.scope)) {
    errors.push(`Invalid scope: ${item.scope}`);
  }

  if (!item.path) {
    errors.push('Path is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// =============================================================================
// Template Import Types
// =============================================================================

/**
 * Options for importing a template
 */
export interface ImportOptions {
  /** How to handle conflicts with existing templates/items */
  conflictResolution: 'skip' | 'overwrite' | 'merge' | 'rename';

  /** Optional new name when using 'rename' strategy */
  templateNameOverride?: string;

  /** Whether to skip items that already exist */
  skipDuplicateItems?: boolean;
}

/**
 * Result of a template import operation
 */
export interface ImportResult {
  /** Whether the import succeeded */
  success: boolean;

  /** ID of the imported template */
  templateId?: string;

  /** Name of the imported template */
  templateName?: string;

  /** Number of items created */
  itemsCreated: number;

  /** Number of items updated */
  itemsUpdated: number;

  /** Number of items skipped */
  itemsSkipped: number;

  /** Error messages */
  errors: string[];

  /** Warning messages */
  warnings: string[];

  /** Details about conflicts encountered */
  conflicts?: ConflictInfo[];
}

/**
 * Information about a conflict during import
 */
export interface ConflictInfo {
  /** Type of conflict */
  type: 'template' | 'item';

  /** Name of the conflicting entity */
  name: string;

  /** ID of the existing entity */
  existingId: string;

  /** Action taken to resolve conflict */
  action: 'skipped' | 'overwritten' | 'merged';
}

/**
 * Parsed template from an export file
 */
export interface ParsedTemplate {
  /** Template metadata from YAML frontmatter */
  name: string;
  version: number;
  description?: string;
  exported?: string;

  /** Parsed knowledge items */
  items: ParsedKnowledgeItem[];
}

/**
 * Parsed knowledge item from an export file
 */
export interface ParsedKnowledgeItem {
  /** Item title */
  title: string;

  /** Item type (parsed from icon or inferred) */
  type: KnowledgeType;

  /** Item source path */
  source?: string;

  /** Item tags */
  tags: string[];

  /** Item body content */
  body: string;
}

/**
 * Result of parsing an import file
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;

  /** Parsed template data */
  template?: ParsedTemplate;

  /** Error message if parsing failed */
  error?: string;

  /** Warning messages */
  warnings: string[];
}

/**
 * Result of validating a parsed template
 */
export interface ValidationResult {
  /** Whether validation succeeded */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];
}
