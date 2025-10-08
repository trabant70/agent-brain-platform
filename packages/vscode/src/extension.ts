import * as vscode from 'vscode';
import * as path from 'path';
import { TimelineProvider } from './providers/timeline-provider-webpack';
import { WelcomeViewProvider } from './providers/WelcomeViewProvider';
import { logger, LogCategory, createContextLogger } from '@agent-brain/core/infrastructure/logging/Logger';
import { ADRSystem, FileADRStorage, ADRStatus } from '@agent-brain/core/domains/intelligence';
import { KnowledgeSystem } from '@agent-brain/core/domains/knowledge';
import { PatternSystem, FilePatternStorage } from '@agent-brain/core/domains/knowledge/patterns';
import { LearningSystem, MemoryLearningStorage } from '@agent-brain/core/domains/knowledge/learning';
import { createSessionManager } from '@agent-brain/core/domains/sessions';
import { PromptCommand, EndSessionCommand, ShowStatusCommand, registerSetupProjectProfileCommand, AddContextRuleCommand, ImportPackageCommand, ExportPackageCommand } from './commands';
import { PromptEnhancer } from './prompt';
import { FileSystemAdapter } from './adapters';
import { GuidanceEngine } from '@agent-brain/core/domains/guidance/GuidanceEngine';
import { KnowledgeTreeProvider } from './providers/KnowledgeTreeProvider';
import { ProjectProfileManager } from '@agent-brain/core/domains/knowledge/ProjectProfileManager';

