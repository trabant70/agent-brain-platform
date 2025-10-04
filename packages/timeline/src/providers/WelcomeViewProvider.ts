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

    <h2>AB Timeline</h2>
    <p><strong>Agent Brain Timeline</strong> - Transform your repository's evolution into an interactive visual timeline. See commits, branches, merges, and releases unfold over time.</p>

    <div class="info-section">
        <p><strong>✨ What You Get:</strong></p>
        <ul class="feature-list">
            <li>Visual git history with smart event markers</li>
            <li>Zoom, pan, and brush selection</li>
            <li>Dual color modes for different perspectives</li>
            <li>Powerful filtering by branch, author, or type</li>
            <li>Repository statistics and velocity metrics</li>
            <li>Handles thousands of events smoothly</li>
        </ul>
    </div>

    <div class="info-section">
        <p><strong>🚀 Get Started:</strong></p>
        <p style="margin-bottom: 8px;">Open your timeline with:</p>
        <ul class="feature-list">
            <li><kbd>Ctrl+Shift+T</kbd> (Mac: <kbd>Cmd+Shift+T</kbd>)</li>
            <li>Command Palette → "Show Repository Timeline"</li>
        </ul>
        <p style="margin-top: 8px; font-size: 12px;">AB Timeline opens in the bottom panel for your repository.</p>
    </div>

    <div class="info-section">
        <p><strong>📖 How to Use:</strong></p>
        <ul class="feature-list">
            <li>Scroll to navigate through time</li>
            <li>Hover over events for details</li>
            <li>Use Controls panel to filter events</li>
            <li>Toggle color modes for insights</li>
            <li>Select time ranges with the brush</li>
        </ul>
    </div>

    <p style="margin-top: 24px; text-align: center; font-size: 11px; color: var(--vscode-descriptionForeground);">
        AB Timeline • Agent Brain Timeline • v0.4.7
    </p>
</body>
</html>`;
    }
}
