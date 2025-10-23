/**
 * Template Validation Constants
 *
 * Error codes, security patterns, and configuration defaults
 * Updated with 2024-2025 attack vectors from CVEs and research
 */

/**
 * Error codes for validation failures
 */
export const ValidationErrorCode = {
  // Structure errors
  INVALID_JSON: 'INVALID_JSON',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_ENUM_VALUE: 'INVALID_ENUM_VALUE',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Security errors - XSS
  XSS_SCRIPT_TAG: 'XSS_SCRIPT_TAG',
  XSS_EVENT_HANDLER: 'XSS_EVENT_HANDLER',
  XSS_JAVASCRIPT_URI: 'XSS_JAVASCRIPT_URI',
  XSS_IFRAME_INJECTION: 'XSS_IFRAME_INJECTION',
  XSS_AUTOLINK_INJECTION: 'XSS_AUTOLINK_INJECTION',  // CVE-2024-37304

  // Security errors - Injection
  SQL_INJECTION: 'SQL_INJECTION',
  COMMAND_INJECTION: 'COMMAND_INJECTION',
  HTML_COMMENT_INJECTION: 'HTML_COMMENT_INJECTION',
  PROMPT_INJECTION: 'PROMPT_INJECTION',              // 2024-2025 LLM attacks
  INSTRUCTION_INJECTION: 'INSTRUCTION_INJECTION',
  ENCODING_EVASION: 'ENCODING_EVASION',              // Base64, emoji encoding

  // Security errors - Path/Prototype
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  PROTOTYPE_POLLUTION: 'PROTOTYPE_POLLUTION',
  ABSOLUTE_PATH: 'ABSOLUTE_PATH',

  // Security errors - Unicode
  UNICODE_TRUNCATION: 'UNICODE_TRUNCATION',          // CVE-2024+ Unicode exploits
  UNPAIRED_SURROGATE: 'UNPAIRED_SURROGATE',          // U+D800-U+DFFF
  HOMOGLYPH_ATTACK: 'HOMOGLYPH_ATTACK',
  RTL_OVERRIDE: 'RTL_OVERRIDE',
  ZERO_WIDTH_CHAR: 'ZERO_WIDTH_CHAR',

  // Security errors - Size/DoS
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  TOO_MANY_ITEMS: 'TOO_MANY_ITEMS',
  STRING_TOO_LONG: 'STRING_TOO_LONG',
  REDOS_PATTERN: 'REDOS_PATTERN',

  // Business logic errors
  DUPLICATE_ID: 'DUPLICATE_ID',
  INVALID_VERSION: 'INVALID_VERSION',
  ITEM_COUNT_MISMATCH: 'ITEM_COUNT_MISMATCH',
  INVALID_LICENSE: 'INVALID_LICENSE',
} as const;

/**
 * Security patterns for detection
 * Updated with 2024-2025 CVEs and research
 */
