# Code Structure Review Module - Final Implementation Guide
## Category-Based Visual Code Analysis with Progressive Disclosure

**Purpose**: Help developers of all levels understand code structure and health through intuitive, categorized visualizations  
**Version**: 2.0 Final  
**Date**: 2025-01-07

---

## 1. Module Overview

### Core Philosophy
- **Novice-First**: Default to simple, visual representations
- **Progressive Disclosure**: Complexity revealed as users grow
- **Category-Based**: Organized analysis like threading/knowledge systems
- **Actionable**: Every insight leads to a concrete action
- **Educational**: Learn while reviewing

### Primary Goals
1. **Instant Understanding**: Visual health indicators at a glance
2. **Progressive Depth**: From "76% tested" to mutation testing scores
3. **Maturity-Aware**: UI and AI prompts adapt to user level
4. **Test Coverage Focus**: Critical for AI-generated code quality
5. **Extensible Categories**: Custom analysis for team needs

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│         Category Management System                   │
│    (Orchestrates all analysis categories)            │
└──────────────────────┬──────────────────────────────┘
                       │
├──────────────────────┼──────────────────────────────┤
│                      │                              │
▼                      ▼                              ▼
Test Coverage    Code Health    Dependencies    Security
Analyzer         Analyzer       Analyzer        Analyzer
│                      │                              │
└──────────────────────┼──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Code Analysis Engine                    │
│   (Core metrics, AST parsing, pattern detection)     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│      Progressive Disclosure WebView Panel            │
│         (Adaptive UI based on user maturity)         │
└─────────────────────────────────────────────────────┘
```

---

## 3. Category System Implementation

### 3.1 Base Category Structure

```typescript
interface AnalysisCategory {
  // Identity
  id: string;
  name: string;
  icon: string;
  description: string;
  priority: number;  // Display order
  
  // Progressive views
  views: {
    summary: SummaryView;      // Novice: One-line status
    detail: DetailView;        // Intermediate: Breakdown
    deepDive: DeepDiveView;    // Advanced: Full analysis
    expert: ExpertView;        // Expert: Custom queries
  };
  
  // Maturity-aware prompts
  aiPrompts: Map<MaturityLevel, PromptTemplate>;
  
  // Thresholds for health status
  thresholds: {
    good: number;
    warning: number;
    critical: number;
  };
  
  // Methods
  analyze(files: SourceFile[]): CategoryAnalysis;
  generateReport(): Report;
  suggestFixes(): Fix[];
}

enum MaturityLevel {
  NOVICE = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  EXPERT = 4
}
```

### 3.2 Core Categories

#### Test Coverage Category (Priority 1)

```typescript
class TestCoverageCategory implements AnalysisCategory {
  id = 'test-coverage';
  name = 'Test Coverage';
  icon = '🧪';
  priority = 1;
  
  thresholds = {
    good: 80,
    warning: 60,
    critical: 40
  };
  
  views = {
    summary: {
      render: (data: CoverageData) => ({
        display: this.getCoverageBar(data.percentage),
        status: this.getStatus(data.percentage),
        message: `${data.percentage}% tested`,
        badge: this.getBadge(data.percentage)
      })
    },
    
    detail: {
      render: (data: CoverageData) => ({
        lineCoverage: data.lines,
        branchCoverage: data.branches,
        functionCoverage: data.functions,
        statementCoverage: data.statements,
        untestedFiles: data.files.filter(f => f.coverage === 0),
        criticalGaps: this.findCriticalGaps(data),
        trends: this.calculateTrends(data.history)
      })
    },
    
    deepDive: {
      render: (data: CoverageData) => ({
        mutationScore: data.mutation?.score,
        survivedMutants: data.mutation?.survived,
        pathCoverage: data.paths,
        assertionDensity: data.assertions / data.tests,
        testMaintainability: this.calculateMaintainability(data.tests),
        flakiness: data.flakyTests / data.totalTests,
        recommendations: this.generateRecommendations(data)
      })
    },
    
    expert: {
      render: (data: CoverageData) => ({
        contractTests: this.analyzeContracts(data),
        propertyBasedSuggestions: this.suggestProperties(data),
        integrationGaps: this.findIntegrationGaps(data),
        performanceTests: this.analyzePerformanceTests(data),
        customQueries: this.enableQueryEngine(data)
      })
    }
  };
  
