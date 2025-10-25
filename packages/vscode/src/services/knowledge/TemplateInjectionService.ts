/**
 * TemplateInjectionService
 *
 * Handles template injection and removal from files (e.g., CLAUDE.md).
 * Responsible for:
 * - Injecting full templates into files
 * - Injecting individual items into files
 * - Removing templates from files
 * - Recording injection metadata
 */

import * as vscode from 'vscode';
import { TemplateStore, TemplateEngine } from '@agent-brain/core/domains/knowledge';
import { logger, LogCategory, LogPathway } from '@agent-brain/core/infrastructure/logging/Logger';

export class TemplateInjectionService {
  constructor(
    private templateStore: TemplateStore,
    private templateEngine: TemplateEngine
  ) {}

  /**
   * Inject full template to a file (e.g., CLAUDE.md)
   */
  async injectTemplate(templateId: string, targetFilePath: string): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    if (!template.items || template.items.length === 0) {
      throw new Error(`Template "${template.name}" has no items to inject`);
    }

    // Read current file content
    const fileUri = vscode.Uri.file(targetFilePath);
    let currentContent: string;
    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      currentContent = Buffer.from(contentBytes).toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Prepare template content with all items
    const templateMarker = `template-${templateId}`;
    let templateContent = `\n<!-- AGENT-BRAIN:${templateMarker}:START -->\n`;
    templateContent += `<!-- Template: ${template.name} (${template.items.length} items) -->\n\n`;

    for (const item of template.items) {
      const itemMarker = `item-${item.id}`;
      templateContent += `<!-- AGENT-BRAIN:${itemMarker}:START -->\n`;
      templateContent += `${item.body}\n`;
      templateContent += `<!-- AGENT-BRAIN:${itemMarker}:END -->\n\n`;
    }

    templateContent += `<!-- AGENT-BRAIN:${templateMarker}:END -->\n`;

    // Check if template is already injected
    if (currentContent.includes(`<!-- AGENT-BRAIN:${templateMarker}:START -->`)) {
      throw new Error(`Template "${template.name}" is already injected in ${targetFilePath}`);
    }

    // Append template to file
    const updatedContent = currentContent + templateContent;

    // Write updated content back to file
    try {
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(updatedContent, 'utf8')
      );
    } catch (error) {
      throw new Error(`Failed to write to file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Record injection for all items
    this.templateStore.recordTemplateInjection(templateId, targetFilePath, 'user');

    logger.info(
      LogCategory.EXTENSION,
      'Injected template',
      'TemplateInjectionService.injectTemplate',
      { templateId, targetFilePath, itemCount: template.items.length },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Inject single item to a file (e.g., CLAUDE.md)
   */
  async injectItem(templateId: string, itemId: string, targetFilePath: string): Promise<void> {
    const template = this.templateStore.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const item = template.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found in template ${templateId}`);
    }

    // Read current file content
    const fileUri = vscode.Uri.file(targetFilePath);
    let currentContent: string;
    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      currentContent = Buffer.from(contentBytes).toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Prepare item content with markers
    const itemMarker = `item-${itemId}`;
    let itemContent = `\n<!-- AGENT-BRAIN:${itemMarker}:START -->\n`;
    itemContent += `<!-- Item: ${item.title} -->\n`;
    itemContent += `${item.body}\n`;
    itemContent += `<!-- AGENT-BRAIN:${itemMarker}:END -->\n`;

    // Check if item is already injected
    if (currentContent.includes(`<!-- AGENT-BRAIN:${itemMarker}:START -->`)) {
      throw new Error(`Item "${item.title}" is already injected in ${targetFilePath}`);
    }

    // Append item to file
    const updatedContent = currentContent + itemContent;

    // Write updated content back to file
    try {
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(updatedContent, 'utf8')
      );
    } catch (error) {
      throw new Error(`Failed to write to file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Record injection
    this.templateStore.recordItemInjection(itemId, targetFilePath, 'item', templateId, 'user');

    logger.info(
      LogCategory.EXTENSION,
      'Injected item',
      'TemplateInjectionService.injectItem',
      { templateId, itemId, targetFilePath, itemTitle: item.title },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }

  /**
   * Remove template from a file (e.g., CLAUDE.md)
   */
  async removeTemplate(templateId: string, targetFilePath: string): Promise<void> {
    logger.info(
      LogCategory.EXTENSION,
      'Removing template',
      'TemplateInjectionService.removeTemplate',
      { templateId, targetFilePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );

    // Read current file content
    const fileUri = vscode.Uri.file(targetFilePath);
    let currentContent: string;
    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      currentContent = Buffer.from(contentBytes).toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Use TemplateEngine to remove the template section
    // templateId already includes "template-" prefix (e.g., "template-bundled.agent-brain-base")
    const result = this.templateEngine.removeTemplate(currentContent, templateId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to remove template');
    }

    // Write updated content back to file
    try {
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(result.content!, 'utf8')
      );
    } catch (error) {
      throw new Error(`Failed to write to file ${targetFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    logger.info(
      LogCategory.EXTENSION,
      'Removed template',
      'TemplateInjectionService.removeTemplate',
      { templateId, targetFilePath },
      LogPathway.KNOWLEDGE_MANAGEMENT
    );
  }
}
