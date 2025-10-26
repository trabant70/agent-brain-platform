/**
 * AgentInstructionInjector - Injects threading instructions into multiple locations
 *
 * Multi-channel approach increases likelihood that AI agents will discover
 * and follow threading guidelines by placing instructions in:
 * 1. File headers (key source files)
 * 2. VSCode settings (.vscode/settings.json)
 * 3. Threading config (.threading/AGENT_REQUIREMENTS.md)
 * 4. Package.json metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { MaturityLevel } from '../types';

export interface InjectionConfig {
  workspacePath: string;
  targetLevel: MaturityLevel;
  enableFileHeaders?: boolean;
  enableVSCodeSettings?: boolean;
  enableThreadingConfig?: boolean;
  enablePackageJson?: boolean;
  targetFiles?: string[]; // Specific files for header injection
}

export interface InjectionResult {
  success: boolean;
  injectedLocations: string[];
  errors: string[];
}

export class AgentInstructionInjector {
  private config: InjectionConfig;
  private templatePath: string;

  constructor(config: InjectionConfig) {
    this.config = {
      enableFileHeaders: true,
      enableVSCodeSettings: true,
      enableThreadingConfig: true,
      enablePackageJson: true,
      ...config
    };

    // Resolve template path
    this.templatePath = this.getTemplatePath(config.targetLevel);
  }

  /**
   * Inject instructions into all configured locations
   */
  async inject(): Promise<InjectionResult> {
    const result: InjectionResult = {
      success: true,
      injectedLocations: [],
      errors: []
    };

    try {
      // Load template
      const template = await this.loadTemplate();

      // Inject into each location
      if (this.config.enableFileHeaders) {
        await this.injectFileHeaders(template, result);
      }

      if (this.config.enableVSCodeSettings) {
        await this.injectVSCodeSettings(template, result);
      }

      if (this.config.enableThreadingConfig) {
        await this.injectThreadingConfig(template, result);
      }

      if (this.config.enablePackageJson) {
        await this.injectPackageJson(template, result);
      }

      result.success = result.errors.length === 0;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Failed to inject instructions: ${error.message}`);
    }

    return result;
  }

  /**
   * Remove injected instructions from all locations
   */
  async remove(): Promise<InjectionResult> {
    const result: InjectionResult = {
      success: true,
      injectedLocations: [],
      errors: []
    };

    try {
      if (this.config.enableFileHeaders) {
        await this.removeFileHeaders(result);
      }

      if (this.config.enableVSCodeSettings) {
        await this.removeVSCodeSettings(result);
      }

      if (this.config.enableThreadingConfig) {
        await this.removeThreadingConfig(result);
      }

      if (this.config.enablePackageJson) {
        await this.removePackageJson(result);
      }

      result.success = result.errors.length === 0;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Failed to remove instructions: ${error.message}`);
    }

    return result;
  }

  /**
   * Get template file path for level
   */
  private getTemplatePath(level: MaturityLevel): string {
    const levelNames = {
      [MaturityLevel.OBSERVATION]: 'level-0-observation',
      [MaturityLevel.SEMANTIC]: 'level-1-semantic',
      [MaturityLevel.ANNOTATION]: 'level-2-jsdoc',
      [MaturityLevel.CONDITIONAL]: 'level-3-context',
      [MaturityLevel.DECORATOR]: 'level-4-decorator'
    };

    const templateName = levelNames[level];
    return path.join(__dirname, '..', 'templates', 'levels', `${templateName}.template.md`);
  }

  /**
   * Load template content
   */
  private async loadTemplate(): Promise<string> {
    try {
      return fs.readFileSync(this.templatePath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to load template: ${error.message}`);
    }
  }

  /**
   * Inject instructions as file headers
   */
  private async injectFileHeaders(template: string, result: InjectionResult): Promise<void> {
    const targetFiles = this.config.targetFiles || this.getDefaultTargetFiles();
    const summary = this.extractSummary(template);

    for (const relativePath of targetFiles) {
      try {
        const filePath = path.join(this.config.workspacePath, relativePath);

        if (!fs.existsSync(filePath)) {
          continue; // Skip non-existent files
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Check if already injected
        if (content.includes('<!-- THREADING_INSTRUCTIONS_START -->')) {
          continue; // Already has instructions
        }

        // Determine comment style
        const commentStyle = this.getCommentStyle(filePath);
        const header = this.formatFileHeader(summary, commentStyle);

        // Inject at top of file (after shebang if present)
        const lines = content.split('\n');
        let insertIndex = 0;

        if (lines[0]?.startsWith('#!')) {
          insertIndex = 1; // After shebang
        }

        lines.splice(insertIndex, 0, header, '');
        const newContent = lines.join('\n');

        fs.writeFileSync(filePath, newContent, 'utf-8');
        result.injectedLocations.push(relativePath);
      } catch (error: any) {
        result.errors.push(`Failed to inject header in ${relativePath}: ${error.message}`);
      }
    }
  }

  /**
   * Remove file headers
   */
  private async removeFileHeaders(result: InjectionResult): Promise<void> {
    const targetFiles = this.config.targetFiles || this.getDefaultTargetFiles();

    for (const relativePath of targetFiles) {
      try {
        const filePath = path.join(this.config.workspacePath, relativePath);

        if (!fs.existsSync(filePath)) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Remove section between markers
        const regex = /<!-- THREADING_INSTRUCTIONS_START -->[\s\S]*?<!-- THREADING_INSTRUCTIONS_END -->\n*/g;
        const newContent = content.replace(regex, '');

        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent, 'utf-8');
          result.injectedLocations.push(relativePath);
        }
      } catch (error: any) {
        result.errors.push(`Failed to remove header from ${relativePath}: ${error.message}`);
      }
    }
  }

  /**
   * Inject into VSCode settings
   */
  private async injectVSCodeSettings(template: string, result: InjectionResult): Promise<void> {
    try {
      const settingsPath = path.join(this.config.workspacePath, '.vscode', 'settings.json');

      // Ensure .vscode directory exists
      const vscodeDir = path.dirname(settingsPath);
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }

      // Load or create settings
      let settings: any = {};
      if (fs.existsSync(settingsPath)) {
        const content = fs.readFileSync(settingsPath, 'utf-8');
        settings = JSON.parse(content);
      }

      // Inject threading instructions
      settings['agentBrain.threading.level'] = this.config.targetLevel;
      settings['agentBrain.threading.instructionsUrl'] = this.getInstructionsUrl();
      settings['agentBrain.threading.enabled'] = true;

      // Add comment (in JSON, we use a special key)
      settings['//agentBrain.threading'] = 'Threading system configuration - See .threading/AGENT_REQUIREMENTS.md';

      // Write back
      const prettyJson = JSON.stringify(settings, null, 2);
      fs.writeFileSync(settingsPath, prettyJson, 'utf-8');

      result.injectedLocations.push('.vscode/settings.json');
    } catch (error: any) {
      result.errors.push(`Failed to inject VSCode settings: ${error.message}`);
    }
  }

  /**
   * Remove from VSCode settings
   */
  private async removeVSCodeSettings(result: InjectionResult): Promise<void> {
    try {
      const settingsPath = path.join(this.config.workspacePath, '.vscode', 'settings.json');

      if (!fs.existsSync(settingsPath)) {
        return;
      }

      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);

      // Remove threading keys
      delete settings['agentBrain.threading.level'];
      delete settings['agentBrain.threading.instructionsUrl'];
      delete settings['agentBrain.threading.enabled'];
      delete settings['//agentBrain.threading'];

      const prettyJson = JSON.stringify(settings, null, 2);
      fs.writeFileSync(settingsPath, prettyJson, 'utf-8');

      result.injectedLocations.push('.vscode/settings.json');
    } catch (error: any) {
      result.errors.push(`Failed to remove VSCode settings: ${error.message}`);
    }
  }

  /**
   * Inject into .threading/AGENT_REQUIREMENTS.md
   */
  private async injectThreadingConfig(template: string, result: InjectionResult): Promise<void> {
    try {
      const threadingDir = path.join(this.config.workspacePath, '.threading');
      const configPath = path.join(threadingDir, 'AGENT_REQUIREMENTS.md');

      // Ensure directory exists
      if (!fs.existsSync(threadingDir)) {
        fs.mkdirSync(threadingDir, { recursive: true });
      }

      // Create comprehensive agent instructions
      const agentInstructions = this.generateAgentRequirements(template);

      fs.writeFileSync(configPath, agentInstructions, 'utf-8');
      result.injectedLocations.push('.threading/AGENT_REQUIREMENTS.md');
    } catch (error: any) {
      result.errors.push(`Failed to inject threading config: ${error.message}`);
    }
  }

  /**
   * Remove threading config
   */
  private async removeThreadingConfig(result: InjectionResult): Promise<void> {
    try {
      const configPath = path.join(this.config.workspacePath, '.threading', 'AGENT_REQUIREMENTS.md');

      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        result.injectedLocations.push('.threading/AGENT_REQUIREMENTS.md');
      }
    } catch (error: any) {
      result.errors.push(`Failed to remove threading config: ${error.message}`);
    }
  }

  /**
   * Inject into package.json
   */
  private async injectPackageJson(template: string, result: InjectionResult): Promise<void> {
    try {
      const packagePath = path.join(this.config.workspacePath, 'package.json');

      if (!fs.existsSync(packagePath)) {
        return; // No package.json
      }

      const content = fs.readFileSync(packagePath, 'utf-8');
      const packageJson = JSON.parse(content);

      // Add threading metadata
      packageJson.agentBrain = packageJson.agentBrain || {};
      packageJson.agentBrain.threading = {
        level: this.config.targetLevel,
        enabled: true,
        documentation: '.threading/AGENT_REQUIREMENTS.md'
      };

      const prettyJson = JSON.stringify(packageJson, null, 2);
      fs.writeFileSync(packagePath, prettyJson, 'utf-8');

      result.injectedLocations.push('package.json');
    } catch (error: any) {
      result.errors.push(`Failed to inject package.json: ${error.message}`);
    }
  }

  /**
   * Remove from package.json
   */
  private async removePackageJson(result: InjectionResult): Promise<void> {
    try {
      const packagePath = path.join(this.config.workspacePath, 'package.json');

      if (!fs.existsSync(packagePath)) {
        return;
      }

      const content = fs.readFileSync(packagePath, 'utf-8');
      const packageJson = JSON.parse(content);

      if (packageJson.agentBrain?.threading) {
        delete packageJson.agentBrain.threading;

        // Remove agentBrain if empty
        if (Object.keys(packageJson.agentBrain).length === 0) {
          delete packageJson.agentBrain;
        }

        const prettyJson = JSON.stringify(packageJson, null, 2);
        fs.writeFileSync(packagePath, prettyJson, 'utf-8');

        result.injectedLocations.push('package.json');
      }
    } catch (error: any) {
      result.errors.push(`Failed to remove package.json: ${error.message}`);
    }
  }

  /**
   * Get default files for header injection
   */
  private getDefaultTargetFiles(): string[] {
    return [
      'README.md',
      'CLAUDE.md',
      'src/index.ts',
      'src/index.js',
      'src/main.ts',
      'src/main.js',
      'src/app.ts',
      'src/app.js'
    ];
  }

  /**
   * Determine comment style for file
   */
  private getCommentStyle(filePath: string): 'html' | 'line' | 'block' {
    const ext = path.extname(filePath);

    if (ext === '.md' || ext === '.html' || ext === '.xml') {
      return 'html';
    }

    if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
      return 'block';
    }

    return 'line';
  }

  /**
   * Format file header with appropriate comment style
   */
  private formatFileHeader(summary: string, style: 'html' | 'line' | 'block'): string {
    const marker = '<!-- THREADING_INSTRUCTIONS_START -->';
    const markerEnd = '<!-- THREADING_INSTRUCTIONS_END -->';

    if (style === 'html') {
      return `${marker}\n${summary}\n${markerEnd}`;
    }

    if (style === 'block') {
      const lines = summary.split('\n').map(line => ` * ${line}`).join('\n');
      return `/**\n * THREADING INSTRUCTIONS\n${lines}\n */\n${marker}\n${markerEnd}`;
    }

    // Line comments
    const lines = summary.split('\n').map(line => `// ${line}`).join('\n');
    return `${lines}\n${marker}\n${markerEnd}`;
  }

  /**
   * Extract summary from template
   */
  private extractSummary(template: string): string {
    // Extract objective and approach sections
    const objectiveMatch = template.match(/## Objective\n\n(.*?)\n\n##/s);
    const approachMatch = template.match(/## Approach\n\n(.*?)\n\n##/s);

    let summary = `Threading Level ${this.config.targetLevel}\n\n`;

    if (objectiveMatch) {
      summary += `Objective: ${objectiveMatch[1].trim()}\n\n`;
    }

    if (approachMatch) {
      const approach = approachMatch[1].trim().split('\n').slice(0, 3).join('\n');
      summary += `Approach:\n${approach}\n`;
    }

    summary += `\nSee .threading/AGENT_REQUIREMENTS.md for full details.`;

    return summary;
  }

  /**
   * Generate comprehensive agent requirements document
   */
  private generateAgentRequirements(template: string): string {
    const levelNames = {
      [MaturityLevel.OBSERVATION]: 'Level 0: Observation',
      [MaturityLevel.SEMANTIC]: 'Level 1: Semantic Logging',
      [MaturityLevel.ANNOTATION]: 'Level 2: JSDoc Annotations',
      [MaturityLevel.CONDITIONAL]: 'Level 3: ThreadContext API',
      [MaturityLevel.DECORATOR]: 'Level 4: Full Decorators'
    };

    return `# Agent Threading Requirements

**Project Threading Level**: ${levelNames[this.config.targetLevel]}
**Generated**: ${new Date().toISOString()}

## Instructions for AI Code Assistants

This document provides threading requirements for AI agents (Claude, GitHub Copilot, etc.) working on this codebase.

---

${template}

---

## Quick Reference

### Current Level: ${this.config.targetLevel}

**What to do**: Follow the guidelines in the template above.

**What NOT to do**:
- Don't use threading patterns from other levels
- Don't remove existing threading code
- Don't change thread names without confirmation

### Integration Points

- **VSCode Settings**: See \`.vscode/settings.json\`
- **Package Metadata**: See \`package.json\` → \`agentBrain.threading\`
- **Source Files**: Key files have threading instructions in headers

### Support

For questions about threading system:
1. Read full template above
2. Check existing code for patterns
3. Consult with human developer if unclear

---

*This file is auto-generated by AgentInstructionInjector. Do not edit manually.*
`;
  }

  /**
   * Get URL to instructions (could be remote docs)
   */
  private getInstructionsUrl(): string {
    return './.threading/AGENT_REQUIREMENTS.md';
  }
}