  aiPrompts = new Map([
    [MaturityLevel.NOVICE, `
      Look at [filename] which has no tests.
      Create simple tests that:
      1. Check if the main function works
      2. Check if it handles errors
      3. Check the output is correct
      Use simple assertions like expect(result).toBe(expected)
    `],
    
    [MaturityLevel.INTERMEDIATE, `
      Analyze [filename] with [coverage]% coverage.
      Generate tests for:
      - Uncovered lines: [lines]
      - Missing branches: [branches]
      - Edge cases
      Follow AAA pattern (Arrange, Act, Assert)
      Include error scenarios and boundary values
    `],
    
    [MaturityLevel.ADVANCED, `
      Review test quality for [module]:
      Current mutation score: [score]%
      
      Generate:
      - Tests to kill survived mutants
      - Integration tests for uncovered paths
      - Property-based tests for invariants
      - Performance regression tests
      Consider: mocking strategies, test isolation, flakiness
    `],
    
    [MaturityLevel.EXPERT, `
      Design comprehensive test strategy for [system]:
      
      Analyze:
      - Contract testing requirements
      - Chaos engineering scenarios
      - Load testing patterns
      - Security test cases
      - Accessibility testing
      
      Provide:
      - Test architecture recommendations
      - CI/CD integration strategy
      - Test data management approach
      - Coverage vs. quality trade-offs
    `]
  ]);
}
```

#### Code Health Category (Priority 2)

```typescript
class CodeHealthCategory implements AnalysisCategory {
  id = 'code-health';
  name = 'Code Health';
  icon = '💪';
  priority = 2;
  
  views = {
    summary: {
      render: (data: HealthData) => ({
        display: `${this.getGrade(data.score)} (${data.score}/100)`,
        topIssues: data.issues.slice(0, 2),
        badge: this.getHealthBadge(data.score)
      })
    },
    
    detail: {
      render: (data: HealthData) => ({
        complexFiles: data.files.filter(f => f.complexity > 20),
        godObjects: data.godObjects,
        codeSmells: data.smells,
        duplications: data.duplicates,
        technicalDebt: this.calculateDebt(data)
      })
    },
    
    deepDive: {
      render: (data: HealthData) => ({
        cyclomaticComplexity: data.cyclomatic,
        cognitiveComplexity: data.cognitive,
        halsteadMetrics: data.halstead,
        maintainabilityIndex: data.maintainability,
        solidViolations: this.checkSolid(data),
        patterns: this.detectPatterns(data)
      })
    }
  };
}
```

#### Additional Core Categories

```typescript
const categories = [
  new DependenciesCategory(),    // 🔗 Coupling, circular deps
  new SecurityCategory(),        // 🔒 Vulnerabilities, OWASP
  new PerformanceCategory(),     // ⚡ Big-O, memory, bottlenecks
  new DocumentationCategory(),   // 📚 Coverage, quality, examples
  new ArchitectureCategory(),    // 🏗️ Layer violations, patterns
  new AICodeQualityCategory()    // 🤖 AI-specific patterns
];
```

---

## 4. Progressive Disclosure UI

### 4.1 Main Dashboard

```typescript
class CodeStructureDashboard {
  private userLevel: MaturityLevel = MaturityLevel.NOVICE;
  private expandedCategories: Set<string> = new Set();
  
