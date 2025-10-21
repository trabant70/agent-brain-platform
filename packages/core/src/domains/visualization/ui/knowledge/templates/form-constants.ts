/**
 * form-constants.ts - Constants for knowledge item forms
 *
 * Provides shared constants for type and scope mappings used in create/edit forms.
 * Extracted from KnowledgeViewController to reduce duplication.
 */

/**
 * Display options for knowledge type dropdown
 */
export const TYPE_OPTIONS = [
  '📋 ADR',
  '🎯 Golden Path',
  '🔧 Design Pattern',
  '⚠️ Anti-Pattern',
  '📏 Standard',
  '📝 Convention',
  '✅ Checklist',
  '💡 Tip',
  '📝 Snippet',
  '⚙️ Configuration',
  '🔗 API Reference',
  '📚 Learning',
  '🔍 Troubleshooting',
  '⚠️ Gotcha',
  '📄 Template',
  '📖 Guideline',
  '🔄 Workflow',
  '📦 Runbook',
  '📦 Custom'
];

/**
 * Display options for knowledge scope dropdown
 */
export const SCOPE_OPTIONS = [
  '👤 Personal',
  '👥 Team',
  '📁 Project',
  '🏢 Organization',
  '🌐 Public'
];

/**
 * Map display string to internal type value
 */
export const TYPE_DISPLAY_TO_VALUE: Record<string, string> = {
  '📋 ADR': 'adr',
  '🎯 Golden Path': 'golden-path',
  '🔧 Design Pattern': 'design-pattern',
  '⚠️ Anti-Pattern': 'anti-pattern',
  '📏 Standard': 'standard',
  '📝 Convention': 'convention',
  '✅ Checklist': 'checklist',
  '💡 Tip': 'tip',
  '📝 Snippet': 'snippet',
  '⚙️ Configuration': 'configuration',
  '🔗 API Reference': 'api-reference',
  '📚 Learning': 'learning',
  '🔍 Troubleshooting': 'troubleshooting',
  '⚠️ Gotcha': 'gotcha',
  '📄 Template': 'template',
  '📖 Guideline': 'guideline',
  '🔄 Workflow': 'workflow',
  '📦 Runbook': 'runbook',
  '📦 Custom': 'custom'
};

/**
 * Map display string to internal scope value
 */
export const SCOPE_DISPLAY_TO_VALUE: Record<string, string> = {
  '👤 Personal': 'personal',
  '👥 Team': 'team',
  '📁 Project': 'project',
  '🏢 Organization': 'organization',
  '🌐 Public': 'public'
};

/**
 * Map internal type value to display string
 */
export const TYPE_VALUE_TO_DISPLAY: Record<string, string> = {
  'adr': '📋 ADR',
  'golden-path': '🎯 Golden Path',
  'design-pattern': '🔧 Design Pattern',
  'anti-pattern': '⚠️ Anti-Pattern',
  'standard': '📏 Standard',
  'convention': '📝 Convention',
  'checklist': '✅ Checklist',
  'tip': '💡 Tip',
  'snippet': '📝 Snippet',
  'configuration': '⚙️ Configuration',
  'api-reference': '🔗 API Reference',
  'learning': '📚 Learning',
  'troubleshooting': '🔍 Troubleshooting',
  'gotcha': '⚠️ Gotcha',
  'template': '📄 Template',
  'guideline': '📖 Guideline',
  'workflow': '🔄 Workflow',
  'runbook': '📦 Runbook',
  'custom': '📦 Custom'
};

/**
 * Map internal scope value to display string
 */
export const SCOPE_VALUE_TO_DISPLAY: Record<string, string> = {
  'personal': '👤 Personal',
  'team': '👥 Team',
  'project': '📁 Project',
  'organization': '🏢 Organization',
  'public': '🌐 Public'
};