export const SecurityPatterns = {
  // XSS patterns (CVE-2024-41662, CVE-2024-21535, CVE-2024-37304)
  XSS: {
    scriptTag: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    scriptTagUnclosed: /<script/gi,
    eventHandler: /on\w+\s*=\s*["']?[^"']*["']?/gi,
    javascriptUri: /javascript\s*:/gi,
    dataUri: /data:text\/html/gi,
    iframeSrc: /<iframe[\s\S]*?src\s*=[\s\S]*?>/gi,
    objectEmbed: /<(object|embed|applet)/gi,
    metaRefresh: /<meta[\s\S]*?http-equiv[\s\S]*?refresh/gi,
    svgScript: /<svg[\s\S]*?<script/gi,
    // CVE-2024-37304: Markdown autolinks
    autolinkJavascript: /<javascript:[^>]+>/gi,
  },

  // HTML comment injection (from user example + CVE research)
  HTML_COMMENTS: /<!--[\s\S]*?-->/g,

  // Prompt injection patterns (2024-2025 LLM attacks)
  PROMPT_INJECTION: [
    /new\s+instruction/gi,
    /ignore\s+(previous|all|above)\s+(instruction|rule|prompt)/gi,
    /system\s*:\s*/gi,
    /override\s+(your|the)\s+(rules|instructions|behavior|settings)/gi,
    /update\s+your\s+(rules|instructions|behavior|memory)/gi,
    /add\s+to\s+(memory|context|custom\s+memory)/gi,
    /do\s+not\s+(disclose|reveal|tell|mention)/gi,
    /forget\s+(previous|all|everything)/gi,
    /you\s+are\s+now/gi,
    /act\s+as\s+(a|an)\s+/gi,
    /pretend\s+(you|to)\s+/gi,
    /roleplay/gi,
  ],

  // Encoding evasion (Base64, emoji, rot13)
  ENCODING_EVASION: [
    /base64\s*,/gi,
    /data:[^,]*;base64,/gi,
    /\\u[0-9a-f]{4}/gi,                    // Unicode escape sequences
    /\\x[0-9a-f]{2}/gi,                    // Hex escape sequences
    /&#x?[0-9a-f]+;/gi,                    // HTML entities
  ],

  // SQL injection patterns
  SQL_INJECTION: [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\s|$)/gi,
    /(\s|^)(or|and)\s+['"]?\w+['"]?\s*=\s*['"]?\w+/gi,
    /--/g,
    /\/\*/g,
    /;\s*(drop|delete|truncate)/gi,
  ],

  // Command injection patterns
  COMMAND_INJECTION: [
    /[;&|]\s*(rm|del|format|cmd|bash|sh|powershell|wget|curl)/gi,
    /`[^`]*`/g,                            // Backtick command substitution
    /\$\([^)]*\)/g,                        // Command substitution
  ],

  // Path traversal patterns
  PATH_TRAVERSAL: [
    /\.\.[\/\\]/g,                         // ../ or ..\
    /[\/\\]\.\.[\/\\]/g,                   // /../ or \..\
    /%2e%2e[\/\\]/gi,                      // URL-encoded ../
    /\0/g,                                 // Null byte injection
    /^[a-z]:/i,                            // Windows drive letters (C:)
    /^\/(?!\.agent-brain)/,                // Absolute paths outside .agent-brain
  ],

  // Prototype pollution patterns
  PROTOTYPE_POLLUTION: [
    /__proto__/gi,
    /constructor\s*(\[|\.)/gi,
    /prototype\s*(\[|\.)/gi,
  ],

  // Unicode exploits (CVE-2024+ research)
  UNICODE: {
    // Unpaired surrogates U+D800-U+DFFF (privilege escalation)
    unpairedSurrogates: /[\uD800-\uDFFF]/g,

    // RTL override attacks
    rtlOverride: /[\u202E\u202D\u200F\u200E]/g,

    // Zero-width characters (steganography)
    zeroWidth: /[\u200B\u200C\u200D\uFEFF]/g,

    // Homoglyph attacks (lookalike characters)
    homoglyphs: /[а-яА-Я]/g,              // Cyrillic lookalikes

    // Combining characters abuse
    excessiveCombining: /[\u0300-\u036F]{4,}/g,
  },

  // ReDoS (Regular Expression Denial of Service)
  REDOS_PATTERNS: [
    /(a+)+b/,                              // Catastrophic backtracking
    /(a|a)*b/,
    /(a*)*b/,
  ],
} as const;

/**
 * Validation configuration type
 */
export interface ValidationConfig {
  maxTemplateSize: number;
  maxItemBodySize: number;
  maxItemCount: number;
  maxStringLength: number;
  maxTagCount: number;
  maxTagLength: number;
  allowedProtocols: string[];
  sanitizeMode: 'reject' | 'sanitize';
  failFast: boolean;
  strictMode: boolean;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  maxTemplateSize: 5 * 1024 * 1024,      // 5MB total
  maxItemBodySize: 1 * 1024 * 1024,      // 1MB per item
  maxItemCount: 100,                     // Max items per template
  maxStringLength: 10000,                // Max for title, description
  maxTagCount: 20,                       // Max tags
  maxTagLength: 50,                      // Max characters per tag

  allowedProtocols: ['https:', 'http:', 'mailto:'],

  sanitizeMode: 'sanitize',              // Sanitize rather than reject
  failFast: false,                       // Run all validators
  strictMode: true,                      // Enable strict checks
};

/**
 * Known safe markdown subset
 * Whitelisted markdown syntax that's considered safe
 */
export const SAFE_MARKDOWN_SUBSET = {
  headers: /^#{1,6}\s+/gm,
  bold: /\*\*[^*]+\*\*/g,
  italic: /\*[^*]+\*/g,
  code: /`[^`]+`/g,
  codeBlock: /```[\s\S]*?```/g,
  links: /\[[^\]]+\]\([^)]+\)/g,
  lists: /^[-*+]\s+/gm,
  numberedLists: /^\d+\.\s+/gm,
  blockquote: /^>\s+/gm,
  horizontalRule: /^---$/gm,
};

/**
 * Known safe licenses
 */
export const KNOWN_LICENSES = [
  'MIT',
  'Apache-2.0',
  'GPL-3.0',
  'BSD-3-Clause',
  'ISC',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'Unlicense',
  'Proprietary',
] as const;

/**
 * Severity levels for logging
 */
export const ValidationSeverity = {
  CRITICAL: 'critical',   // Security threat, must reject
  ERROR: 'error',         // Invalid structure, cannot process
  WARNING: 'warning',     // Non-critical issue, can proceed
  INFO: 'info',           // Informational message
} as const;