  render(): HTMLElement {
    return `
      <div class="dashboard">
        <!-- Header with level selector -->
        <header>
          <h1>Code Analysis</h1>
          <select id="maturity-level">
            <option value="1">👶 Novice</option>
            <option value="2">🧑 Intermediate</option>
            <option value="3">👨‍💼 Advanced</option>
            <option value="4">🧙 Expert</option>
          </select>
          <button id="settings">⚙️</button>
        </header>
        
        <!-- Category filters -->
        <div class="filters">
          <button class="filter-active">All</button>
          <button>Issues Only</button>
          <button>Critical</button>
          ${this.renderCustomFilters()}
        </div>
        
        <!-- Category cards -->
        <div class="categories">
          ${this.renderCategories()}
        </div>
        
        <!-- File explorer with badges -->
        <div class="file-explorer">
          ${this.renderFilesWithBadges()}
        </div>
      </div>
    `;
  }
  
  renderCategories(): string {
    return this.categories
      .sort((a, b) => a.priority - b.priority)
      .map(category => this.renderCategory(category))
      .join('');
  }
  
  renderCategory(category: AnalysisCategory): string {
    const analysis = category.analyze(this.files);
    const isExpanded = this.expandedCategories.has(category.id);
    
    return `
      <div class="category-card" data-category="${category.id}">
        <div class="category-header" onclick="toggleCategory('${category.id}')">
          <span class="icon">${category.icon}</span>
          <span class="name">${category.name}</span>
          <span class="summary">${this.renderSummary(category, analysis)}</span>
          <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
        </div>
        
        ${isExpanded ? `
          <div class="category-body">
            ${this.renderExpandedView(category, analysis)}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  renderExpandedView(category: AnalysisCategory, analysis: any): string {
    switch(this.userLevel) {
      case MaturityLevel.NOVICE:
        return this.renderSimpleDetails(category, analysis);
      case MaturityLevel.INTERMEDIATE:
        return this.renderDetailView(category, analysis);
      case MaturityLevel.ADVANCED:
        return this.renderDeepDive(category, analysis);
      case MaturityLevel.EXPERT:
        return this.renderExpertView(category, analysis);
    }
  }
}
```

### 4.2 Visual Components

#### Coverage Bar Component

```typescript
class CoverageBar {
  render(percentage: number): HTMLElement {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    const color = this.getColor(percentage);
    
    return `
      <div class="coverage-bar">
        <div class="bar" style="background: ${color}">
          ${'█'.repeat(filled)}${'░'.repeat(empty)}
        </div>
        <span class="percentage">${percentage}%</span>
      </div>
    `;
  }
  
  private getColor(percentage: number): string {
    if (percentage >= 80) return '#10b981'; // Green
    if (percentage >= 60) return '#f59e0b'; // Yellow
    if (percentage >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }
}
```

#### File Health Bubble Chart

```typescript
class FileHealthBubbles {
  render(files: FileMetrics[]): void {
    const bubble = d3.pack()
      .size([this.width, this.height])
      .padding(5);
    
    const root = d3.hierarchy({ children: files })
      .sum(d => d.linesOfCode)
      .sort((a, b) => b.value - a.value);
    
    const nodes = bubble(root).descendants().filter(d => !d.children);
    
    // Create interactive bubbles
    const bubbles = this.svg.selectAll('.bubble')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'bubble')
      .attr('transform', d => `translate(${d.x},${d.y})`);
    
    // Size = LOC, Color = Health
    bubbles.append('circle')
      .attr('r', d => d.r)
      .style('fill', d => this.getHealthColor(d.data))
      .style('opacity', 0.7)
      .on('click', d => this.showFileDetails(d.data))
      .on('mouseover', d => this.showTooltip(d.data));
    
    // Add file name labels
    bubbles.append('text')
      .text(d => this.truncateName(d.data.name))
      .style('font-size', d => Math.min(d.r / 3, 14))
      .style('text-anchor', 'middle');
    
    // Add issue indicators
    bubbles.append('text')
      .attr('class', 'issue-indicator')
      .attr('y', d => -d.r + 10)
      .text(d => this.getIssueIcon(d.data))
      .style('font-size', '16px');
  }
}
```

---

## 5. Test Coverage Deep Dive

### 5.1 Coverage Analysis Engine

```typescript
class TestCoverageAnalyzer {
  async analyzeCoverage(workspace: string): Promise<CoverageReport> {
    // Run coverage tools
    const nycCoverage = await this.runNyc(workspace);
    const jestCoverage = await this.runJest(workspace);
    
    // Merge coverage data
    const merged = this.mergeCoverage([nycCoverage, jestCoverage]);
    
    // Calculate metrics
    return {
      overall: this.calculateOverall(merged),
      byFile: this.calculateByFile(merged),
      uncovered: this.findUncoveredCode(merged),
      critical: this.identifyCriticalGaps(merged),
      quality: await this.assessTestQuality(merged),
      trends: await this.analyzeTrends(merged)
    };
  }
  
