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

export interface ModalButton {
    label: string;
    primary?: boolean;
    onClick?: () => void;
}

export interface ModalShowOptions {
    title?: string;
    content: string | HTMLElement;
    buttons?: ModalButton[];
    width?: string;
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
     * Show a custom modal with HTML content
     */
    async show(options: ModalShowOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            this.createOverlay();
            this.createCustomModal(options);
            this.attachEventListeners();
        });
    }

    /**
     * Close the modal programmatically
     */
    close(): void {
        this.resolve?.(undefined);
        this.cleanup();
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
            min-width: 500px;
            max-width: 700px;
            max-height: 80vh;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.2s ease-out;
            display: flex;
            flex-direction: column;
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
            <div style="padding: 16px 20px; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 15px; font-weight: 600; color: var(--vscode-foreground);">
                    ${options.title}
                </div>
                <button id="modal-close-x" type="button" style="background: transparent; border: none; color: var(--vscode-foreground); cursor: pointer; font-size: 20px; line-height: 1; padding: 4px 8px; opacity: 0.7; transition: opacity 0.2s;" title="Close">
                    ✕
                </button>
            </div>
            <div style="flex: 1; overflow-y: auto; padding: 20px;">
                <form id="modal-form">
                    ${fieldsHtml}
                    <div id="modal-form-error" style="color: var(--vscode-errorForeground); font-size: 12px; margin-top: 12px; display: none;"></div>
                </form>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background);">
                <button type="button" id="modal-cancel" style="padding: 6px 14px; background: transparent; border: 1px solid var(--vscode-button-border); color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px;">
                    ${options.cancelText || 'Cancel'}
                </button>
                <button type="button" id="modal-submit" style="padding: 6px 14px; background: var(--vscode-button-background); border: none; color: var(--vscode-button-foreground); border-radius: 2px; cursor: pointer; font-size: 13px; font-weight: 500;">
                    ${options.submitText || 'Create'}
                </button>
            </div>
        `;

        this.overlay?.appendChild(this.modal);

        // Focus first field
        setTimeout(() => {
            const firstField = document.querySelector('#modal-form input, #modal-form textarea, #modal-form select') as HTMLElement;
            firstField?.focus();
        }, 100);

        // Wire up close button
        document.getElementById('modal-close-x')?.addEventListener('click', () => this.cancel());

        // Add hover effect to close button
        const closeBtn = document.getElementById('modal-close-x');
        if (closeBtn) {
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.opacity = '1';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.opacity = '0.7';
            });
        }

        // Wire up submit button
        document.getElementById('modal-submit')?.addEventListener('click', () => {
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
     * Create custom modal with HTML content
     */
    private createCustomModal(options: ModalShowOptions): void {
        this.modal = document.createElement('div');
        this.modal.className = 'modal-dialog modal-custom';

        const width = options.width || '600px';
        this.modal.style.cssText = `
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            min-width: 400px;
            max-width: ${width};
            width: ${width};
            max-height: 85vh;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            animation: slideIn 0.2s ease-out;
            display: flex;
            flex-direction: column;
        `;

        // Create title section if provided
        let titleHtml = '';
        if (options.title) {
            titleHtml = `
                <div style="padding: 16px 20px; border-bottom: 1px solid var(--vscode-panel-border); background: rgba(0, 212, 255, 0.05); display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="font-size: 16px; font-weight: 600; color: var(--vscode-foreground); flex: 1;">
                        ${options.title}
                    </div>
                    <button id="modal-close-x" type="button" style="background: transparent; border: none; color: var(--vscode-foreground); cursor: pointer; font-size: 20px; line-height: 1; padding: 4px 8px; opacity: 0.7; transition: opacity 0.2s; flex-shrink: 0; margin-left: 12px;" title="Close">
                        ✕
                    </button>
                </div>
            `;
        }

        // Create buttons section
        const defaultButtons: ModalButton[] = options.buttons || [{ label: 'Close', primary: false }];
        const buttonsHtml = defaultButtons.map((btn, index) => {
            const isPrimary = btn.primary !== false; // Default to primary for first button
            const buttonStyle = isPrimary
                ? 'padding: 8px 16px; background: var(--vscode-button-background); border: none; color: var(--vscode-button-foreground); border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;'
                : 'padding: 8px 16px; background: transparent; border: 1px solid var(--vscode-button-border); color: var(--vscode-button-foreground); border-radius: 4px; cursor: pointer; font-size: 13px;';

            return `<button class="modal-custom-btn" data-index="${index}" style="${buttonStyle}">${btn.label}</button>`;
        }).join('');

        // Build modal structure
        this.modal.innerHTML = `
            ${titleHtml}
            <div class="modal-custom-content" style="flex: 1; overflow-y: auto; padding: 0;">
                ${typeof options.content === 'string' ? options.content : ''}
            </div>
            ${buttonsHtml ? `
                <div style="display: flex; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--vscode-panel-border); background: rgba(0, 212, 255, 0.03);">
                    ${buttonsHtml}
                </div>
            ` : ''}
        `;

        this.overlay?.appendChild(this.modal);

        // If content is an HTMLElement, append it
        if (typeof options.content !== 'string') {
            const contentContainer = this.modal.querySelector('.modal-custom-content');
            if (contentContainer) {
                contentContainer.innerHTML = '';
                contentContainer.appendChild(options.content);
            }
        }

        // Wire up button clicks
        const btnElements = this.modal.querySelectorAll('.modal-custom-btn');
        btnElements.forEach((btnEl, index) => {
            btnEl.addEventListener('click', () => {
                const button = defaultButtons[index];
                if (button.onClick) {
                    button.onClick();
                }
                // Always close after button click
                this.resolve?.(undefined);
                this.cleanup();
            });
        });

        // Wire up close button (if title is provided)
        const closeBtn = document.getElementById('modal-close-x');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.resolve?.(undefined);
                this.cleanup();
            });

            // Add hover effect
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.opacity = '1';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.opacity = '0.7';
            });
        }
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
