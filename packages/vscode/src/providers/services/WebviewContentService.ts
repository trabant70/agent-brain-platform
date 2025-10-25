/**
 * WebviewContentService
 *
 * Handles HTML generation, CSP configuration, and URI conversion for webviews.
 * Responsible for:
 * - Generating HTML content with proper CSP headers
 * - Converting resource paths to webview URIs
 * - Cache-busting for scripts and assets
 * - Theme-aware asset handling
 */

import * as vscode from 'vscode';
import * as fs from 'fs';

export class WebviewContentService {
  constructor(private extensionUri: vscode.Uri) {}

  /**
   * Get HTML for webview
   *
   * Loads the webpack-bundled HTML and injects proper CSP and resource URIs.
   * This ensures a single source of truth: the HTML template.
   *
   * CACHE-BUSTING: Adds version parameter to all script URIs to force VSCode
   * to reload webview content when the extension version changes.
   */
  getHtmlForWebview(webview: vscode.Webview): string {
    // Read the webpack-bundled HTML file
    const htmlPath = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'webview.html');
    const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    // Get cache buster (version + timestamp)
    const cacheBuster = this.getCacheBuster();

    // Build Content Security Policy
    const csp = this.buildContentSecurityPolicy(webview);

    // Inject CSP meta tag into the HTML head
    const htmlWithCSP = htmlContent.replace(
      '<!-- CSP will be injected by provider at runtime -->',
      `<meta http-equiv="Content-Security-Policy" content="${csp}">`
    );

    // Inject webview URIs for scripts and assets
    const htmlWithWebviewUris = this.injectWebviewUris(htmlWithCSP, webview, cacheBuster);

    return htmlWithWebviewUris;
  }

  /**
   * Build Content Security Policy for webview
   */
  buildContentSecurityPolicy(webview: vscode.Webview): string {
    const cspSource = webview.cspSource;

    const csp = `
      default-src 'none';
      style-src ${cspSource} 'unsafe-inline';
      script-src ${cspSource} 'unsafe-eval';
      font-src ${cspSource};
      img-src ${cspSource} data: https:;
    `.replace(/\s+/g, ' ').trim();

    return csp;
  }

  /**
   * Inject webview URIs for scripts and assets
   */
  private injectWebviewUris(
    htmlContent: string,
    webview: vscode.Webview,
    cacheBuster: string
  ): string {
    // Convert script src paths to webview URIs with cache-busting version parameter
    // The bundled HTML has paths like: <script defer src="vendors.js"></script>
    // We transform to: <script defer src="vscode-webview://...vendors.js?v=0-1-5"></script>
    let htmlWithWebviewUris = htmlContent.replace(
      /src="([^"]+\.js)"/g,
      (match, scriptPath) => {
        const scriptUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', scriptPath)
        );
        // Add version as query parameter for cache busting
        return `src="${scriptUri}?v=${cacheBuster}"`;
      }
    );

    // Convert asset paths (images, SVGs, etc.) to webview URIs
    // The bundled HTML has paths like: <img src="assets/diagram.svg">
    // We transform to: <img src="vscode-webview://...assets/diagram.svg">
    htmlWithWebviewUris = htmlWithWebviewUris.replace(
      /src="(assets\/[^"]+)"/g,
      (match, assetPath) => {
        const assetUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', assetPath)
        );
        return `src="${assetUri}"`;
      }
    );

    // Special handling for architecture diagram - inject both theme URIs as data attributes
    // This allows the webview to switch between light/dark without reconstructing URIs
    const lightDiagramUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'agentbrain-complete-diagram.svg')
    );
    const darkDiagramUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'agentbrain-complete-diagram-dark.svg')
    );

    htmlWithWebviewUris = htmlWithWebviewUris.replace(
      /id="architecture-diagram"/,
      `id="architecture-diagram" data-light-src="${lightDiagramUri}" data-dark-src="${darkDiagramUri}"`
    );

    return htmlWithWebviewUris;
  }

  /**
   * Get cache buster string (version + timestamp)
   * Format: "0-1-6-1696615234567"
   */
  getCacheBuster(): string {
    const packageJsonPath = vscode.Uri.joinPath(this.extensionUri, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath.fsPath, 'utf8'));

    // Extension version + timestamp ensures VSCode ALWAYS reloads webview
    const cacheBuster = `${packageJson.version.replace(/\./g, '-')}-${Date.now()}`;

    return cacheBuster;
  }
}