  private identifyCriticalGaps(coverage: Coverage): CriticalGap[] {
    const gaps = [];
    
    // Find uncovered error handlers
    for (const file of coverage.files) {
      const ast = this.parseFile(file);
      const errorHandlers = this.findErrorHandlers(ast);
      
      for (const handler of errorHandlers) {
        if (!this.isCovered(handler, coverage)) {
          gaps.push({
            type: 'error-handler',
            location: handler.location,
            risk: 'HIGH',
            suggestion: 'Add tests for error scenarios'
          });
        }
      }
    }
    
    // Find uncovered payment/security code
    const criticalPatterns = [
      /payment|billing|charge/i,
      /auth|security|password/i,
      /encrypt|decrypt|token/i
    ];
    
    for (const pattern of criticalPatterns) {
      const matches = this.findPattern(pattern, coverage);
      gaps.push(...matches.filter(m => !m.covered));
    }
    
    return gaps;
  }
  
  async assessTestQuality(coverage: Coverage): Promise<QualityMetrics> {
    return {
      assertionDensity: await this.calculateAssertionDensity(),
      testMaintainability: await this.assessMaintainability(),
      mutationScore: await this.runMutationTesting(),
      flakiness: await this.detectFlakiness(),
      duplication: await this.findTestDuplication()
    };
  }
}
```

### 5.2 Coverage Visualization

```typescript
class CoverageVisualization {
  renderHeatmap(coverage: FileCoverage[]): void {
    // Create grid where each cell is a file
    // Color intensity = coverage percentage
    // Size = file importance (LOC * complexity)
    
    const grid = d3.select('#coverage-heatmap')
      .selectAll('.file-cell')
      .data(coverage);
    
    grid.enter().append('div')
      .attr('class', 'file-cell')
      .style('background', d => this.coverageToColor(d.percentage))
      .style('width', d => this.sizeByImportance(d))
      .style('height', d => this.sizeByImportance(d))
      .attr('title', d => `${d.file}: ${d.percentage}% covered`)
      .on('click', d => this.drillIntoFile(d));
  }
  
  renderSunburst(coverage: Coverage): void {
    // Hierarchical view: project -> folders -> files
    // Arc size = LOC, Color = coverage
    
    const partition = d3.partition()
      .size([2 * Math.PI, this.radius]);
    
    const root = d3.hierarchy(coverage.tree)
      .sum(d => d.linesOfCode)
      .sort((a, b) => b.value - a.value);
    
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);
    
    // Render with coverage-based colors
    this.svg.selectAll('path')
      .data(partition(root).descendants())
      .enter().append('path')
      .attr('d', arc)
      .style('fill', d => this.coverageToColor(d.data.coverage));
  }
}
```

---

## 6. Maturity-Aware Features

### 6.1 Adaptive UI

```typescript
class AdaptiveUI {
  private userProfile: UserProfile;
  
  async initialize(): Promise<void> {
    // Load user profile
    this.userProfile = await this.loadProfile();
    
    // Track feature usage
    this.trackUsage();
    
    // Suggest level advancement
    this.monitorReadiness();
  }
  
  renderBasedOnLevel(component: Component, data: any): HTMLElement {
    const level = this.userProfile.maturityLevel;
    
    switch(level) {
      case MaturityLevel.NOVICE:
        return this.renderNoviceView(component, data);
        
      case MaturityLevel.INTERMEDIATE:
        // Show more metrics, enable drill-down
        return this.renderIntermediateView(component, data);
        
      case MaturityLevel.ADVANCED:
        // Full metrics, patterns, suggestions
        return this.renderAdvancedView(component, data);
        
      case MaturityLevel.EXPERT:
        // Custom queries, raw data access
        return this.renderExpertView(component, data);
    }
  }
  
