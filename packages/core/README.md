# @agent-brain/core

Core platform package for the Agent-Brain Platform with unified domain architecture.

## Structure

```
src/
├── domains/           [Business domains]
│   ├── events/        [Event System Foundation]
│   ├── intelligence/  [Pattern & Learning Engine]
│   ├── providers/     [Data Providers]
│   ├── visualization/ [Timeline Rendering & UI]
│   └── extension/     [VSCode Integration]
└── infrastructure/    [Cross-cutting Concerns]
    ├── registries/    [Registry Pattern]
    ├── logging/       [Logger & Pathway Logging]
    ├── testing/       [Pathway Testing Framework]
    ├── storage/       [File Storage]
    └── config/        [Feature Flags]
```

## Installation

```bash
npm install
npm run build
```

## Testing

```bash
npm test
npm run test:pathways
```
