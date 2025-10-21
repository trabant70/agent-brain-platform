/**
 * WelcomeViewProvider - Simple welcome view for Activity Bar sidebar
 *
 * Provides a minimal welcome/info view in the activity bar sidebar
 * to make the icon visible, while the actual timeline stays in the bottom panel.
 */

import * as vscode from 'vscode';

export class WelcomeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'repoTimeline.welcomeView';

    constructor(private readonly extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        // Get the URI for the large icon SVG
        const iconUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'images', 'timeline_large.svg')
        );

        webviewView.webview.html = this.getWelcomeHtml(iconUri.toString());
    }

    private getWelcomeHtml(iconUri: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AB Timeline</title>
    <style>
        body {
            padding: 16px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            line-height: 1.6;
        }
        h2 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 600;
        }
        p {
            margin: 0 0 12px 0;
            color: var(--vscode-descriptionForeground);
        }
        .action-button {
            display: inline-block;
            padding: 6px 14px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            text-decoration: none;
            font-size: 13px;
            margin-bottom: 8px;
        }
        .action-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .info-section {
            margin: 16px 0;
            padding: 12px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            border-radius: 2px;
        }
        .feature-list {
            margin: 8px 0;
            padding-left: 20px;
        }
        .feature-list li {
            margin: 4px 0;
            color: var(--vscode-descriptionForeground);
        }
        .icon {
            text-align: center;
            margin: 16px 0;
        }
        .icon img {
            width: 120px;
            height: 120px;
        }
    </style>
</head>
<body>
    <div class="icon">
        <img src="${iconUri}" alt="AB Timeline Logo" />
    </div>

    <h2>Agent Brain Platform</h2>
    <p><strong>Your Second Brain for Software Development</strong> - Visualize repository evolution, manage knowledge, and track coding sessions in one unified platform.</p>

    <div class="info-section">
        <p><strong>✨ What You Get:</strong></p>
        <ul class="feature-list">
            <li><strong>Timeline:</strong> Visual git history with events, filtering, and statistics</li>
            <li><strong>Knowledge:</strong> Capture ADRs, patterns, learnings, and best practices</li>
            <li><strong>Sessions:</strong> Track multi-prompt coding sessions and insights</li>
            <li><strong>Architecture:</strong> Visual system diagram with theme support</li>
        </ul>
    </div>

    <div class="info-section">
        <p><strong>🚀 Get Started:</strong></p>
        <p style="margin-bottom: 8px;">Open Agent Brain with:</p>
        <ul class="feature-list">
            <li><kbd>Ctrl+Shift+T</kbd> (Mac: <kbd>Cmd+Shift+T</kbd>)</li>
            <li>Command Palette → "Show Repository Timeline"</li>
        </ul>
        <p style="margin-top: 8px; font-size: 12px;">Opens in the bottom panel with 4 tabs: Timeline, Knowledge, Sessions, Support</p>
    </div>

    <div class="info-section">
        <p><strong>📚 Create Knowledge:</strong></p>
        <ul class="feature-list">
            <li>Switch to <strong>AB Knowledge</strong> tab</li>
            <li>Click <strong>"+ Add Item"</strong></li>
            <li>Choose type: Golden Path, ADR, Pattern, Learning, etc.</li>
            <li>Write in markdown, save to <code>.agent-brain/</code></li>
            <li>Knowledge items appear on timeline automatically!</li>
        </ul>
    </div>

    <div class="info-section">
        <p><strong>📖 Quick Tips:</strong></p>
        <ul class="feature-list">
            <li>Hover events for details, click for full popup</li>
            <li>Use <strong>Controls</strong> button to filter timeline</li>
            <li>Save knowledge templates for reuse</li>
            <li>Session journals go in <code>.agent-brain/sessions/</code></li>
            <li>Check <strong>AB Support</strong> tab for architecture</li>
        </ul>
    </div>

    <p style="margin-top: 24px; text-align: center; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Agent Brain Platform • Transform development with visual intelligence 🧠✨
    </p>
</body>
</html>`;
    }
}
