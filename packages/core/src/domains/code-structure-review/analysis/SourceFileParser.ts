/**
 * Source file parser using TypeScript compiler API
 */

import * as ts from 'typescript';
import type { SourceFile, SourceLanguage } from '../types';

/**
 * Parser for source files with AST support
 */
export class SourceFileParser {
  private cache: Map<string, SourceFile>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Parse a single file
   */
  parse(filePath: string, content: string): SourceFile {
    // Check cache first
    const cached = this.cache.get(filePath);
    if (cached && cached.content === content) {
      return cached;
    }

    const language = this.detectLanguage(filePath);
    const lines = content.split('\n').length;
    const size = Buffer.byteLength(content, 'utf8');

    let ast: ts.SourceFile | undefined;

    // Parse TypeScript/JavaScript files with TS compiler
    if (this.isCodeFile(language)) {
      try {
        ast = ts.createSourceFile(
          filePath,
          content,
          ts.ScriptTarget.Latest,
          true // setParentNodes
        );
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
        // Continue without AST
      }
    }

    const sourceFile: SourceFile = {
      path: filePath,
      content,
      language,
      ast,
      size,
      lines
    };

    // Cache the result
    this.cache.set(filePath, sourceFile);

    return sourceFile;
  }

  /**
   * Parse multiple files
   */
  parseMultiple(files: Array<{ path: string; content: string }>): SourceFile[] {
    return files.map(file => this.parse(file.path, file.content));
  }

  /**
   * Detect language from file path
   */
  private detectLanguage(filePath: string): SourceLanguage {
    const ext = this.getExtension(filePath);

    switch (ext) {
      case '.ts':
        return 'typescript';
      case '.tsx':
        return 'tsx';
      case '.js':
        return 'javascript';
      case '.jsx':
        return 'jsx';
      case '.css':
      case '.scss':
      case '.less':
        return 'css';
      case '.html':
      case '.htm':
        return 'html';
      case '.json':
        return 'json';
      default:
        return 'typescript'; // Default fallback
    }
  }

  /**
   * Check if language is a code file (TS/JS)
   */
  private isCodeFile(language: SourceLanguage): boolean {
    return ['typescript', 'tsx', 'javascript', 'jsx'].includes(language);
  }

  /**
   * Get file extension
   */
  private getExtension(filePath: string): string {
    const match = filePath.match(/\.[^.]+$/);
    return match ? match[0] : '';
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Remove file from cache
   */
  removeFromCache(filePath: string): boolean {
    return this.cache.delete(filePath);
  }
}

/**
 * AST traversal utilities
 */
export class ASTTraversal {
  /**
   * Visit all nodes in AST with callback
   */
  static visit(node: ts.Node, callback: (node: ts.Node) => void): void {
    callback(node);
    ts.forEachChild(node, child => this.visit(child, callback));
  }

  /**
   * Find all nodes of specific kind
   */
  static findByKind(root: ts.Node, kind: ts.SyntaxKind): ts.Node[] {
    const results: ts.Node[] = [];
    this.visit(root, node => {
      if (node.kind === kind) {
        results.push(node);
      }
    });
    return results;
  }

  /**
   * Find all nodes matching predicate
   */
  static findByPredicate(
    root: ts.Node,
    predicate: (node: ts.Node) => boolean
  ): ts.Node[] {
    const results: ts.Node[] = [];
    this.visit(root, node => {
      if (predicate(node)) {
        results.push(node);
      }
    });
    return results;
  }

  /**
   * Get node text from source file
   */
  static getNodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
    return node.getText(sourceFile);
  }

  /**
   * Get line number for node
   */
  static getLineNumber(node: ts.Node, sourceFile: ts.SourceFile): number {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return line + 1; // Convert to 1-based
  }

  /**
   * Check if node is in function/method
   */
  static isInFunction(node: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (
        ts.isFunctionDeclaration(current) ||
        ts.isFunctionExpression(current) ||
        ts.isArrowFunction(current) ||
        ts.isMethodDeclaration(current)
      ) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Get containing function/method
   */
  static getContainingFunction(
    node: ts.Node
  ): ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | undefined {
    let current = node.parent;
    while (current) {
      if (
        ts.isFunctionDeclaration(current) ||
        ts.isArrowFunction(current) ||
        ts.isMethodDeclaration(current)
      ) {
        return current;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Get containing class
   */
  static getContainingClass(node: ts.Node): ts.ClassDeclaration | undefined {
    let current = node.parent;
    while (current) {
      if (ts.isClassDeclaration(current)) {
        return current;
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Check if string literal is likely user-facing
   * Heuristics: length > 2, contains spaces, not all uppercase
   */
  static isLikelyUserFacingString(text: string): boolean {
    // Remove quotes
    const cleanText = text.replace(/^['"`]|['"`]$/g, '');

    // Skip empty or very short strings
    if (cleanText.length <= 2) {
      return false;
    }

    // Skip if all uppercase (likely constants)
    if (cleanText === cleanText.toUpperCase()) {
      return false;
    }

    // Skip if looks like a technical identifier
    if (/^[a-z_][a-z0-9_]*$/i.test(cleanText)) {
      return false;
    }

    // More likely user-facing if it contains spaces
    const hasSpaces = /\s/.test(cleanText);

    // More likely user-facing if it's longer
    const isLongEnough = cleanText.length > 10;

    // Consider it user-facing if either condition is true
    return hasSpaces || isLongEnough;
  }

  /**
   * Extract all string literals from AST
   */
  static extractStringLiterals(
    root: ts.Node,
    sourceFile: ts.SourceFile,
    userFacingOnly: boolean = true
  ): Array<{ text: string; line: number; node: ts.Node }> {
    const results: Array<{ text: string; line: number; node: ts.Node }> = [];

    this.visit(root, node => {
      if (ts.isStringLiteral(node)) {
        const text = node.text;

        if (!userFacingOnly || this.isLikelyUserFacingString(text)) {
          results.push({
            text,
            line: this.getLineNumber(node, sourceFile),
            node
          });
        }
      }
    });

    return results;
  }

  /**
   * Find function/method calls by name
   */
  static findCallsByName(root: ts.Node, functionName: string): ts.CallExpression[] {
    const results: ts.CallExpression[] = [];

    this.visit(root, node => {
      if (ts.isCallExpression(node)) {
        const expression = node.expression;

        // Handle direct calls: functionName()
        if (ts.isIdentifier(expression) && expression.text === functionName) {
          results.push(node);
        }

        // Handle property access: obj.functionName()
        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.name) &&
          expression.name.text === functionName
        ) {
          results.push(node);
        }
      }
    });

    return results;
  }

  /**
   * Find all async operations (async/await, promises)
   */
  static findAsyncOperations(root: ts.Node): ts.Node[] {
    const results: ts.Node[] = [];

    this.visit(root, node => {
      // Await expressions
      if (ts.isAwaitExpression(node)) {
        results.push(node);
      }

      // .then() calls
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.name) &&
        node.expression.name.text === 'then'
      ) {
        results.push(node);
      }

      // Functions with async modifier
      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node) ||
          ts.isMethodDeclaration(node)) &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)
      ) {
        results.push(node);
      }
    });

    return results;
  }
}