  private monitorReadiness(): void {
    // Track which features user explores
    this.eventBus.on('feature-used', (feature) => {
      this.userProfile.featuresUsed.add(feature);
      
      // Suggest advancement when ready
      if (this.isReadyToAdvance()) {
        this.suggestAdvancement();
      }
    });
  }
  
  private isReadyToAdvance(): boolean {
    const usage = this.userProfile.featuresUsed;
    const level = this.userProfile.maturityLevel;
    
    const requirements = {
      [MaturityLevel.NOVICE]: ['view-details', 'run-analysis'],
      [MaturityLevel.INTERMEDIATE]: ['drill-down', 'compare-metrics'],
      [MaturityLevel.ADVANCED]: ['custom-rules', 'deep-analysis']
    };
    
    const required = requirements[level];
    return required.every(f => usage.has(f));
  }
  
  private suggestAdvancement(): void {
    vscode.window.showInformationMessage(
      'You seem ready for more advanced features. Would you like to unlock them?',
      'Yes, show me more',
      'Not yet'
    ).then(choice => {
      if (choice === 'Yes, show me more') {
        this.userProfile.maturityLevel++;
        this.saveProfile();
        this.refresh();
      }
    });
  }
}
```

### 6.2 Educational Tooltips

```typescript
class EducationalTooltips {
  private tooltips = {
    godObject: {
      novice: "This file is doing too many things. Like a Swiss Army knife - useful but hard to maintain.",
      intermediate: "God Object: A class with too many responsibilities. Violates Single Responsibility Principle.",
      advanced: "God Object detected: 23 methods, 847 LOC, 5+ responsibilities. Consider domain decomposition.",
      expert: "Metrics: WMC=45, DIT=3, NOC=0, CBO=18. Suggest Extract Class refactoring pattern."
    },
    
    testCoverage: {
      novice: "This shows how much of your code is tested. Green is good!",
      intermediate: "Test coverage: Lines covered by tests / Total lines × 100%",
      advanced: "Coverage types: Line, Branch, Function, Statement. Consider path coverage.",
      expert: "Current: Line=76%, Branch=62%, MC/DC=34%. Mutation score: 45%."
    },
    
    complexity: {
      novice: "How many paths through the code. More paths = harder to understand.",
      intermediate: "Cyclomatic complexity: Number of linearly independent paths.",
      advanced: "CC=35. Cognitive complexity=42. Consider extracting methods.",
      expert: "McCabe=35, Cognitive=42, Essential=12. Halstead: n1=45, n2=89, N1=234, N2=567."
    }
  };
  
  show(concept: string, level: MaturityLevel): void {
    const tooltip = this.tooltips[concept];
    const text = tooltip[level];
    
    // Show with appropriate styling
    this.display({
      text,
      className: `tooltip-${level}`,
      learnMoreLink: this.getLearnMoreLink(concept, level)
    });
  }
}
```

---

## 7. Custom Category System

### 7.1 Custom Category Creation

```typescript
class CustomCategoryBuilder {
  createCategory(config: CustomCategoryConfig): AnalysisCategory {
    return {
      id: config.id,
      name: config.name,
      icon: config.icon || '📊',
      
      analyze: (files) => {
        const results = [];
        
        for (const file of files) {
          for (const rule of config.rules) {
            const violations = this.checkRule(file, rule);
            results.push(...violations);
          }
        }
        
        return {
          violations: results,
          score: this.calculateScore(results),
          summary: this.generateSummary(results)
        };
      },
      
      aiPrompts: config.prompts || this.generateDefaultPrompts(config)
    };
  }
  
