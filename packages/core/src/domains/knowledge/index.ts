/**
 * Knowledge Domain - Public API
 *
 * Exports all public types and classes for the knowledge management system
 */

// Types
export * from './types';

// Core classes
export { KnowledgeStore } from './KnowledgeStore';
export { KnowledgeFileSystem } from './KnowledgeFileSystem';
export { TemplateEngine } from './TemplateEngine';

// Template Management (V1)
export { TemplateRegistry } from './TemplateRegistry';
export { TemplateInstaller } from './TemplateInstaller';

// Template Validation (Security)
export * from './validation';

// V1 Template Sections
export { AuditLogger } from './AuditLogger';
export type { CreateAuditEntryParams, AuditLogQueryOptions, AuditLogStatistics } from './AuditLogger';

export { TemplateStore } from './TemplateStore';
export type {
  CreateTemplateOptions,
  UpdateTemplateOptions,
  CreateItemOptions,
  UpdateItemOptions,
  MoveItemResult,
  CopyItemResult
} from './TemplateStore';

export { VersionManager } from './VersionManager';
export type {
  CreateVersionOptions,
  VersionDiff,
  RestoreResult,
  VersionStatistics
} from './VersionManager';

export { TemplateCloner } from './TemplateCloner';
export type {
  CloneTemplateOptions,
  CloneResult,
  CloneMetadata
} from './TemplateCloner';

// 3D Maturity-Based Filtering
export { MaturitySelector } from './MaturitySelector';
export { MaturityConfigManager } from './MaturityConfigManager';
export { FramingTemplates } from './FramingTemplates';
export type { FramingTemplate } from './FramingTemplates';
