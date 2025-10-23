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

  /**
   * Template provenance (NEW)
   * Tracks which marketplace template this item came from
   */
  sourceTemplate?: {
    /** Template ID */
    id: string;
    /** Template version at install time */
    version: string;
    /** Original item ID in template (for tracking) */
    itemKey: string;
  };
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

// =============================================================================
// Marketplace Template Types (REPLACES old Template interface)
// =============================================================================

/**
 * Template category for marketplace classification
 */
export enum TemplateCategory {
  DEVELOPMENT = 'development',
  DOCUMENTATION = 'documentation',
  BEST_PRACTICES = 'best-practices',
  ARCHITECTURE = 'architecture',
  TESTING = 'testing',
  SECURITY = 'security',
  ONBOARDING = 'onboarding',
  WORKFLOWS = 'workflows',
  GENERAL = 'general'
}

/**
 * Source of the template
 */
export enum TemplateSource {
  BUNDLED = 'bundled',  // Shipped with extension
  USER = 'user'         // Created by user
}

/**
 * Author information for templates
 */
export interface TemplateAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * Marketplace Template
 * Complete template structure with embedded items for marketplace
 */
export interface MarketplaceTemplate {
  // Core Identity
  id: string;                     // UUID (e.g., "bundled.git-essentials")
  name: string;                   // Display name
  description: string;            // Short description (1-2 sentences)

  // Versioning
  version: string;                // Semantic version (e.g., "1.0.0")
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp

  // Classification
  category: TemplateCategory;     // Primary category
  tags: string[];                 // Search/filter tags

  // Attribution
  author: TemplateAuthor;         // Creator information
  license: string;                // License (MIT, CC-BY, Apache, etc.)

  // Source
  source: TemplateSource;         // Origin type

  // Content
  items: KnowledgeItem[];         // Embedded full items
  itemCount: number;              // Convenience field

  // Runtime State (not persisted in template file)
  isInstalled?: boolean;          // Computed at load time
  installedAt?: string;           // From installation registry
  installedItemIds?: string[];   // IDs of created items in workspace
}

/**
 * Installation record for a template in workspace
 */
export interface InstalledTemplate {
  templateId: string;
  version: string;
  installedAt: string;
  installedItemIds: string[];   // Items created from this template
  source: TemplateSource;
}

/**
 * Installation registry (persisted in .agent-brain/marketplace/installed.json)
 */
export interface InstallationRegistry {
  version: string;              // Registry format version
  installed: InstalledTemplate[];
  lastUpdated: string;
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
  id?: string;  // Optional - if provided, preserves original ID (for template items)
  type: KnowledgeType;
  scope: KnowledgeScope;
  title: string;
  body?: string;
  source?: string;
  tags?: string[];
  author?: string;
}

/**
 * Metadata for creating a marketplace template
 */
export interface CreateMarketplaceTemplateOptions {
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  author: TemplateAuthor;
  license: string;
  items: KnowledgeItem[];
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

// =============================================================================
// Marketplace Template Helper Functions
// =============================================================================

/**
 * Type guard to check if a string is a valid TemplateCategory
 */
export function isTemplateCategory(value: string): value is TemplateCategory {
  return Object.values(TemplateCategory).includes(value as TemplateCategory);
}

/**
 * Type guard to check if a string is a valid TemplateSource
 */
export function isTemplateSource(value: string): value is TemplateSource {
  return Object.values(TemplateSource).includes(value as TemplateSource);
}

/**
 * Get display label for template category
 */
export function getTemplateCategoryLabel(category: TemplateCategory): string {
  const labels: Record<TemplateCategory, string> = {
    [TemplateCategory.DEVELOPMENT]: 'Development',
    [TemplateCategory.DOCUMENTATION]: 'Documentation',
    [TemplateCategory.BEST_PRACTICES]: 'Best Practices',
    [TemplateCategory.ARCHITECTURE]: 'Architecture',
    [TemplateCategory.TESTING]: 'Testing',
    [TemplateCategory.SECURITY]: 'Security',
    [TemplateCategory.ONBOARDING]: 'Onboarding',
    [TemplateCategory.WORKFLOWS]: 'Workflows',
    [TemplateCategory.GENERAL]: 'General'
  };
  return labels[category];
}

/**
 * Get emoji icon for template category
 */
export function getTemplateCategoryIcon(category: TemplateCategory): string {
  const icons: Record<TemplateCategory, string> = {
    [TemplateCategory.DEVELOPMENT]: '🎯',
    [TemplateCategory.DOCUMENTATION]: '📘',
    [TemplateCategory.BEST_PRACTICES]: '⭐',
    [TemplateCategory.ARCHITECTURE]: '🏗️',
    [TemplateCategory.TESTING]: '🧪',
    [TemplateCategory.SECURITY]: '🔒',
    [TemplateCategory.ONBOARDING]: '🚀',
    [TemplateCategory.WORKFLOWS]: '🔄',
    [TemplateCategory.GENERAL]: '📦'
  };
  return icons[category];
}

/**
 * Get display label for template source
 */
export function getTemplateSourceLabel(source: TemplateSource): string {
  const labels: Record<TemplateSource, string> = {
    [TemplateSource.BUNDLED]: 'Bundled',
    [TemplateSource.USER]: 'User'
  };
  return labels[source];
}

/**
 * Get emoji badge for template source
 */
export function getTemplateSourceBadge(source: TemplateSource): string {
  const badges: Record<TemplateSource, string> = {
    [TemplateSource.BUNDLED]: '🏢',
    [TemplateSource.USER]: '👤'
  };
  return badges[source];
}

/**
 * Validate a marketplace template
 */
export function validateMarketplaceTemplate(template: Partial<MarketplaceTemplate>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!template.id || template.id.trim().length === 0) {
    errors.push('ID is required');
  }

  if (!template.name || template.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!template.description || template.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!template.version || template.version.trim().length === 0) {
    errors.push('Version is required');
  }

  if (!template.category) {
    errors.push('Category is required');
  } else if (!isTemplateCategory(template.category)) {
    errors.push(`Invalid category: ${template.category}`);
  }

  if (!template.source) {
    errors.push('Source is required');
  } else if (!isTemplateSource(template.source)) {
    errors.push(`Invalid source: ${template.source}`);
  }

  if (!template.author) {
    errors.push('Author is required');
  } else if (!template.author.name || template.author.name.trim().length === 0) {
    errors.push('Author name is required');
  }

  if (!template.license || template.license.trim().length === 0) {
    errors.push('License is required');
  }

  if (!template.items || !Array.isArray(template.items)) {
    errors.push('Items array is required');
  } else if (template.items.length === 0) {
    errors.push('At least one item is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate a template ID slug from a name
 */
export function generateTemplateId(name: string, source: TemplateSource): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const prefix = source === TemplateSource.BUNDLED ? 'bundled' : 'user';
  return `${prefix}.${slug}`;
}