  // Example: Team-specific category
  createTeamStandardsCategory(): AnalysisCategory {
    return this.createCategory({
      id: 'team-standards',
      name: 'Team Standards',
      icon: '👥',
      rules: [
        {
          name: 'File naming convention',
          pattern: /^[a-z]+(-[a-z]+)*\.(ts|tsx)$/,
          message: 'Use kebab-case for file names'
        },
        {
          name: 'Max file size',
          check: (file) => file.lines <= 200,
          message: 'Files should be under 200 lines'
        },
        {
          name: 'Required file header',
          pattern: /\/\*\*\n \* @author/,
          message: 'Missing required file header'
        }
      ]
    });
  }
}
```

### 7.2 Category Marketplace

```typescript
interface CategoryMarketplace {
  // Share categories with community
  available: [
    {
      name: 'React Best Practices',
      author: 'Facebook',
      downloads: 45000,
      rating: 4.8
    },
    {
      name: 'Node.js Security',
      author: 'OWASP',
      downloads: 23000,
      rating: 4.9
    },
    {
      name: 'Accessibility Audit',
      author: 'a11y-project',
      downloads: 18000,
      rating: 4.7
    }
  ];
  
  install(categoryId: string): Promise<void>;
  publish(category: AnalysisCategory): Promise<void>;
  rate(categoryId: string, rating: number): Promise<void>;
}
```

---

## 8. Integration Points

### 8.1 Threading System Integration

```typescript
class ThreadingIntegration {
  linkAnalysisToThread(
    issue: CodeIssue,
    thread: Thread
  ): void {
    // Connect code issues to discussion threads
    thread.addContext({
      type: 'code-issue',
      category: issue.category,
      severity: issue.severity,
      file: issue.location.file,
      line: issue.location.line
    });
    
    // Show in UI
    issue.relatedThreads.push(thread.id);
  }
  
  generateThreadFromIssue(issue: CodeIssue): Thread {
    return {
      title: `Fix ${issue.type}: ${issue.file}`,
      context: {
        issue,
        suggestedFixes: issue.fixes,
        aiPrompt: this.generatePrompt(issue)
      }
    };
  }
}
```

### 8.2 Knowledge System Integration

```typescript
class KnowledgeIntegration {
  suggestRelevantKnowledge(
    category: AnalysisCategory,
    issues: CodeIssue[]
  ): KnowledgeItem[] {
    const suggestions = [];
    
    // Map issues to knowledge items
    for (const issue of issues) {
      const patterns = this.knowledgeBase.findPatterns({
        type: issue.type,
        category: category.id,
        tags: issue.tags
      });
      
      suggestions.push(...patterns);
    }
    
    // Sort by relevance
    return suggestions.sort((a, b) => 
      b.relevanceScore - a.relevanceScore
    );
  }
  
  createLearningFromFix(
    issue: CodeIssue,
    fix: AppliedFix
  ): void {
    this.knowledgeBase.addLearning({
      trigger: issue.type,
      context: issue.context,
      solution: fix.code,
      outcome: fix.result,
      category: issue.category
    });
  }
}
```

### 8.3 Git Integration

```typescript
class GitIntegration {
  async analyzeCodeEvolution(
    file: string,
    metric: string
  ): Promise<Evolution> {
    const history = await this.git.getFileHistory(file);
    const metrics = [];
    
    for (const commit of history) {
      const version = await this.git.getFileAtCommit(file, commit);
      const analysis = await this.analyzer.analyze(version);
      
      metrics.push({
        commit: commit.hash,
        date: commit.date,
        author: commit.author,
        value: analysis[metric]
      });
    }
    
    return {
      file,
      metric,
      timeline: metrics,
      trend: this.calculateTrend(metrics)
    };
  }
  
