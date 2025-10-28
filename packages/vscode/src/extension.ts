import * as vscode from 'vscode';
import * as path from 'path';
import * as nls from 'vscode-nls';
import { TimelineProvider } from './providers/timeline-provider-webpack';
import { WelcomeViewProvider } from './providers/WelcomeViewProvider';
import { logger, LogCategory, createContextLogger } from '@agent-brain/core/infrastructure/logging/Logger';
import { KnowledgeManager, ThreadControlCenter } from './services';
import { FocusValidationService } from './services/knowledge/FocusValidationService';
import { ClaudeMdScanner, TemplateEngine, KnowledgeStore } from '@agent-brain/core/domains/knowledge';

// Initialize localization
const localize = nls.config({ messageFormat: nls.MessageFormat.file })();

let timelineProvider: TimelineProvider | null = null;
let knowledgeManager: KnowledgeManager | null = null;
let threadControlCenter: ThreadControlCenter | null = null;
let focusValidationService: FocusValidationService | null = null;
const log = createContextLogger(LogCategory.EXTENSION);

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Agent Brain');

    // Configure Logger to use VSCode OutputChannel for all extension-side logging
    logger.setOutputChannel(outputChannel);

    log.info(LogCategory.EXTENSION, 'Starting extension activation');
    outputChannel.appendLine('🚀 Activating Agent Brain Extension...');

    try {
        // Get workspace root (single source of truth for paths)
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '.';
        log.info(LogCategory.EXTENSION, `Workspace root: ${workspaceRoot}`, 'activate');
        outputChannel.appendLine(`📂 Workspace root: ${workspaceRoot}`);

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

        timelineProvider = new TimelineProvider(
            context.extensionUri,
            workspaceRoot
        );
        const timelineView = vscode.window.registerWebviewViewProvider(
            TimelineProvider.viewType,
            timelineProvider
        );
        context.subscriptions.push(timelineView);

        log.info(LogCategory.EXTENSION, 'Timeline webview provider registered successfully');
        outputChannel.appendLine('✅ Timeline webview provider registered');

        // Register timeline commands
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
                vscode.window.showErrorMessage(
                    localize('error.showTimeline', 'Failed to show Agent Brain. Please check the Output panel for details.')
                );
            }
        });
        context.subscriptions.push(showTimelineCommand);

        // Refresh data command
        const refreshDataCommand = vscode.commands.registerCommand('repoTimeline.refreshData', async () => {
            log.info(LogCategory.DATA, 'Refresh data command executed');
            outputChannel.appendLine('🔄 Refreshing timeline data...');
            if (timelineProvider) {
                // Trigger refresh by sending message to webview
                log.info(LogCategory.DATA, 'Refresh command received - triggering reload');
            } else {
                log.warn(LogCategory.DATA, 'No timeline provider available for refresh');
            }
            log.info(LogCategory.DATA, 'Timeline data refresh completed');
            outputChannel.appendLine('✅ Timeline data refreshed');
        });
        context.subscriptions.push(refreshDataCommand);

        log.info(LogCategory.EXTENSION, 'Timeline commands registered successfully');
        outputChannel.appendLine('✅ Timeline commands registered');

        // Initialize Threading Control Center
        log.debug(LogCategory.EXTENSION, 'Initializing Threading Control Center', 'threading');
        outputChannel.appendLine('🧵 Initializing Threading Control Center...');

        if (workspaceRoot && workspaceRoot !== '.') {
            threadControlCenter = new ThreadControlCenter(workspaceRoot, context);

            log.info(LogCategory.EXTENSION, 'Threading Control Center initialized successfully');
            outputChannel.appendLine('✅ Threading Control Center initialized');

            // Connect to timeline provider for webview communication
            if (timelineProvider) {
                // Set up bidirectional communication
                threadControlCenter.setWebviewMessageCallback((message) => {
                    timelineProvider?.sendMessage(message);
                });
                timelineProvider.setThreadControlCenter(threadControlCenter);
                log.debug(LogCategory.EXTENSION, 'Threading Control Center connected to Timeline Provider');
            }

            // Register threading commands
            const toggleThreadingCommand = vscode.commands.registerCommand(
                'agentBrain.threading.toggle',
                async () => {
                    log.info(LogCategory.EXTENSION, 'Toggle threading command executed');
                    outputChannel.appendLine('🧵 Toggling threading system...');
                    await threadControlCenter?.toggleThreading();
                }
            );
            context.subscriptions.push(toggleThreadingCommand);

            const startSessionCommand = vscode.commands.registerCommand(
                'agentBrain.threading.startSession',
                async () => {
                    log.info(LogCategory.EXTENSION, 'Start threading session command executed');
                    outputChannel.appendLine('🧵 Starting threading session...');

                    const mode = await vscode.window.showQuickPick(
                        ['development', 'debugging', 'learning'],
                        { placeHolder: 'Select threading mode' }
                    ) as 'development' | 'debugging' | 'learning' | undefined;

                    if (mode) {
                        await threadControlCenter?.startSession(mode);
                    }
                }
            );
            context.subscriptions.push(startSessionCommand);

            const endSessionCommand = vscode.commands.registerCommand(
                'agentBrain.threading.endSession',
                async () => {
                    log.info(LogCategory.EXTENSION, 'End threading session command executed');
                    outputChannel.appendLine('🧵 Ending threading session...');
                    await threadControlCenter?.endSession();
                }
            );
            context.subscriptions.push(endSessionCommand);

            log.info(LogCategory.EXTENSION, 'Threading commands registered successfully');
            outputChannel.appendLine('✅ Threading commands registered');

            context.subscriptions.push({
                dispose: () => threadControlCenter?.dispose()
            });
        } else {
            log.warn(LogCategory.EXTENSION, 'No workspace folder found, skipping Threading Control Center');
            outputChannel.appendLine('⚠️ No workspace folder found, Threading disabled');
        }

        // Initialize Knowledge Management System
        log.debug(LogCategory.EXTENSION, 'Initializing Knowledge Manager', 'knowledge');
        outputChannel.appendLine('📚 Initializing Knowledge Manager...');

        if (workspaceRoot && workspaceRoot !== '.') {
            knowledgeManager = new KnowledgeManager(workspaceRoot, context);
            await knowledgeManager.initialize();

            log.info(LogCategory.EXTENSION, 'Knowledge Manager initialized successfully');
            outputChannel.appendLine('✅ Knowledge Manager initialized');

            // Pass knowledge manager to timeline provider
            if (timelineProvider) {
                timelineProvider.setKnowledgeManager(knowledgeManager);
                log.debug(LogCategory.EXTENSION, 'Knowledge Manager connected to Timeline Provider');
            }

            // Initialize Focus Validation Service
            log.debug(LogCategory.EXTENSION, 'Initializing Focus Validation Service', 'validation');
            outputChannel.appendLine('✅ Initializing Focus Validation Service...');

            try {
                // Get the TemplateEngine from KnowledgeManager if available
                const templateStore = (knowledgeManager as any).templateStore as KnowledgeStore;
                const templateEngine = new TemplateEngine(templateStore);
                const scanner = new ClaudeMdScanner(templateEngine);

                focusValidationService = new FocusValidationService(scanner, {
                    validateOnSave: true,
                    validateOnTabSwitch: false, // Can be heavy, disabled by default
                    validateOnClose: true,
                    validateOnBlur: false,
                    showWarnings: true,
                    autoFix: false
                });

                log.info(LogCategory.EXTENSION, 'Focus Validation Service initialized successfully');
                outputChannel.appendLine('✅ Focus Validation Service initialized');

                context.subscriptions.push({
                    dispose: () => focusValidationService?.dispose()
                });
            } catch (error) {
                log.error(LogCategory.EXTENSION, 'Failed to initialize Focus Validation Service', 'initialization', error);
                outputChannel.appendLine(`⚠️ Focus Validation Service initialization failed: ${error}`);
            }

            context.subscriptions.push({
                dispose: () => knowledgeManager?.dispose()
            });
        } else {
            log.warn(LogCategory.EXTENSION, 'No workspace folder found, skipping Knowledge Manager');
            outputChannel.appendLine('⚠️ No workspace folder found, Knowledge Manager disabled');
        }

        // Initialize timeline provider
        await timelineProvider.initialize();
        log.info(LogCategory.EXTENSION, 'Timeline provider initialized successfully');
        outputChannel.appendLine('✅ Timeline provider initialized');

        // Wire up focus validation callback to refresh claude.md files in webview
        if (focusValidationService && timelineProvider) {
            focusValidationService.setClaudeMdFocusCallback(() => {
                log.debug(LogCategory.EXTENSION, 'CLAUDE.md file focused, refreshing injected indicators');
                timelineProvider.sendClaudeMdFiles();
            });
            log.debug(LogCategory.EXTENSION, 'Focus validation callback configured');
            outputChannel.appendLine('✅ CLAUDE.md focus callback configured');
        }

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
        outputChannel.appendLine('🎉 Agent Brain Extension activated successfully!');
        outputChannel.appendLine('💡 Use Command Palette: "Show Agent Brain" to open the timeline');

    } catch (error) {
        log.error(LogCategory.EXTENSION, 'Extension activation failed', 'activate', error);
        outputChannel.appendLine(`❌ Failed to activate extension: ${error}`);
        vscode.window.showErrorMessage(
            localize('error.activateFailed', 'Failed to activate Agent Brain Platform: {0}', String(error))
        );
        throw error;
    }
}

export function deactivate() {
    const outputChannel = vscode.window.createOutputChannel('Agent Brain');

    log.info(LogCategory.EXTENSION, 'Starting extension deactivation');
    outputChannel.appendLine('👋 Deactivating Agent Brain Extension...');

    // Clean up resources
    if (timelineProvider) {
        log.debug(LogCategory.EXTENSION, 'Cleaning up timeline provider');
        timelineProvider = null;
    }

    log.info(LogCategory.EXTENSION, 'Extension deactivated successfully');
    outputChannel.appendLine('✅ Extension deactivated successfully');
}

// getStoragePath function removed - workspaceRoot is now the single source of truth
// Storage path is derived internally by DataOrchestrator as: workspaceRoot + '/.agent-brain'
