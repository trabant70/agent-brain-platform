/**
 * TemplateOrchestrator
 *
 * Coordinates template operations between project and marketplace scopes.
 * Handles:
 * - Publishing templates from project to marketplace
 * - Installing templates from marketplace to project
 * - Uninstall notifications to sync installation status
 *
 * This orchestrator maintains clean separation between project and marketplace
 * while enabling communication for publish/install/uninstall operations.
 */

import { ProjectTemplateManager } from '@agent-brain/core/domains/knowledge/project/ProjectTemplateManager';
import { MarketplaceTemplateManager, PublishResult } from '@agent-brain/core/domains/knowledge/marketplace/MarketplaceTemplateManager';
import { TemplateInstaller } from '@agent-brain/core/domains/knowledge/TemplateInstaller';
import { TemplateRegistry } from '@agent-brain/core/domains/knowledge/TemplateRegistry';
import { MarketplaceTemplate, TemplateSource } from '@agent-brain/core/domains/knowledge/types';

export interface InstallOptions {
  copyToProject: boolean;  // If true, copy template to .agent-brain/templates/
}

export interface InstallResponse {
  success: boolean;
  localTemplateId?: string;  // If copyToProject=true
  itemsCreated: number;
  itemsUpdated: number;
  error?: string;
}

export interface UninstallResult {
  success: boolean;
  message?: string;
}

/**
 * Orchestrates template operations across project and marketplace scopes
 */
export class TemplateOrchestrator {
  constructor(
    private projectManager: ProjectTemplateManager,
    private marketplaceManager: MarketplaceTemplateManager,
    private templateInstaller: TemplateInstaller,
    private templateRegistry: TemplateRegistry
  ) {}

  // ============================================
  // Publish Operation (Project → Marketplace)
  // ============================================

  /**
   * Publish a template from project to marketplace
   *
   * Flow:
   * 1. Get template from project manager
   * 2. Publish to marketplace (marketplace manager handles version control)
   * 3. Mark as installed in marketplace (since it came from project)
   * 4. Return result
   */
  async publishToMarketplace(templateId: string): Promise<PublishResult> {
    try {
      // 1. Get template from project
      const template = this.projectManager.getTemplate(templateId);
      if (!template) {
        return {
          success: false,
          templateId,
          version: '1.0.0',
          isNewVersion: false,
          error: 'Template not found in project'
        };
      }

      // 2. Publish to marketplace (handles version control)
      const publishResult = await this.marketplaceManager.publishTemplate(template);

      if (!publishResult.success) {
        return publishResult;
      }

      // 3. Mark as installed in marketplace
      // Since template came from project, it's already "installed"
      const itemIds = template.items.map(item => item.id);
      this.marketplaceManager.markAsInstalled(template.id, itemIds);

      // 4. Register in installation registry and persist to disk
      this.templateRegistry.install(
        template.id,
        publishResult.version || '1.0.0',
        TemplateSource.USER,
        itemIds
      );
      await this.templateRegistry.saveRegistry();

      return publishResult;
    } catch (error: any) {
      return {
        success: false,
        templateId,
        version: '1.0.0',
        isNewVersion: false,
        error: `Failed to publish template: ${error.message}`
      };
    }
  }

  // ============================================
  // Install Operation (Marketplace → Project)
  // ============================================

  /**
   * Install a template from marketplace to project
   *
   * Flow:
   * 1. Get template from marketplace
   * 2. Install items via TemplateInstaller
   * 3. Optionally copy to project templates (if copyToProject=true)
   * 4. Mark as installed in marketplace
   * 5. Return result
   */
  async installToProject(
    templateId: string,
    options: InstallOptions = { copyToProject: false }
  ): Promise<InstallResponse> {
    try {
      // 1. Get template from marketplace
      const template = this.marketplaceManager.getTemplate(templateId);
      if (!template) {
        return {
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          error: 'Template not found in marketplace'
        };
      }

      // 2. Install items via TemplateInstaller
      const installResult = await this.templateInstaller.installTemplate(template);

      if (!installResult.success) {
        return {
          success: false,
          itemsCreated: 0,
          itemsUpdated: 0,
          error: installResult.error
        };
      }

      let localTemplateId: string | undefined;

      // 3. Optionally copy to project templates
      if (options.copyToProject) {
        try {
          const itemIds = template.items.map(item => item.id);
          const projectTemplate = await this.projectManager.createTemplate({
            name: template.name,
            description: template.description,
            category: template.category,
            tags: template.tags,
            author: template.author,
            license: template.license,
            itemIds
          });
          localTemplateId = projectTemplate.id;
        } catch (error: any) {
          // Installation succeeded but copying to project failed
          // This is not a critical error, so we continue
          console.error(`Failed to copy template to project: ${error.message}`);
        }
      }

      // 4. Mark as installed in marketplace
      const itemIds = template.items.map(item => item.id);
      this.marketplaceManager.markAsInstalled(templateId, itemIds);

      return {
        success: true,
        localTemplateId,
        itemsCreated: installResult.itemsCreated,
        itemsUpdated: installResult.itemsUpdated
      };
    } catch (error: any) {
      return {
        success: false,
        itemsCreated: 0,
        itemsUpdated: 0,
        error: `Failed to install template: ${error.message}`
      };
    }
  }

  // ============================================
  // Uninstall Notification (Project → Marketplace)
  // ============================================

  /**
   * Notify marketplace that a template was uninstalled from project
   *
   * Flow:
   * 1. Check if template exists in marketplace
   * 2. Mark as uninstalled in marketplace
   * 3. Return result
   *
   * Note: This does NOT delete the template, only updates installation status
   */
  async notifyUninstall(templateId: string): Promise<UninstallResult> {
    try {
      const template = this.marketplaceManager.getTemplate(templateId);

      if (!template) {
        // Template not in marketplace, nothing to do
        return {
          success: true,
          message: 'Template not found in marketplace'
        };
      }

      // Mark as uninstalled in memory
      this.marketplaceManager.markAsUninstalled(templateId);

      // Unregister from installation registry if present
      if (this.templateRegistry.isInstalled(templateId)) {
        this.templateRegistry.uninstall(templateId);
        await this.templateRegistry.saveRegistry();
      }

      return {
        success: true,
        message: 'Installation status updated'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to update installation status: ${error.message}`
      };
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Check if a marketplace template is already in project
   */
  isTemplateInProject(templateId: string): boolean {
    return this.projectManager.getTemplate(templateId) !== undefined;
  }

  /**
   * Check if a project template is published to marketplace
   */
  isTemplatePublished(templateId: string): boolean {
    return this.marketplaceManager.getTemplate(templateId) !== undefined;
  }

  /**
   * Get sync status for a template
   */
  getTemplateSyncStatus(templateId: string): {
    inProject: boolean;
    inMarketplace: boolean;
    isInstalled: boolean;
  } {
    const inProject = this.isTemplateInProject(templateId);
    const inMarketplace = this.isTemplatePublished(templateId);
    const isInstalled = this.marketplaceManager.isInstalled(templateId);

    return {
      inProject,
      inMarketplace,
      isInstalled
    };
  }
}