  async identifyHotspots(): Promise<Hotspot[]> {
    const fileChanges = await this.git.getChangeFrequency();
    const complexity = await this.analyzer.getComplexity();
    
    // Files with high complexity AND high change frequency
    return fileChanges
      .filter(f => complexity[f.file] > 20)
      .filter(f => f.changes > 10)
      .map(f => ({
        file: f.file,
        risk: f.changes * complexity[f.file],
        message: 'High complexity + frequent changes = bug risk'
      }))
      .sort((a, b) => b.risk - a.risk);
  }
}
```

---

## 9. File Badges System

### 9.1 Badge Generation

```typescript
class FileBadgeGenerator {
  generateBadges(file: FileAnalysis): Badge[] {
    const badges = [];
    
    // Test coverage badge
    badges.push({
      type: 'coverage',
      icon: '🧪',
      text: `${file.coverage}%`,
      color: this.getCoverageColor(file.coverage),
      tooltip: `Test coverage: ${file.coverage}%`
    });
    
    // Health badge
    badges.push({
      type: 'health',
      icon: '💪',
      text: this.getHealthGrade(file.health),
      color: this.getHealthColor(file.health),
      tooltip: `Code health: ${file.health}/100`
    });
    
    // Security badge
    if (file.securityIssues > 0) {
      badges.push({
        type: 'security',
        icon: '🔒',
        text: file.securityIssues.toString(),
        color: 'red',
        tooltip: `${file.securityIssues} security issues`
      });
    }
    
    // Performance badge
    if (file.performanceIssues > 0) {
      badges.push({
        type: 'performance',
        icon: '⚡',
        text: 'Slow',
        color: 'orange',
        tooltip: 'Performance issues detected'
      });
    }
    
    return badges;
  }
  
  renderInExplorer(file: string, badges: Badge[]): void {
    // Add badges to VS Code file explorer
    vscode.window.createTreeView('codeAnalysisBadges', {
      treeDataProvider: {
        getTreeItem: (element) => {
          const item = new vscode.TreeItem(element.label);
          item.description = badges
            .map(b => `${b.icon}${b.text}`)
            .join(' ');
          return item;
        }
      }
    });
  }
}
```

---

## 10. Performance Optimization

### 10.1 Incremental Analysis

```typescript
class IncrementalAnalyzer {
  private cache: Map<string, FileAnalysis> = new Map();
  private dependencyGraph: DependencyGraph;
  
  async analyzeChange(changedFile: string): Promise<void> {
    // Only re-analyze changed file and dependents
    const affected = this.dependencyGraph.getDependents(changedFile);
    affected.add(changedFile);
    
    for (const file of affected) {
      this.cache.delete(file);
      const analysis = await this.analyzeFile(file);
      this.cache.set(file, analysis);
    }
    
    // Update aggregated metrics
    this.updateMetrics();
  }
  
  async analyzeWorkspace(): Promise<WorkspaceAnalysis> {
    // Use parallel processing
    const files = await this.findFiles();
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(f => this.analyzeFile(f))
      );
      results.push(...batchResults);
      
      // Update progress
      this.updateProgress((i + batchSize) / files.length);
    }
    
    return this.aggregateResults(results);
  }
}
```

### 10.2 Virtual Rendering

```typescript
class VirtualRenderer {
  renderLargeList(items: any[], container: HTMLElement): void {
    const itemHeight = 80;
    const containerHeight = container.clientHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    let scrollTop = 0;
    let startIndex = 0;
    
    container.addEventListener('scroll', () => {
      scrollTop = container.scrollTop;
      startIndex = Math.floor(scrollTop / itemHeight);
      this.renderVisible(items, startIndex, visibleCount);
    });
    
    // Initial render
    this.renderVisible(items, 0, visibleCount);
  }
  
  private renderVisible(
    items: any[],
    start: number,
    count: number
  ): void {
    const visible = items.slice(start, start + count);
    // Only render visible items
    this.container.innerHTML = visible
      .map(item => this.renderItem(item))
      .join('');
  }
}
```

---

## 11. AI Integration

### 11.1 Prompt Generation

```typescript
class AIPromptGenerator {
  generatePrompt(
    category: AnalysisCategory,
    issue: CodeIssue,
    userLevel: MaturityLevel,
    context: CodeContext
  ): string {
    // Get base prompt for category and level
    let prompt = category.aiPrompts.get(userLevel);
    
    // Inject specific context
    prompt = this.injectContext(prompt, {
      filename: context.file,
      issue: issue.description,
      metrics: issue.metrics,
      codeSnippet: context.snippet
    });
    
    // Add level-appropriate instructions
    prompt += this.getLevelInstructions(userLevel);
    
    // Add output format
    prompt += this.getOutputFormat(userLevel);
    
    return prompt;
  }
  
