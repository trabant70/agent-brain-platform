/**
 * GroupTypes - Type definitions for group-based knowledge injection
 *
 * Defines the various types of knowledge groups that can be injected into
 * claude.md files, along with their metadata and scanning triggers.
 *
 * Group Types:
 * - TEMPLATE: Traditional template-based grouping
 * - OPERATOR_RANGE: Items grouped by operator experience level (1-5)
 * - PROJECT_RANGE: Items grouped by project phase (1-5)
 * - COMPLEXITY_RANGE: Items grouped by domain complexity (1-3)
 * - CATCHMENT: Items grouped by their position in the maturity catchment basin
 */

/**
 * Types of knowledge groups that can be injected
 */
export enum GroupType {
  TEMPLATE = 'TEMPLATE',                      // Template-based grouping
  OPERATOR_RANGE = 'OPERATOR_RANGE',          // Operator experience range (e.g., Mid-Senior)
  PROJECT_RANGE = 'PROJECT_RANGE',            // Project phase range (e.g., Dev-Established)
  COMPLEXITY_RANGE = 'COMPLEXITY_RANGE',      // Domain complexity range (Simple/Standard/Complex)
  CATCHMENT = 'CATCHMENT'                     // Catchment basin position (IN/PARTIAL/OUT)
}

/**
 * Catchment status indicating how well an item matches the user's context
 */
export enum CatchmentStatus {
  IN = 'IN',           // Fully within catchment basin (perfect match)
  PARTIAL = 'PARTIAL', // Partially matches context (some dimensions match)
  OUT = 'OUT'          // Outside catchment basin (no match)
}

/**
 * Events that trigger file scanning
 */
export enum ScanTrigger {
  FILE_LOAD = 'file_load',             // Opening a file
  POST_INJECTION = 'post_injection',    // After injecting groups
  POST_REMOVAL = 'post_removal',        // After removing groups
  CONFIG_CHANGE = 'config_change',      // Maturity settings changed
  FOCUS_LOST = 'focus_lost',           // Navigation/save/cancel
  MANUAL = 'manual'                     // User-triggered scan
}

/**
 * Metadata stored in group markers
 */
export interface GroupMarker {
  type: GroupType;
  id: string;

  // Optional metadata
  version?: string;              // For templates (e.g., "1.0.0")
  range?: string;                // For maturity ranges (e.g., "3-4")
  status?: CatchmentStatus;      // For catchment groups
  injectedAt?: string;           // ISO timestamp of injection
  itemCount?: number;            // Number of items in group
}

/**
 * Complete group definition including content
 */
export interface GroupDefinition extends GroupMarker {
  content: string;               // Full content between markers
  items: string[];               // Array of item IDs within group
  lineStart: number;             // Starting line number in file
  lineEnd: number;               // Ending line number in file
}

/**
 * Individual knowledge item found outside any group
 */
export interface IndividualItemMarker {
  id: string;
  line: number;
}

/**
 * Result of scanning a file for groups and items
 */
export interface ScanResult {
  groups: GroupDefinition[];              // All groups found
  individualItems: IndividualItemMarker[]; // Items outside any group
  orphanedItems: string[];                // Items with mismatched markers
  totalInjectionCount: number;            // Total segments (groups + individual items)
  warnings: string[];                     // Parse warnings and errors
}

/**
 * Aggregated scan results for multiple files
 */
export interface WorkspaceScanResult {
  results: Map<string, ScanResult>;       // Per-file scan results
  totalFiles: number;                     // Number of files scanned
  totalInjections: number;                // Total injection segments across all files
  filesWithWarnings: string[];            // Files with scan warnings
}

/**
 * Pending change to be applied on focus lost
 */
export interface GroupChange {
  type: 'inject' | 'remove' | 'update';
  groupType: GroupType;
  groupId: string;
  targetFile: string;
  itemIds?: string[];                     // Items to inject (for inject/update)
  metadata?: Partial<GroupMarker>;        // Additional metadata
}

/**
 * Injection status for UI display
 */
export enum InjectionStatus {
  NOT_INJECTED = 'not_injected',         // ⚪ Not injected
  INJECTED = 'injected',                 // ✅ Injected
  PARTIAL = 'partial',                   // 🔵 Partially injected (some items)
  PENDING = 'pending',                   // 🔄 Pending changes not yet saved
  ERROR = 'error'                        // ❌ Injection error
}

/**
 * File status information for UI display
 */
export interface FileInjectionStatus {
  filePath: string;
  totalGroups: number;                   // Number of group injections
  individualItems: number;               // Number of individual item injections
  totalInjections: number;               // Total segments
  warnings: string[];                    // Scan warnings
  lastScanned: Date;                     // Last scan timestamp
}

/**
 * Statistics for template/group matching
 */
export interface MatchStats {
  totalItems: number;                    // Total items in template/group
  matchedItems: number;                  // Items matching current context
  excludedItems: number;                 // Items excluded by context
  matchPercentage: number;               // Percentage matched (0-100)
}

/**
 * Reason why an item was excluded or included
 */
export interface MatchReason {
  itemId: string;
  matched: boolean;
  reasons: string[];                     // Human-readable explanations
  dimensions: {                          // Which dimensions matched/failed
    operator: boolean;
    project: boolean;
    complexity: boolean;
  };
}

/**
 * Preview of what will be injected
 */
export interface InjectionPreview {
  groupType: GroupType;
  groupId: string;
  totalItems: number;
  matchedItems: MatchReason[];           // Items that will be injected
  excludedItems: MatchReason[];          // Items that will be excluded
  markers: {
    start: string;
    end: string;
  };
  estimatedSize: number;                 // Estimated content size in bytes
}

/**
 * Options for group injection
 */
export interface GroupInjectionOptions {
  groupType: GroupType;
  groupId: string;
  itemIds: string[];
  replaceExisting?: boolean;             // Replace if group already exists
  metadata?: Partial<GroupMarker>;       // Additional metadata
  includeAllItems?: boolean;             // Override maturity filtering
}

/**
 * Result of group injection operation
 */
export interface GroupInjectionResult {
  success: boolean;
  groupType?: GroupType;
  groupId?: string;
  itemsInjected?: number;
  itemsExcluded?: number;
  content?: string;                      // Updated file content
  error?: string;                        // Error message if failed
}

/**
 * Options for group removal
 */
export interface GroupRemovalOptions {
  groupType: GroupType;
  groupId: string;
  removeOrphaned?: boolean;              // Also remove orphaned items within group
}

/**
 * Result of group removal operation
 */
export interface GroupRemovalResult {
  success: boolean;
  groupType?: GroupType;
  groupId?: string;
  itemsRemoved?: number;
  content?: string;                      // Updated file content
  error?: string;                        // Error message if failed
}
