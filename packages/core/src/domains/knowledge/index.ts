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

// Marketplace (Phase 1-2)
export { MarketplaceManager } from './MarketplaceManager';
export { TemplateRegistry } from './TemplateRegistry';
export { TemplateInstaller } from './TemplateInstaller';