  private getLevelInstructions(level: MaturityLevel): string {
    const instructions = {
      [MaturityLevel.NOVICE]: `
        Please explain everything step by step.
        Use simple language and lots of comments.
        Focus on making it work first, then improve.
      `,
      [MaturityLevel.INTERMEDIATE]: `
        Include best practices and explain why.
        Consider edge cases and error handling.
        Use appropriate design patterns.
      `,
      [MaturityLevel.ADVANCED]: `
        Focus on performance and scalability.
        Include comprehensive error handling.
        Consider security implications.
        Suggest alternative approaches.
      `,
      [MaturityLevel.EXPERT]: `
        Provide multiple implementation strategies.
        Include performance benchmarks.
        Consider distributed system implications.
        Suggest architectural improvements.
      `
    };
    
    return instructions[level];
  }
}
```

---

## 12. Implementation Phases

### Phase 1: Core Infrastructure (Days 1-3)
- [ ] Category system architecture
- [ ] Base analysis engine
- [ ] Test coverage analyzer
- [ ] File system scanner

### Phase 2: Essential Categories (Days 4-6)
- [ ] Test Coverage category
- [ ] Code Health category  
- [ ] Dependencies category
- [ ] Basic visualizations

### Phase 3: Progressive UI (Days 7-9)
- [ ] Maturity level selector
- [ ] Progressive disclosure views
- [ ] Category expansion/collapse
- [ ] Educational tooltips

### Phase 4: Advanced Features (Days 10-12)
- [ ] Security category
- [ ] Performance category
- [ ] Custom category builder
- [ ] AI prompt generation

### Phase 5: Visualizations (Days 13-15)
- [ ] D3.js bubble chart
- [ ] Coverage heatmap
- [ ] Dependency graph
- [ ] File badges

### Phase 6: Integration (Days 16-18)
- [ ] Threading system links
- [ ] Knowledge suggestions
- [ ] Git history analysis
- [ ] Session tracking

### Phase 7: Polish & Performance (Days 19-21)
- [ ] Incremental analysis
- [ ] Virtual rendering
- [ ] Caching strategy
- [ ] Error handling
- [ ] User preferences
- [ ] Documentation

---

## 13. Configuration Schema

```json
{
  "agentBrain.codeStructure.enabled": true,
  "agentBrain.codeStructure.defaultMaturityLevel": "novice",
  "agentBrain.codeStructure.categories": {
    "testCoverage": {
      "enabled": true,
      "thresholds": {
        "good": 80,
        "warning": 60,
        "critical": 40
      }
    },
    "codeHealth": {
      "enabled": true,
      "maxComplexity": 20,
      "maxFileSize": 300
    },
    "security": {
      "enabled": true,
      "scanLevel": "standard"
    },
    "custom": []
  },
  "agentBrain.codeStructure.badges": {
    "showInExplorer": true,
    "compactMode": false
  },
  "agentBrain.codeStructure.ai": {
    "promptStyle": "detailed",
    "includeContext": true,
    "maxPromptLength": 2000
  }
}
```

---

## Summary

This comprehensive module provides:

1. **Category-based organization** matching successful patterns from threading/knowledge systems
2. **Test coverage as a first-class concern** with deep analysis capabilities
3. **Progressive disclosure** growing from novice to expert views
4. **Maturity-aware AI prompts** providing appropriate guidance at each level
5. **Visual-first design** making complexity immediately understandable
6. **Extensible categories** allowing team customization
7. **Rich integrations** with existing Agent-Brain systems

The system starts simple for novices with color-coded health scores and gradually reveals advanced features like mutation testing and custom AST queries as users grow in expertise.

**Key Success Metrics:**
- Novices understand code health within 30 seconds
- 80% of issues have actionable fixes
- Progressive disclosure increases feature adoption by 50%
- AI prompts improve based on user maturity level
- Custom categories enable team-specific standards