let timelineProvider: TimelineProvider | null = null;
const log = createContextLogger(LogCategory.EXTENSION);

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Repository Timeline');

    log.info(LogCategory.EXTENSION, 'Starting extension activation');
    outputChannel.appendLine('🚀 Activating Repository Timeline Extension...');

    try {
        // Determine storage location for intelligence data
        const storagePath = getStoragePath(context);
        log.info(LogCategory.EXTENSION, `Intelligence storage: ${storagePath}`, 'activate');
        outputChannel.appendLine(`📂 Intelligence storage: ${storagePath}`);
        // Register the welcome view for the activity bar sidebar
        log.debug(LogCategory.EXTENSION, 'Creating welcome view provider', 'registration');
        outputChannel.appendLine('👋 Creating welcome view provider for activity bar...');

        const welcomeProvider = new WelcomeViewProvider(context.extensionUri);
        const welcomeView = vscode.window.registerWebviewViewProvider(
            WelcomeViewProvider.viewType,
            welcomeProvider
        );
        context.subscriptions.push(welcomeView);

        log.info(LogCategory.EXTENSION, 'Welcome view provider registered successfully');
        outputChannel.appendLine('✅ Welcome view provider registered');

        // Register the timeline provider for the bottom panel
        log.debug(LogCategory.EXTENSION, 'Creating timeline webview provider', 'registration');
        outputChannel.appendLine('📊 Creating timeline webview provider...');

        timelineProvider = new TimelineProvider(context.extensionUri, storagePath);
        const timelineView = vscode.window.registerWebviewViewProvider(
            TimelineProvider.viewType,
            timelineProvider
        );
        context.subscriptions.push(timelineView);

        log.info(LogCategory.EXTENSION, 'Timeline webview provider registered successfully');
        outputChannel.appendLine('✅ Timeline webview provider registered');

        // Register commands
        log.debug(LogCategory.EXTENSION, 'Registering extension commands', 'commands');
        outputChannel.appendLine('🔧 Registering commands...');

        // Show timeline command
        const showTimelineCommand = vscode.commands.registerCommand('repoTimeline.showTimeline', async () => {
            log.info(LogCategory.UI, 'Show timeline command executed');
            outputChannel.appendLine('📊 Showing repository timeline...');
            try {
                // Show the Panel view (bottom tabs)
                await vscode.commands.executeCommand('workbench.view.extension.repoTimelinePanel');
                log.info(LogCategory.UI, 'Timeline panel opened successfully');
                outputChannel.appendLine('✅ Timeline panel opened');
            } catch (error) {
                log.error(LogCategory.UI, 'Failed to show timeline panel', 'showCommand', error);
                outputChannel.appendLine(`❌ Failed to show timeline: ${error}`);
                vscode.window.showErrorMessage('Failed to show Repository Timeline. Please check the Output panel for details.');
            }
        });
        context.subscriptions.push(showTimelineCommand);

        // Refresh data command
        const refreshDataCommand = vscode.commands.registerCommand('repoTimeline.refreshData', async () => {
            log.info(LogCategory.DATA, 'Refresh data command executed');
            outputChannel.appendLine('🔄 Refreshing timeline data...');
            if (timelineProvider) {
                // Trigger refresh by sending message to webview
                // The new TimelineProvider handles this via loadTimelineForActiveFile(true)
                log.info(LogCategory.DATA, 'Refresh command received - triggering reload');
            } else {
                log.warn(LogCategory.DATA, 'No timeline provider available for refresh');
            }
            log.info(LogCategory.DATA, 'Timeline data refresh completed');
            outputChannel.appendLine('✅ Timeline data refreshed');
        });
        context.subscriptions.push(refreshDataCommand);

        // Record ADR command
        const recordADRCommand = vscode.commands.registerCommand('repoTimeline.recordADR', async () => {
            log.info(LogCategory.EXTENSION, 'Record ADR command executed');
            outputChannel.appendLine('📝 Recording Architectural Decision Record...');

            try {
                await recordADR(storagePath);
                log.info(LogCategory.EXTENSION, 'ADR recorded successfully');
                outputChannel.appendLine('✅ ADR recorded successfully');

                // Refresh timeline to show new ADR
                if (timelineProvider) {
                    await vscode.commands.executeCommand('repoTimeline.refreshData');
                }
            } catch (error) {
                log.error(LogCategory.EXTENSION, 'Failed to record ADR', 'recordADR', error);
                outputChannel.appendLine(`❌ Failed to record ADR: ${error}`);
                vscode.window.showErrorMessage(`Failed to record ADR: ${error}`);
            }
        });
        context.subscriptions.push(recordADRCommand);

        // Initialize Knowledge System for Agent Brain
        log.debug(LogCategory.EXTENSION, 'Initializing Knowledge System', 'knowledge');
        outputChannel.appendLine('🧠 Initializing Knowledge System...');

        const patternStorage = new FilePatternStorage(path.join(storagePath, 'patterns.json'));
        const patternSystem = new PatternSystem({ storage: patternStorage, autoSave: true });

        const adrStorage = new FileADRStorage(path.join(storagePath, 'adrs.json'));
        const adrSystem = new ADRSystem({ storage: adrStorage });

        const learningStorage = new MemoryLearningStorage();
        const learningSystem = new LearningSystem({ storage: learningStorage });

        // Phase 2: Initialize Context Manager and Storage
        log.debug(LogCategory.EXTENSION, 'Initializing Context Manager', 'context');
        outputChannel.appendLine('📋 Initializing Context Manager...');

        const { ContextManager, ContextStorage } = await import('@agent-brain/core/domains/context');
        const contextStorage = new ContextStorage(storagePath);
        const contextManager = new ContextManager();

        // Load existing contexts from storage
        try {
            const contexts = await contextStorage.load();
            contextManager.loadContexts(contexts);
            log.info(LogCategory.EXTENSION, `Loaded ${Object.keys(contexts).length} contexts from storage`);
            outputChannel.appendLine(`✅ Loaded ${Object.keys(contexts).length} contexts from storage`);
        } catch (error) {
            log.warn(LogCategory.EXTENSION, `Failed to load contexts: ${error}`);
            outputChannel.appendLine(`⚠️ Failed to load contexts: ${error}`);
        }

        // Auto-save contexts when they change
        contextManager.on('context:updated', async (context: any) => {
            try {
                await contextStorage.append(context.projectPath, context);
                log.debug(LogCategory.EXTENSION, `Context saved for ${context.projectPath}`);
            } catch (error) {
                log.error(LogCategory.EXTENSION, `Failed to save context: ${error}`, 'context-autosave');
            }
        });

        log.info(LogCategory.EXTENSION, 'Context Manager initialized successfully (Phase 2)');
        outputChannel.appendLine('✅ Context Manager initialized (Phase 2)');

        const knowledgeSystem = new KnowledgeSystem(patternSystem, adrSystem, learningSystem, contextManager);
        const promptEnhancer = new PromptEnhancer();

        log.info(LogCategory.EXTENSION, 'Knowledge System initialized successfully');
        outputChannel.appendLine('✅ Knowledge System initialized');

        // Phase 1: Initialize Guidance Engine for AI Companion
        log.debug(LogCategory.EXTENSION, 'Initializing Guidance Engine', 'guidance');
        outputChannel.appendLine('🤖 Initializing AI Companion Guidance Engine...');

        const guidanceEngine = new GuidanceEngine();
        // TODO: Wire guidance engine to TimelineProvider in Phase 2
        // For now, it's initialized and ready for future integration

        log.info(LogCategory.EXTENSION, 'Guidance Engine initialized successfully');
        outputChannel.appendLine('✅ Guidance Engine initialized (Phase 1)');

        // Phase 2: Initialize Knowledge Tree Provider
        log.debug(LogCategory.EXTENSION, 'Initializing Knowledge Tree Provider', 'knowledge-tree');
        outputChannel.appendLine('🌳 Initializing Knowledge Tree Provider...');

        const profileManager = new ProjectProfileManager(path.join(storagePath, 'profiles'));
        const knowledgeTreeProvider = new KnowledgeTreeProvider(
            context,
            profileManager,
            adrSystem,
            patternSystem,
            learningSystem
        );

        const knowledgeTreeView = vscode.window.registerTreeDataProvider(
            'agentBrain.knowledgeTree',
            knowledgeTreeProvider
        );
        context.subscriptions.push(knowledgeTreeView);

        log.info(LogCategory.EXTENSION, 'Knowledge Tree Provider registered successfully');
        outputChannel.appendLine('✅ Knowledge Tree Provider registered (Phase 2)');

        // Initialize Session Management
        log.debug(LogCategory.EXTENSION, 'Initializing Session Manager', 'sessions');
        outputChannel.appendLine('📋 Initializing Session Manager...');

        const sessionManager = createSessionManager({
            storagePath: path.join(storagePath, 'sessions')
        });

        log.info(LogCategory.EXTENSION, 'Session Manager initialized successfully');
        outputChannel.appendLine('✅ Session Manager initialized');

        // Wire session events to timeline (CRITICAL: Real-time updates)
        log.debug(LogCategory.EXTENSION, 'Wiring session events to timeline', 'sessions');
        outputChannel.appendLine('🔗 Wiring session events to timeline...');

        // Listen to session lifecycle events for logging
        sessionManager.on('session:started', (session: any) => {
            log.info(LogCategory.EXTENSION, `Session started: ${session.prompt}`, 'session-handler', {
                sessionId: session.id,
                agentType: session.agentType
            });
            outputChannel.appendLine(`▶️ Session started: ${session.prompt} (${session.agentType})`);
        });

        sessionManager.on('session:finalized', (session: any) => {
            log.info(LogCategory.EXTENSION, `Session finalized: ${session.prompt}`, 'session-handler', {
                sessionId: session.id,
                status: session.status
            });
            outputChannel.appendLine(`📝 Session finalized: ${session.prompt} (${session.status})`);
        });

        // Listen to event:created to add to timeline in real-time
        sessionManager.on('event:created', (event: any) => {
            if (timelineProvider && event) {
                try {
                    log.info(LogCategory.EXTENSION, `Adding session event to timeline: ${event.title}`, 'event-handler', {
                        eventId: event.id,
                        type: event.type
                    });

                    // Add session event to timeline in real-time
                    timelineProvider.addRuntimeEvent(event);

                    log.info(LogCategory.EXTENSION, `✅ Session added to timeline: ${event.title}`, 'event-handler');
                    outputChannel.appendLine(`✅ Session added to timeline: ${event.title}`);
                } catch (error) {
                    log.error(LogCategory.EXTENSION, `Failed to add session to timeline: ${error}`, 'event-handler');
                    outputChannel.appendLine(`❌ Failed to add session to timeline: ${error}`);
                }
            } else {
                if (!timelineProvider) {
                    log.warn(LogCategory.EXTENSION, 'Timeline provider not available', 'event-handler');
                }
                if (!event) {
                    log.warn(LogCategory.EXTENSION, 'Session event is null', 'event-handler');
                }
            }
        });

        log.info(LogCategory.EXTENSION, 'Session event handlers wired successfully');
        outputChannel.appendLine('✅ Session event handlers wired');

        // Initialize File System Activity Tracking
        log.debug(LogCategory.EXTENSION, 'Setting up file system activity tracking', 'adapters');
        outputChannel.appendLine('👁️ Setting up file system activity tracking...');

        const fileSystemAdapter = new FileSystemAdapter(sessionManager);
        context.subscriptions.push(fileSystemAdapter);

        log.info(LogCategory.EXTENSION, 'File system adapter initialized successfully');
        outputChannel.appendLine('✅ File system adapter initialized');

        // Agent Brain: Commands
        const promptCommand = new PromptCommand(sessionManager, knowledgeSystem, promptEnhancer);
        promptCommand.register(context);

        const endSessionCommand = new EndSessionCommand(sessionManager);
        endSessionCommand.register(context);

        const showStatusCommand = new ShowStatusCommand(sessionManager);
        showStatusCommand.register(context);

        // Phase 2: Context Rule Command
        const addContextRuleCommand = new AddContextRuleCommand(contextManager);
        addContextRuleCommand.register(context);

        // Phase 3: Import/Export Package Commands
        const importPackageCommand = new ImportPackageCommand(knowledgeSystem);
        importPackageCommand.register(context);

        const exportPackageCommand = new ExportPackageCommand(knowledgeSystem);
        exportPackageCommand.register(context);

        log.info(LogCategory.EXTENSION, 'Import/Export commands registered (Phase 3)');
        outputChannel.appendLine('✅ Import/Export commands registered (Phase 3)');

        // Phase 2: Knowledge Tree Commands
        const refreshKnowledgeCommand = vscode.commands.registerCommand('agentBrain.refreshKnowledge', () => {
            log.info(LogCategory.EXTENSION, 'Refreshing knowledge tree');
            knowledgeTreeProvider.refresh();
            vscode.window.showInformationMessage('Knowledge base refreshed');
        });
        context.subscriptions.push(refreshKnowledgeCommand);

        const toggleKnowledgeItemCommand = vscode.commands.registerCommand(
            'agentBrain.toggleKnowledgeItem',
            async (itemId: string, itemType: 'adr' | 'pattern' | 'learning') => {
                log.info(LogCategory.EXTENSION, `Toggling knowledge item: ${itemId} (${itemType})`);

                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    vscode.window.showWarningMessage('No workspace folder open');
                    return;
                }

                const projectPath = workspaceFolders[0].uri.fsPath;
                const isEnabled = await profileManager.isItemEnabled(projectPath, itemId);

                if (isEnabled) {
                    await profileManager.disableItem(projectPath, itemId);
                    vscode.window.showInformationMessage(`Disabled knowledge item`);
                } else {
                    await profileManager.enableItem(projectPath, itemId, itemType);
                    vscode.window.showInformationMessage(`Enabled knowledge item`);
                }

                knowledgeTreeProvider.refresh();
            }
        );
        context.subscriptions.push(toggleKnowledgeItemCommand);

        const showKnowledgeHealthCommand = vscode.commands.registerCommand('agentBrain.showKnowledgeHealth', async () => {
            log.info(LogCategory.EXTENSION, 'Showing knowledge health');
            vscode.window.showInformationMessage('Knowledge Health feature coming soon!');
            // TODO: Implement KnowledgeHealthView webview panel
        });
        context.subscriptions.push(showKnowledgeHealthCommand);

        const addProjectRuleCommand = vscode.commands.registerCommand('agentBrain.addProjectRule', async () => {
            log.info(LogCategory.EXTENSION, 'Adding project rule (ADR)');
            // Redirect to existing recordADR command
            await vscode.commands.executeCommand('repoTimeline.recordADR');
        });
        context.subscriptions.push(addProjectRuleCommand);

        // Phase 3: Project Profile Wizard
        const setupProfileCommand = registerSetupProjectProfileCommand(context);
        context.subscriptions.push(setupProfileCommand);

        log.info(LogCategory.EXTENSION, 'All commands registered successfully');
        outputChannel.appendLine('✅ Commands registered successfully');

        // Set up workspace change listeners
        log.debug(LogCategory.EXTENSION, 'Setting up workspace change listeners', 'watchers');
        outputChannel.appendLine('👁️ Setting up workspace change listeners...');
        const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            log.info(LogCategory.EXTENSION, 'Workspace folders changed, triggering refresh');
            outputChannel.appendLine('📁 Workspace folders changed, refreshing timeline...');
            // TimelineProvider will auto-refresh when workspace changes
        });
        context.subscriptions.push(workspaceWatcher);

        // Set up active editor change listener to detect git repository changes
        const activeEditorWatcher = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && timelineProvider) {
                log.trace(LogCategory.EXTENSION, 'Active editor changed', 'editorWatcher', {
                    path: editor.document.uri.fsPath
                });
                outputChannel.appendLine(`📁 Active editor changed: ${editor.document.uri.fsPath}`);
                // TimelineProvider automatically handles editor changes
            }
        });
        context.subscriptions.push(activeEditorWatcher);

        log.info(LogCategory.EXTENSION, 'All workspace watchers configured successfully');
        outputChannel.appendLine('✅ Workspace watchers set up');

        // Welcome message
        log.info(LogCategory.EXTENSION, 'Extension activation completed successfully');
        outputChannel.appendLine('🎉 Repository Timeline Extension activated successfully!');
        outputChannel.appendLine('💡 Use Command Palette: "Show Repository Timeline" to open the timeline');


    } catch (error) {
        log.error(LogCategory.EXTENSION, 'Extension activation failed', 'activate', error);
        outputChannel.appendLine(`❌ Failed to activate extension: ${error}`);
        vscode.window.showErrorMessage(`Failed to activate Repository Timeline: ${error}`);
        throw error;
    }
}

