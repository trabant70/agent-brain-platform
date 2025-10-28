/**
 * Store for managing prompt templates
 */

import type { AIPromptTemplate, MaturityLevel } from '../types';
import { PROMPT_TEMPLATES } from './PromptTemplates';

/**
 * Manages prompt templates with add/remove/update capabilities
 */
export class PromptTemplateStore {
  private templates: Map<string, AIPromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.loadDefaultTemplates();
  }

  /**
   * Load default templates
   */
  private loadDefaultTemplates(): void {
    PROMPT_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): AIPromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get template by category and maturity level
   */
  getTemplateFor(
    categoryId: string,
    maturityLevel: MaturityLevel
  ): AIPromptTemplate | undefined {
    return Array.from(this.templates.values()).find(
      t => t.categoryId === categoryId && t.maturityLevel === maturityLevel
    );
  }

  /**
   * Get all templates for a category
   */
  getCategoryTemplates(categoryId: string): AIPromptTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.categoryId === categoryId
    );
  }

  /**
   * Get all templates for a maturity level
   */
  getMaturityLevelTemplates(maturityLevel: MaturityLevel): AIPromptTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.maturityLevel === maturityLevel
    );
  }

  /**
   * Add or update template
   */
  setTemplate(template: AIPromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove template
   */
  removeTemplate(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): AIPromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Clear all templates
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * Reset to default templates
   */
  reset(): void {
    this.clear();
    this.loadDefaultTemplates();
  }
}
