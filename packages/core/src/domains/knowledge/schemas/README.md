# Agent Brain Template Schema Documentation

This directory contains JSON Schema definitions for Agent Brain knowledge templates. These schemas serve dual purposes:

1. **Validation**: Programmatic validation of template structure and data types
2. **Documentation**: Authoritative reference for template format and constraints

## Schema Files

### `marketplace-template.schema.json`

Complete JSON Schema definition for `MarketplaceTemplate` objects. This is the authoritative specification for:

- Template structure and required fields
- Data types and format constraints
- Enum values for categories, types, and scopes
- Field length limits and patterns
- Nested object structures (items, audit log, version history)

## Using the Schema

### 1. As Documentation

The schema serves as the single source of truth for template structure. Key sections:

**Required Fields:**
- `id` - Unique identifier (lowercase, alphanumeric with hyphens/dots)
- `name` - Human-readable name (3-100 chars)
- `description` - Short description (10-500 chars)
- `version` - Semantic version (e.g., "1.0", "2.1.0")
- `category` - One of 10 predefined categories
- `author` - Object with `name` (required), `email`, `url` (optional)
- `license` - License identifier (e.g., "MIT", "Apache-2.0")
- `items` - Array of knowledge items (min 1, max 500)

**Optional Fields:**
- `createdAt`, `updatedAt` - ISO 8601 timestamps
- `tags` - Array of lowercase tags (max 20)
- `source` - Template origin: bundled, user, cloned, imported
- `scope` - Visibility: personal, team, project, organization, public
- `userEditable` - Whether template can be edited
- `versionHistory` - Array of version checkpoints
- `auditLog` - Complete change history
- `sourceTemplateId` - If cloned, the source ID

### 2. For Validation (Programmatic)

#### Using AJV (Already installed)

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import templateSchema from './schemas/marketplace-template.schema.json';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv); // For email, uri, date-time formats

const validate = ajv.compile(templateSchema);

// Validate a template
const isValid = validate(templateObject);

if (!isValid) {
  console.error('Validation errors:', validate.errors);
  // Example error:
  // {
  //   instancePath: '/category',
  //   schemaPath: '#/properties/category/enum',
  //   keyword: 'enum',
  //   params: { allowedValues: ['development', 'documentation', ...] },
  //   message: 'must be equal to one of the allowed values'
  // }
}
```

#### Integration with Current Validator

The schema can be used alongside or to replace parts of `SchemaValidator.ts`:

```typescript
// Option 1: Use schema-based validation
import Ajv from 'ajv';
import templateSchema from '../schemas/marketplace-template.schema.json';

const ajv = new Ajv();
const validateSchema = ajv.compile(templateSchema);

// In validate() method:
const schemaValid = validateSchema(template);
if (!schemaValid) {
  // Convert AJV errors to ValidationError format
  validateSchema.errors?.forEach(error => {
    errors.push({
      code: ValidationErrorCode.INVALID_TYPE,
      message: error.message || 'Validation failed',
      field: error.instancePath.replace(/^\//, ''),
      severity: 'error',
      suggestion: getSuggestion(error)
    });
  });
}
```

### 3. For Template Creation

When creating new templates, use this schema as your guide:

#### Minimal Valid Template

```json
{
  "id": "user.my-template",
  "name": "My Template",
  "description": "A template for documenting best practices in React development.",
  "version": "1.0",
  "category": "best-practices",
  "tags": ["react", "javascript", "frontend"],
  "author": {
    "name": "John Doe"
  },
  "license": "MIT",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "best-practice",
      "scope": "team",
      "title": "Use Functional Components",
      "body": "## Best Practice\n\nPrefer functional components over class components.",
      "tags": ["react", "components"],
      "path": "/workspace/knowledge/react/functional-components.md",
      "relativePath": "knowledge/react/functional-components.md",
      "valid": true,
      "metadata": {
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    }
  ]
}
```

## Field Constraints & Patterns

### Template Level

| Field | Type | Pattern/Format | Min | Max | Example |
|-------|------|----------------|-----|-----|---------|
| `id` | string | `^[a-z0-9][a-z0-9._-]*$` | 3 | 100 | `bundled.git-essentials` |
| `name` | string | - | 3 | 100 | `Git Essentials` |
| `description` | string | - | 10 | 500 | `Essential Git workflows...` |
| `version` | string | `^\d+\.\d+(\.\d+)?$` | - | - | `1.0`, `2.1.0` |
| `category` | enum | - | - | - | `development`, `security` |
| `tags` | string[] | `^[a-z0-9-]+$` per item | 0 | 20 | `["git", "workflow"]` |
| `license` | string | - | 2 | 50 | `MIT`, `Apache-2.0` |

### Knowledge Item Level

| Field | Type | Pattern/Format | Min | Max | Example |
|-------|------|----------------|-----|-----|---------|
| `id` | string | UUID v4 | - | - | `550e8400-e29b-41d4-a716-...` |
| `type` | enum | 21 values | - | - | `adr`, `golden-path`, `snippet` |
| `scope` | enum | 5 values | - | - | `personal`, `team`, `project` |
| `title` | string | - | 3 | 200 | `Feature Branch Workflow` |
| `body` | string | Markdown | 10 | 50000 | `## Overview\n\n...` |
| `tags` | string[] | `^[a-z0-9-]+$` | - | - | `["git", "branching"]` |