export function deactivate() {
    const outputChannel = vscode.window.createOutputChannel('Repository Timeline');

    log.info(LogCategory.EXTENSION, 'Starting extension deactivation');
    outputChannel.appendLine('👋 Deactivating Repository Timeline Extension...');

    // Clean up resources
    if (timelineProvider) {
        log.debug(LogCategory.EXTENSION, 'Cleaning up timeline provider');
        timelineProvider = null;
    }

    log.info(LogCategory.EXTENSION, 'Extension deactivated successfully');
    outputChannel.appendLine('✅ Extension deactivated successfully');
}

/**
 * Determine storage path for intelligence data
 *
 * Priority:
 * 1. Workspace folder (preferred) - .agent-brain/ in workspace root
 * 2. Global storage (fallback) - VSCode extension storage directory
 */
function getStoragePath(context: vscode.ExtensionContext): string {
    // Try workspace first (preferred for team sharing)
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (workspaceRoot) {
        return path.join(workspaceRoot, '.agent-brain');
    }

    // Fallback to global storage (when no workspace is open)
    return path.join(context.globalStorageUri.fsPath, 'agent-brain');
}

/**
 * Record an Architectural Decision Record
 */
async function recordADR(storagePath: string): Promise<void> {
    // Prompt user for ADR details
    const title = await vscode.window.showInputBox({
        prompt: 'ADR Title',
        placeHolder: 'e.g., Use microservices architecture',
        validateInput: (value) => value ? null : 'Title is required'
    });

    if (!title) {
        return; // User cancelled
    }

    const context = await vscode.window.showInputBox({
        prompt: 'Context (What is the situation/problem?)',
        placeHolder: 'Describe the forces at play...',
        validateInput: (value) => value ? null : 'Context is required'
    });

    if (!context) {
        return;
    }

    const decision = await vscode.window.showInputBox({
        prompt: 'Decision (What did you decide?)',
        placeHolder: 'We will use...',
        validateInput: (value) => value ? null : 'Decision is required'
    });

    if (!decision) {
        return;
    }

    const consequences = await vscode.window.showInputBox({
        prompt: 'Consequences (What are the implications?)',
        placeHolder: 'This means that...',
        validateInput: (value) => value ? null : 'Consequences are required'
    });

    if (!consequences) {
        return;
    }

    // Optional: capture code snippet from active editor selection
    const editor = vscode.window.activeTextEditor;
    let codeSnippet: { file: string; lineStart: number; lineEnd: number; code: string; } | undefined;

    if (editor && !editor.selection.isEmpty) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (selectedText.trim()) {
            const includeCode = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: 'Include selected code snippet in ADR?'
            });

            if (includeCode === 'Yes') {
                codeSnippet = {
                    file: vscode.workspace.asRelativePath(editor.document.uri.fsPath),
                    lineStart: selection.start.line + 1,
                    lineEnd: selection.end.line + 1,
                    code: selectedText
                };
            }
        }
    }

    // Optional: tags
    const tagsInput = await vscode.window.showInputBox({
        prompt: 'Tags (comma-separated, optional)',
        placeHolder: 'e.g., architecture, backend, security'
    });

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Get author info from git config or use defaults
    const author = {
        name: vscode.workspace.getConfiguration('git').get<string>('defaultUserName') || 'Unknown',
        email: vscode.workspace.getConfiguration('git').get<string>('defaultUserEmail')
    };

    // Create ADR using ADRSystem
    const adrsPath = path.join(storagePath, 'adrs.json');
    const adrSystem = new ADRSystem({
        storage: new FileADRStorage(adrsPath)
    });

    await adrSystem.createADR({
        title,
        status: ADRStatus.ACCEPTED,
        context,
        decision,
        consequences,
        tags,
        author,
        codeSnippet,
        relatedFiles: editor ? [vscode.workspace.asRelativePath(editor.document.uri.fsPath)] : undefined
    });

    vscode.window.showInformationMessage(`✅ ADR recorded: ${title}`);
}