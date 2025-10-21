/**
 * ModalDialog - Reusable modal dialog component for webview
 *
 * Replaces browser prompt() and alert() with proper HTML modals
 * that work in sandboxed VS Code webviews.
 *
 * Features:
 * - Promise-based API (async/await support)
 * - Simple text prompts
 * - Multi-field forms
 * - Validation support
 * - ESC key and click-outside to close
 * - No dependencies on browser APIs that are blocked in webview
 */

export interface ModalPromptOptions {
    required?: boolean;
    placeholder?: string;
    multiline?: boolean;
    defaultValue?: string;
}

export interface ModalFormField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'number';
    required?: boolean;
    placeholder?: string;
    options?: string[];  // For select type
    defaultValue?: string | number;
}

export interface ModalFormOptions {
    title: string;
    fields: ModalFormField[];
    submitText?: string;
    cancelText?: string;
}

export class ModalDialog {
    private overlay: HTMLElement | null = null;
    private modal: HTMLElement | null = null;
    private resolve: ((value: any) => void) | null = null;
    private reject: ((reason?: any) => void) | null = null;

    constructor() {
        // Ensure only one modal at a time
        this.cleanup();
    }

    /**
     * Show a simple text prompt (replaces browser prompt())
     */
    async prompt(message: string, options: ModalPromptOptions = {}): Promise<string | null> {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            this.createOverlay();
            this.createModal(message, options);
            this.attachEventListeners();
        });
    }

    /**
     * Show a multi-field form
     */
    async showForm(options: ModalFormOptions): Promise<Record<string, any> | null> {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            this.createOverlay();
            this.createFormModal(options);
            this.attachEventListeners();
        });
    }

    /**
     * Show a simple alert (replaces browser alert())
     */
    async alert(message: string, title: string = 'Alert'): Promise<void> {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            this.createOverlay();
            this.createAlertModal(title, message);
            this.attachEventListeners();
        });
    }

    /**
     * Show a confirmation dialog (replaces browser confirm())
     */
    async confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            this.createOverlay();
            this.createConfirmModal(title, message);
            this.attachEventListeners();
        });
    }

    /**
     * Create overlay backdrop
     */
    private createOverlay(): void {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-in-out;
        `;
        document.body.appendChild(this.overlay);

        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.cancel();
            }
        });
    }

    /**
     * Create simple prompt modal
     */
    private createModal(message: string, options: ModalPromptOptions): void {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-dialog';
        this.modal.style.cssText = `
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            min-width: 400px;
            max-width: 600px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.2s ease-out;
        `;

        const inputType = options.multiline ? 'textarea' : 'input';
        const inputElement = options.multiline
            ? `<textarea id="modal-input" rows="4" style="width: 100%; padding: 8px; font-family: inherit; font-size: 13px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 2px; resize: vertical;" placeholder="${options.placeholder || ''}">${options.defaultValue || ''}</textarea>`
            : `<input type="text" id="modal-input" style="width: 100%; padding: 8px; font-family: inherit; font-size: 13px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 2px;" placeholder="${options.placeholder || ''}" value="${options.defaultValue || ''}">`;

        this.modal.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--vscode-foreground);">
                    ${message}
                </div>
                ${inputElement}
                ${options.required ? '<div id="modal-error" style="color: var(--vscode-errorForeground); font-size: 12px; margin-top: 4px; display: none;">This field is required</div>' : ''}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button id="modal-cancel" style="padding: 6px 14px; background: transparent; border: 1px solid var(--vscode-button-border); color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px;">
                    Cancel
                </button>
                <button id="modal-submit" style="padding: 6px 14px; background: var(--vscode-button-background); border: none; color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px; font-weight: 500;">
                    OK
                </button>
            </div>
        `;

        this.overlay?.appendChild(this.modal);

        // Focus input
        setTimeout(() => {
            const input = document.getElementById('modal-input') as HTMLInputElement | HTMLTextAreaElement;
            input?.focus();
            if (!options.multiline && input) {
                (input as HTMLInputElement).select();
            }
        }, 100);

        // Wire up buttons
        document.getElementById('modal-cancel')?.addEventListener('click', () => this.cancel());
        document.getElementById('modal-submit')?.addEventListener('click', () => this.submit(options.required || false));

        // Enter key submits (for single-line input)
        if (!options.multiline) {
            document.getElementById('modal-input')?.addEventListener('keypress', (e) => {
                if ((e as KeyboardEvent).key === 'Enter') {
                    this.submit(options.required || false);
                }
            });
        }
    }

    /**
     * Create form modal
     */
    private createFormModal(options: ModalFormOptions): void {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-dialog';
        this.modal.style.cssText = `
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            min-width: 500px;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(--0, 0, 0, 0.3);
            animation: slideIn 0.2s ease-out;
        `;

        const fieldsHtml = options.fields.map(field => {
            const fieldId = `modal-field-${field.name}`;
            let inputHtml = '';

            switch (field.type) {
                case 'textarea':
                    inputHtml = `<textarea id="${fieldId}" name="${field.name}" rows="4" style="width: 100%; padding: 8px; font-family: inherit; font-size: 13px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 2px; resize: vertical;" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${field.defaultValue || ''}</textarea>`;
                    break;
                case 'select':
                    const optionsHtml = (field.options || []).map(opt =>
                        `<option value="${opt}" ${field.defaultValue === opt ? 'selected' : ''}>${opt}</option>`
                    ).join('');
                    inputHtml = `<select id="${fieldId}" name="${field.name}" style="width: 100%; padding: 8px; font-family: inherit; font-size: 13px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 2px;" ${field.required ? 'required' : ''}>${optionsHtml}</select>`;
                    break;
                case 'number':
                    inputHtml = `<input type="number" id="${fieldId}" name="${field.name}" style="width: 100%; padding: 8px; font-family: inherit; font-size: 13px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 2px;" placeholder="${field.placeholder || ''}" value="${field.defaultValue || ''}" ${field.required ? 'required' : ''}>`;
                    break;
                default: // text
                    inputHtml = `<input type="text" id="${fieldId}" name="${field.name}" style="width: 100%; padding: 8px; font-family: inherit; font-size: 13px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 2px;" placeholder="${field.placeholder || ''}" value="${field.defaultValue || ''}" ${field.required ? 'required' : ''}>`;
            }

            return `
                <div style="margin-bottom: 16px;">
                    <label for="${fieldId}" style="display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: var(--vscode-foreground);">
                        ${field.label}${field.required ? ' <span style="color: var(--vscode-errorForeground);">*</span>' : ''}
                    </label>
                    ${inputHtml}
                </div>
            `;
        }).join('');

        this.modal.innerHTML = `
            <div style="font-size: 15px; font-weight: 600; margin-bottom: 16px; color: var(--vscode-foreground);">
                ${options.title}
            </div>
            <form id="modal-form">
                ${fieldsHtml}
                <div id="modal-form-error" style="color: var(--vscode-errorForeground); font-size: 12px; margin-bottom: 12px; display: none;"></div>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
                    <button type="button" id="modal-cancel" style="padding: 6px 14px; background: transparent; border: 1px solid var(--vscode-button-border); color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px;">
                        ${options.cancelText || 'Cancel'}
                    </button>
                    <button type="submit" id="modal-submit" style="padding: 6px 14px; background: var(--vscode-button-background); border: none; color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px; font-weight: 500;">
                        ${options.submitText || 'Create'}
                    </button>
                </div>
            </form>
        `;

        this.overlay?.appendChild(this.modal);

        // Focus first field
        setTimeout(() => {
            const firstField = document.querySelector('#modal-form input, #modal-form textarea, #modal-form select') as HTMLElement;
            firstField?.focus();
        }, 100);

        // Wire up form submission
        document.getElementById('modal-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm(options.fields);
        });

        document.getElementById('modal-cancel')?.addEventListener('click', () => this.cancel());
    }

    /**
     * Create alert modal
     */
    private createAlertModal(title: string, message: string): void {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-dialog';
        this.modal.style.cssText = `
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            min-width: 400px;
            max-width: 600px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.2s ease-out;
        `;

        this.modal.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: var(--vscode-foreground);">
                    ${title}
                </div>
                <div style="font-size: 13px; color: var(--vscode-foreground);">
                    ${message}
                </div>
            </div>
            <div style="display: flex; justify-content: flex-end;">
                <button id="modal-ok" style="padding: 6px 14px; background: var(--vscode-button-background); border: none; color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px; font-weight: 500;">
                    OK
                </button>
            </div>
        `;

        this.overlay?.appendChild(this.modal);

        // Focus OK button
        setTimeout(() => {
            document.getElementById('modal-ok')?.focus();
        }, 100);

        // Wire up button
        document.getElementById('modal-ok')?.addEventListener('click', () => {
            this.resolve?.(undefined);
            this.cleanup();
        });
    }

    /**
     * Create confirm modal
     */
    private createConfirmModal(title: string, message: string): void {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-dialog';
        this.modal.style.cssText = `
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            min-width: 400px;
            max-width: 600px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.2s ease-out;
        `;

        this.modal.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: var(--vscode-foreground);">
                    ${title}
                </div>
                <div style="font-size: 13px; color: var(--vscode-foreground);">
                    ${message}
                </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button id="modal-cancel" style="padding: 6px 14px; background: transparent; border: 1px solid var(--vscode-button-border); color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px;">
                    Cancel
                </button>
                <button id="modal-ok" style="padding: 6px 14px; background: var(--vscode-button-background); border: none; color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px; font-weight: 500;">
                    OK
                </button>
            </div>
        `;

        this.overlay?.appendChild(this.modal);

        // Focus OK button
        setTimeout(() => {
            document.getElementById('modal-ok')?.focus();
        }, 100);

        // Wire up buttons
        document.getElementById('modal-ok')?.addEventListener('click', () => {
            this.resolve?.(true);
            this.cleanup();
        });

        document.getElementById('modal-cancel')?.addEventListener('click', () => {
            this.resolve?.(false);
            this.cleanup();
        });
    }

    /**
     * Attach event listeners
     */
    private attachEventListeners(): void {
        // ESC key closes modal
        document.addEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Handle keyboard events
     */
    private handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            this.cancel();
        }
    };

    /**
     * Submit simple prompt
     */
    private submit(required: boolean): void {
        const input = document.getElementById('modal-input') as HTMLInputElement | HTMLTextAreaElement;
        const value = input?.value.trim() || '';

        if (required && !value) {
            // Show error
            const error = document.getElementById('modal-error');
            if (error) {
                error.style.display = 'block';
                input?.focus();
            }
            return;
        }

        this.resolve?.(value || null);
        this.cleanup();
    }

    /**
     * Submit form
     */
    private submitForm(fields: ModalFormField[]): void {
        const formData: Record<string, any> = {};
        let hasErrors = false;
        const errorMessages: string[] = [];

        fields.forEach(field => {
            const input = document.getElementById(`modal-field-${field.name}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            const value = input?.value.trim() || '';

            if (field.required && !value) {
                hasErrors = true;
                errorMessages.push(`${field.label} is required`);
            } else {
                formData[field.name] = field.type === 'number' ? parseFloat(value) : value;
            }
        });

        if (hasErrors) {
            const errorDiv = document.getElementById('modal-form-error');
            if (errorDiv) {
                errorDiv.textContent = errorMessages.join(', ');
                errorDiv.style.display = 'block';
            }
            return;
        }

        this.resolve?.(formData);
        this.cleanup();
    }

    /**
     * Cancel modal
     */
    private cancel(): void {
        this.resolve?.(null);
        this.cleanup();
    }

    /**
     * Clean up modal and overlay
     */
    private cleanup(): void {
        document.removeEventListener('keydown', this.handleKeyDown);

        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        this.modal = null;
        this.resolve = null;
        this.reject = null;
    }
}

// Add animations via CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideIn {
        from {
            transform: translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