### Enumerations

**Template Categories:**
```
development, documentation, best-practices, architecture,
testing, security, onboarding, workflows, general, custom
```

**Knowledge Item Types:**
```
adr, design-pattern, anti-pattern, golden-path, best-practice,
standard, convention, checklist, snippet, configuration, command,
api-reference, learning, troubleshooting, gotcha, tip, template,
guideline, workflow, runbook, custom
```

**Scopes:**
```
personal, team, project, organization, public
```

**Source Types:**
```
bundled, user, cloned, imported
```

## Common Validation Errors

### 1. Invalid Category

**Error:**
```json
{
  "field": "category",
  "message": "must be equal to one of the allowed values"
}
```

**Fix:** Use one of the 10 predefined categories:
```json
{
  "category": "development"  // ✓ Valid
  // "category": "Development"  ✗ Invalid (case-sensitive)
  // "category": "dev"  ✗ Invalid (not in enum)
}
```

### 2. Invalid Knowledge Type

**Error:**
```json
{
  "field": "items[0].type",
  "message": "must be equal to one of the allowed values"
}
```

**Fix:** Use correct enum value (21 types available):
```json
{
  "type": "design-pattern"  // ✓ Valid
  // "type": "pattern"  ✗ Invalid (old value, deprecated)
  // "type": "api-spec"  ✗ Invalid (should be "api-reference")
}
```

### 3. Missing Required Field

**Error:**
```json
{
  "field": "items[0].metadata",
  "message": "must have required property 'metadata'"
}
```

**Fix:** Add all required fields:
```json
{
  "metadata": {
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### 4. Invalid Version Format

**Error:**
```json
{
  "field": "version",
  "message": "must match pattern \"^\\d+\\.\\d+(\\.\\d+)?$\""
}
```

**Fix:** Use semantic versioning:
```json
{
  "version": "1.0"      // ✓ Valid
  "version": "2.1.0"    // ✓ Valid
  // "version": "v1.0"  ✗ Invalid (no prefix)
  // "version": "1"     ✗ Invalid (need major.minor)
}
```

### 5. Invalid Tag Format

**Error:**
```json
{
  "field": "tags[2]",
  "message": "must match pattern \"^[a-z0-9-]+$\""
}
```

**Fix:** Use lowercase alphanumeric with hyphens:
```json
{
  "tags": ["git", "best-practice", "ci-cd"]  // ✓ Valid
  // "tags": ["Git", "Best_Practice"]  ✗ Invalid (uppercase, underscore)
}
```

### 6. Empty Items Array

**Error:**
```json
{
  "field": "items",
  "message": "must NOT have fewer than 1 items"
}
```

**Fix:** Include at least one knowledge item:
```json
{
  "items": [
    {
      "id": "...",
      "type": "golden-path",
      // ... rest of item
    }
  ]
}
```

## Schema Evolution

### Version History

- **v1.0** (2025-01-26): Initial comprehensive schema
  - All template and item fields
  - Complete enum definitions
  - Validation constraints
  - Maturity footprint support

### Making Changes

When modifying the schema:

1. **Update `marketplace-template.schema.json`**
2. **Update this README** with new constraints
3. **Update `SchemaValidator.ts`** if validation logic changes
4. **Update `types.ts`** if TypeScript interfaces change
5. **Test with existing bundled templates** to ensure backward compatibility
6. **Version the schema** in `$id` field if breaking changes

### Backward Compatibility

The schema is designed to be backward compatible:

- New optional fields can be added without breaking existing templates
- Required fields should not be added to existing objects
- Enum values should not be removed (can add new ones)
- Pattern constraints should not become stricter

## Tooling & IDE Support

### VS Code

Add to `.vscode/settings.json` for auto-completion and validation:

```json
{
  "json.schemas": [
    {
      "fileMatch": [
        "**/knowledge/bundled-templates/*.json",
        "**/.agent-brain/templates/*.json"
      ],
      "url": "./packages/core/src/domains/knowledge/schemas/marketplace-template.schema.json"
    }
  ]
}
```

### Online Validation

Use online JSON Schema validators:
- https://www.jsonschemavalidator.net/
- https://jsonschemalint.com/

Paste the schema and your template JSON to validate.

## Additional Resources

- [JSON Schema Documentation](https://json-schema.org/understanding-json-schema/)
- [AJV Documentation](https://ajv.js.org/)
- [MarketplaceTemplate TypeScript Interface](../types.ts)
- [SchemaValidator Implementation](../validation/structure/SchemaValidator.ts)

## Examples

See `bundled-templates/` directory for complete, validated examples:
- `agent-brain-base-template.json` - Comprehensive template with multiple item types
- `reza-rezvani-claude-md-essentials.json` - Documentation-focused template
- `general-learnings.json` - User-editable learning template

Each bundled template has been validated against this schema and can serve as a reference.
