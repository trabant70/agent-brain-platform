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
    <p style="line-height: 1.6; margin-bottom: 16px;"><strong>Help AI agents (like Claude) become better coding partners.</strong> Give them persistent memory, your standards, and expert solutions. Transform forgetful juniors into consistent seniors.</p>

    <div class="info-section">
        <p><strong>🎯 The Purpose:</strong></p>
        <p style="font-size: 13px; line-height: 1.6; margin-bottom: 8px;">AI coding agents are brilliant but lack memory and context between sessions. Agent Brain Platform solves this by providing:</p>
        <ul class="feature-list">
            <li><strong>Persistent Memory:</strong> Agents remember project history and decisions</li>
            <li><strong>Standards Enforcement:</strong> Your rules automatically applied every session</li>
            <li><strong>Expert Solutions:</strong> Inject proven patterns and best practices</li>
            <li><strong>Audit Trails:</strong> Complete visibility of who (human or AI) did what</li>
        </ul>
    </div>

    <div class="info-section">
        <p><strong>🧠 How It Works:</strong></p>
        <ul class="feature-list">
            <li><strong>1. Capture Knowledge</strong> → Document standards, patterns, learnings in markdown</li>
            <li><strong>2. Inject into CLAUDE.md</strong> → Apply templates so agents load rules on startup</li>
            <li><strong>3. Track Everything</strong> → Visual timeline shows all agent work and commits</li>
            <li><strong>4. Learn & Improve</strong> → Capture session journals, build institutional memory</li>
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
        <p><strong>📋 3-Step Quick Start:</strong></p>
        <ul class="feature-list">
            <li><strong>Step 1:</strong> Go to <strong>AB Marketplace</strong> → Install "Agent Brain Base" and "Reza Rezvani's Essentials"</li>
            <li><strong>Step 2:</strong> Go to <strong>AB Knowledge</strong> → Scan for CLAUDE.md → Apply installed templates</li>
            <li><strong>Step 3:</strong> Start coding! AI agents now automatically follow your standards</li>
        </ul>
    </div>

    <div class="info-section">
        <p><strong>💡 Pro Tips:</strong></p>
        <ul class="feature-list">
            <li>Create session journals for multi-prompt AI sessions (5+ exchanges)</li>
            <li>Document learnings immediately when discovered during coding</li>
            <li>Use timeline to audit what agents actually did</li>
            <li>Check <strong>AB Support → Getting Started</strong> for full guide</li>
        </ul>
    </div>

    <p style="margin-top: 24px; text-align: center; font-size: 11px; color: var(--vscode-descriptionForeground);">
        Agent Brain Platform • Transform development with visual intelligence 🧠✨
    </p>
</body>
</html>`;
    }
}
