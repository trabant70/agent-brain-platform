/**
 * ProjectProfileWizard - Multi-step wizard for creating project profiles
 *
 * Guides users through project setup with intelligent defaults
 */

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  fields: WizardField[];
  validate?: (data: Record<string, any>) => { valid: boolean; errors: string[] };
}

export interface WizardField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'textarea' | 'checkbox';
  placeholder?: string;
  options?: { value: string; label: string; description?: string }[];
  required?: boolean;
  defaultValue?: any;
  hint?: string;
}

export interface ProjectProfileData {
  // Step 1: Basic Info
  projectName: string;
  projectType: 'web-app' | 'cli-tool' | 'library' | 'mobile-app' | 'api-service';
  description: string;

  // Step 2: Technology Stack
  primaryLanguage: string;
  framework?: string;
  technologies: string[];

  // Step 3: Development Preferences
  testingFramework?: string;
  codeStyle?: string;
  buildTool?: string;

  // Step 4: Knowledge Preferences
  enabledKnowledgeTypes: string[];
  autoLearnPatterns: boolean;
  trackAchievements: boolean;
}

export class ProjectProfileWizard {
  private container: HTMLElement | null = null;
  private currentStep: number = 0;
  private steps: WizardStep[] = [];
  private formData: Partial<ProjectProfileData> = {};
  private onComplete: ((data: ProjectProfileData) => void) | null = null;

  constructor() {
    this.initializeSteps();
  }

  initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Project profile wizard container not found');
      return;
    }

    container.innerHTML = this.renderHidden();
    this.container = document.getElementById('profile-wizard');
  }

  /**
   * Show wizard and collect profile data
   */
  show(onComplete: (data: ProjectProfileData) => void): void {
    this.onComplete = onComplete;
    this.currentStep = 0;
    this.formData = {};

    if (!this.container) return;

    this.container.innerHTML = this.renderWizard();
    this.container.style.display = 'flex';
    this.attachEventListeners();
    this.updateStepIndicators();
  }

  /**
   * Hide wizard
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  // Private methods

  private initializeSteps(): void {
    this.steps = [
      // Step 1: Basic Information
      {
        id: 'basic-info',
        title: 'Project Basics',
        description: 'Tell us about your project',
        fields: [
          {
            id: 'projectName',
            label: 'Project Name',
            type: 'text',
            placeholder: 'my-awesome-project',
            required: true,
            hint: 'A short, descriptive name for your project'
          },
          {
            id: 'projectType',
            label: 'Project Type',
            type: 'select',
            required: true,
            options: [
              { value: 'web-app', label: 'Web Application', description: 'Frontend or full-stack web app' },
              { value: 'cli-tool', label: 'CLI Tool', description: 'Command-line utility or tool' },
              { value: 'library', label: 'Library/Package', description: 'Reusable code library' },
              { value: 'mobile-app', label: 'Mobile App', description: 'iOS, Android, or cross-platform' },
              { value: 'api-service', label: 'API Service', description: 'Backend API or microservice' }
            ]
          },
          {
            id: 'description',
            label: 'Description',
            type: 'textarea',
            placeholder: 'Brief description of what this project does...',
            hint: 'This helps Agent Brain understand your project context'
          }
        ]
      },

      // Step 2: Technology Stack
      {
        id: 'tech-stack',
        title: 'Technology Stack',
        description: 'What technologies are you using?',
        fields: [
          {
            id: 'primaryLanguage',
            label: 'Primary Language',
            type: 'select',
            required: true,
            options: [
              { value: 'typescript', label: 'TypeScript' },
              { value: 'javascript', label: 'JavaScript' },
              { value: 'python', label: 'Python' },
              { value: 'java', label: 'Java' },
              { value: 'csharp', label: 'C#' },
              { value: 'go', label: 'Go' },
              { value: 'rust', label: 'Rust' },
              { value: 'other', label: 'Other' }
            ]
          },
          {
            id: 'framework',
            label: 'Framework (if any)',
            type: 'select',
            options: [
              { value: 'react', label: 'React' },
              { value: 'vue', label: 'Vue' },
              { value: 'angular', label: 'Angular' },
              { value: 'next', label: 'Next.js' },
              { value: 'express', label: 'Express' },
              { value: 'django', label: 'Django' },
              { value: 'flask', label: 'Flask' },
              { value: 'spring', label: 'Spring' },
              { value: 'none', label: 'None' }
            ]
          },
          {
            id: 'technologies',
            label: 'Additional Technologies',
            type: 'multiselect',
            hint: 'Select all that apply',
            options: [
              { value: 'webpack', label: 'Webpack' },
              { value: 'vite', label: 'Vite' },
              { value: 'docker', label: 'Docker' },
              { value: 'kubernetes', label: 'Kubernetes' },
              { value: 'graphql', label: 'GraphQL' },
              { value: 'rest', label: 'REST API' },
              { value: 'sql', label: 'SQL Database' },
              { value: 'nosql', label: 'NoSQL Database' }
            ]
          }
        ]
      },

      // Step 3: Development Preferences
      {
        id: 'dev-preferences',
        title: 'Development Preferences',
        description: 'How do you like to work?',
        fields: [
          {
            id: 'testingFramework',
            label: 'Testing Framework',
            type: 'select',
            options: [
              { value: 'jest', label: 'Jest' },
              { value: 'mocha', label: 'Mocha' },
              { value: 'pytest', label: 'Pytest' },
              { value: 'junit', label: 'JUnit' },
              { value: 'none', label: 'No testing framework' }
            ]
          },
          {
            id: 'codeStyle',
            label: 'Code Style',
            type: 'select',
            options: [
              { value: 'eslint', label: 'ESLint' },
              { value: 'prettier', label: 'Prettier' },
              { value: 'standardjs', label: 'StandardJS' },
              { value: 'custom', label: 'Custom style guide' },
              { value: 'none', label: 'No preference' }
            ]
          },
          {
            id: 'buildTool',
            label: 'Build Tool',
            type: 'select',
            options: [
              { value: 'npm', label: 'npm scripts' },
              { value: 'webpack', label: 'Webpack' },
              { value: 'vite', label: 'Vite' },
              { value: 'rollup', label: 'Rollup' },
              { value: 'gradle', label: 'Gradle' },
              { value: 'maven', label: 'Maven' },
              { value: 'make', label: 'Make' }
            ]
          }
        ]
      },

      // Step 4: Knowledge & Features
      {
        id: 'knowledge-features',
        title: 'Knowledge & Features',
        description: 'Configure Agent Brain features',
        fields: [
          {
            id: 'enabledKnowledgeTypes',
            label: 'Enable Knowledge Types',
            type: 'multiselect',
            hint: 'Agent Brain will learn from these types of information',
            defaultValue: ['patterns', 'adrs', 'learnings'],
            options: [
              { value: 'patterns', label: 'Code Patterns', description: 'Common code patterns in your project' },
              { value: 'adrs', label: 'Architecture Decisions', description: 'Record important technical decisions' },
              { value: 'learnings', label: 'Session Learnings', description: 'Learn from successful sessions' }
            ]
          },
          {
            id: 'autoLearnPatterns',
            label: 'Auto-learn from successful sessions',
            type: 'checkbox',
            defaultValue: true,
            hint: 'Agent Brain will automatically detect and learn success patterns'
          },
          {
            id: 'trackAchievements',
            label: 'Enable achievement tracking',
            type: 'checkbox',
            defaultValue: true,
            hint: 'Track your progress and unlock achievements'
          }
        ]
      }
    ];
  }

  private renderHidden(): string {
    return `<div id="profile-wizard" class="profile-wizard" style="display:none;"></div>`;
  }

  private renderWizard(): string {
    return `
      <div class="wizard-overlay"></div>
      <div class="wizard-container">
        <div class="wizard-header">
          <h2>🚀 Project Profile Setup</h2>
          <button class="wizard-close" id="wizard-close">×</button>
        </div>

        <div class="wizard-progress">
          ${this.renderStepIndicators()}
        </div>

        <div class="wizard-content">
          ${this.renderCurrentStep()}
        </div>

        <div class="wizard-footer">
          <button class="wizard-btn wizard-btn-secondary" id="wizard-back" ${this.currentStep === 0 ? 'disabled' : ''}>
            ← Back
          </button>
          <div class="wizard-step-info">
            Step ${this.currentStep + 1} of ${this.steps.length}
          </div>
          <button class="wizard-btn wizard-btn-primary" id="wizard-next">
            ${this.currentStep === this.steps.length - 1 ? '✓ Finish' : 'Next →'}
          </button>
        </div>
      </div>
    `;
  }

  private renderStepIndicators(): string {
    return this.steps.map((step, index) => {
      const status = index < this.currentStep ? 'completed' : index === this.currentStep ? 'active' : 'pending';
      return `
        <div class="step-indicator ${status}">
          <div class="step-number">${index < this.currentStep ? '✓' : index + 1}</div>
          <div class="step-label">${step.title}</div>
        </div>
      `;
    }).join('');
  }

  private renderCurrentStep(): string {
    const step = this.steps[this.currentStep];
    return `
      <div class="wizard-step">
        <h3 class="step-title">${step.title}</h3>
        <p class="step-description">${step.description}</p>
        <form class="wizard-form" id="wizard-form">
          ${step.fields.map(field => this.renderField(field)).join('')}
        </form>
      </div>
    `;
  }

  private renderField(field: WizardField): string {
    const value = this.formData[field.id as keyof ProjectProfileData] || field.defaultValue || '';
    const requiredMark = field.required ? '<span class="required">*</span>' : '';

    switch (field.type) {
      case 'text':
        return `
          <div class="form-field">
            <label for="${field.id}">${field.label}${requiredMark}</label>
            <input type="text" id="${field.id}" name="${field.id}"
                   placeholder="${field.placeholder || ''}"
                   value="${value}"
                   ${field.required ? 'required' : ''}>
            ${field.hint ? `<div class="field-hint">${field.hint}</div>` : ''}
          </div>
        `;

      case 'textarea':
        return `
          <div class="form-field">
            <label for="${field.id}">${field.label}${requiredMark}</label>
            <textarea id="${field.id}" name="${field.id}"
                      placeholder="${field.placeholder || ''}"
                      rows="4"
                      ${field.required ? 'required' : ''}>${value}</textarea>
            ${field.hint ? `<div class="field-hint">${field.hint}</div>` : ''}
          </div>
        `;

      case 'select':
        return `
          <div class="form-field">
            <label for="${field.id}">${field.label}${requiredMark}</label>
            <select id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>
              <option value="">Select...</option>
              ${field.options?.map(opt => `
                <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>
                  ${opt.label}
                </option>
              `).join('') || ''}
            </select>
            ${field.hint ? `<div class="field-hint">${field.hint}</div>` : ''}
          </div>
        `;

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return `
          <div class="form-field">
            <label>${field.label}${requiredMark}</label>
            <div class="multiselect-options">
              ${field.options?.map(opt => `
                <label class="checkbox-option">
                  <input type="checkbox" name="${field.id}" value="${opt.value}"
                         ${selectedValues.includes(opt.value) ? 'checked' : ''}>
                  <span class="option-content">
                    <span class="option-label">${opt.label}</span>
                    ${opt.description ? `<span class="option-description">${opt.description}</span>` : ''}
                  </span>
                </label>
              `).join('') || ''}
            </div>
            ${field.hint ? `<div class="field-hint">${field.hint}</div>` : ''}
          </div>
        `;

      case 'checkbox':
        return `
          <div class="form-field">
            <label class="checkbox-label">
              <input type="checkbox" id="${field.id}" name="${field.id}"
                     ${value ? 'checked' : ''}>
              <span>${field.label}</span>
            </label>
            ${field.hint ? `<div class="field-hint">${field.hint}</div>` : ''}
          </div>
        `;

      default:
        return '';
    }
  }

  private attachEventListeners(): void {
    // Close button
    document.getElementById('wizard-close')?.addEventListener('click', () => {
      this.hide();
    });

    // Back button
    document.getElementById('wizard-back')?.addEventListener('click', () => {
      this.previousStep();
    });

    // Next/Finish button
    document.getElementById('wizard-next')?.addEventListener('click', () => {
      if (this.validateCurrentStep()) {
        this.collectCurrentStepData();
        if (this.currentStep === this.steps.length - 1) {
          this.finish();
        } else {
          this.nextStep();
        }
      }
    });

    // Close on overlay click
    this.container?.querySelector('.wizard-overlay')?.addEventListener('click', () => {
      this.hide();
    });
  }

  private validateCurrentStep(): boolean {
    const step = this.steps[this.currentStep];
    const form = document.getElementById('wizard-form') as HTMLFormElement;

    if (!form) return false;

    // Basic HTML5 validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }

    // Custom validation if provided
    if (step.validate) {
      const formData = this.getFormData();
      const result = step.validate(formData);
      if (!result.valid) {
        alert(result.errors.join('\n'));
        return false;
      }
    }

    return true;
  }

  private collectCurrentStepData(): void {
    const formData = this.getFormData();
    this.formData = { ...this.formData, ...formData };
  }

  private getFormData(): Record<string, any> {
    const form = document.getElementById('wizard-form') as HTMLFormElement;
    if (!form) return {};

    const data: Record<string, any> = {};
    const step = this.steps[this.currentStep];

    // Collect data for each field
    step.fields.forEach(field => {
      if (field.type === 'multiselect') {
        // Get all checked checkboxes for this field
        const checkboxes = form.querySelectorAll(`input[name="${field.id}"]:checked`);
        data[field.id] = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value);
      } else if (field.type === 'checkbox') {
        const checkbox = form.querySelector(`input[name="${field.id}"]`) as HTMLInputElement;
        data[field.id] = checkbox ? checkbox.checked : false;
      } else {
        const input = form.querySelector(`[name="${field.id}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        data[field.id] = input ? input.value : '';
      }
    });

    return data;
  }

  private nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.updateWizard();
    }
  }

  private previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateWizard();
    }
  }

  private updateWizard(): void {
    if (!this.container) return;

    // Update content
    const content = this.container.querySelector('.wizard-content');
    if (content) {
      content.innerHTML = this.renderCurrentStep();
    }

    // Update progress indicators
    this.updateStepIndicators();

    // Update footer buttons
    const backBtn = document.getElementById('wizard-back') as HTMLButtonElement;
    const nextBtn = document.getElementById('wizard-next') as HTMLButtonElement;

    if (backBtn) {
      backBtn.disabled = this.currentStep === 0;
    }

    if (nextBtn) {
      nextBtn.textContent = this.currentStep === this.steps.length - 1 ? '✓ Finish' : 'Next →';
    }

    // Re-attach event listeners
    this.attachEventListeners();
  }

  private updateStepIndicators(): void {
    const progress = this.container?.querySelector('.wizard-progress');
    if (progress) {
      progress.innerHTML = this.renderStepIndicators();
    }
  }

  private finish(): void {
    if (this.onComplete) {
      this.onComplete(this.formData as ProjectProfileData);
    }
    this.hide();
  }
}
