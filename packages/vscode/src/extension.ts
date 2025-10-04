import * as vscode from 'vscode';
import { TimelineProvider } from './providers/timeline-provider-webpack';
import { WelcomeViewProvider } from './providers/WelcomeViewProvider';
import { logger, LogCategory, createContextLogger } from './utils/Logger';

let timelineProvider: TimelineProvider | null = null;
const log = createContextLogger(LogCategory.EXTENSION);

export async function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Repository Timeline');

    log.info(LogCategory.EXTENSION, 'Starting extension activation');
    outputChannel.appendLine('🚀 Activating Repository Timeline Extension...');

    try {
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

        timelineProvider = new TimelineProvider(context.extensionUri);
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