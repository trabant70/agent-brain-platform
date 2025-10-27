# Threading System Extension: Data Correctness Monitoring
## Beyond Performance - Tracking Values, Types, and Transformations

### Executive Summary

This extension enhances the threading system to monitor data correctness throughout execution, enabling debugging of wrong types, values, structures, and transformations. The system provides traceable visualization of data flow, making it easier for human operators to follow and validate agent implementations.

---

## 1. Enhanced Data Contract System

### 1.1 Extended ThreadSpec with Full Data Contracts

```typescript
// src/threading/contracts/DataContract.ts
export interface DataContract {
  type: string | TypeDefinition;
  shape?: ShapeDefinition;
  constraints?: ConstraintDefinition;
  transformations?: TransformationRules;
  examples?: any[];
}

export interface TypeDefinition {
  base: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined';
  nullable?: boolean;
  union?: TypeDefinition[];  // For union types
  literal?: any;  // For literal types
  generic?: string;  // For generic types like 'T' or 'Array<T>'
}

export interface ShapeDefinition {
  [key: string]: {
    type: string | TypeDefinition;
    required?: boolean;
    default?: any;
    description?: string;
    constraints?: ConstraintDefinition;
  };
}

export interface ConstraintDefinition {
  // Numeric constraints
  min?: number;
  max?: number;
  range?: [number, number];
  precision?: number;
  
  // String constraints
  pattern?: RegExp | string;
  minLength?: number;
  maxLength?: number;
  enum?: any[];
  
  // Array constraints
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  itemType?: string | TypeDefinition;
  
  // Custom validators
  validate?: (value: any) => boolean | string;  // Return true or error message
  invariants?: string[];  // Expressions that must evaluate to true
}

export interface TransformationRules {
  [key: string]: {
    from: string | string[];  // Source path(s)
    to: string | string[];    // Destination path(s)
    transform?: (value: any) => any;  // Optional transformation function
    relationship?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    preserves?: string[];  // Properties that should be preserved
    validates?: string[];  // Validation rules for transformation
  };
}
```

### 1.2 Enhanced ThreadSpec Implementation

```typescript
// src/threading/decorators/EnhancedThreadSpec.ts
export interface EnhancedThreadSpecOptions {
  threads: string[];
  
  // Performance expectations (existing)
  timing?: { min: number; max: number; unit?: 'ms' | 's' };
  memory?: { max: number; unit?: 'MB' | 'KB' };
  
  // Data contract expectations (new)
  expects?: {
    params?: Record<string, DataContract>;
    context?: Record<string, DataContract>;  // Expected context state
    preconditions?: string[];  // Conditions that must be true before execution
  };
  
  produces?: {
    returns?: DataContract;
    mutations?: Record<string, DataContract>;  // Side effects on context
    postconditions?: string[];  // Conditions that must be true after execution
  };
  
  // Data flow expectations (new)
  dataFlow?: {
    transformations?: TransformationRules;
    preserves?: string[];  // Data that should remain unchanged
    sanitizes?: string[];  // Data that should be cleaned/validated
  };
  
  // Invariants that must always hold
  invariants?: string[];
  
  // Example input/output pairs for validation
  examples?: Array<{
    input: any[];
    output: any;
    description?: string;
  }>;
}

export function ThreadSpec(spec: EnhancedThreadSpecOptions) {
  return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
    // Store enhanced specification
    Reflect.defineMetadata('enhanced:threadspec', spec, target, propertyKey);
    
    // Register with contract validator
    ContractRegistry.register(`${target.constructor.name}.${propertyKey}`, spec);
    
    // Add to visualization system
    DataFlowVisualizer.registerFlow({
      function: `${target.constructor.name}.${propertyKey}`,
      expects: spec.expects,
      produces: spec.produces,
      dataFlow: spec.dataFlow
    });
  };
}
```

### 1.3 Usage Example

```typescript
class UserService {
  @ThreadSpec({
    threads: ['DATA_FLOW', 'VALIDATION'],
    expects: {
      params: {
        userId: {
          type: 'string',
          constraints: {
            pattern: /^[0-9a-f]{8}$/,
            minLength: 8,
            maxLength: 8
          }
        },
        options: {
          type: 'object',
          shape: {
            limit: {
              type: 'number',
              required: false,
              default: 10,
              constraints: { min: 1, max: 100 }
            },
            includeDeleted: {
              type: 'boolean',
              required: false,
              default: false
            },
            fields: {
              type: 'array',
              required: false,
              constraints: {
                itemType: 'string',
                enum: ['id', 'name', 'email', 'createdAt', 'updatedAt']
              }
            }
          }
        }
      },
      preconditions: [
        'this.isAuthenticated === true',
        'this.database.isConnected === true'
      ]
    },
    produces: {
      returns: {
        type: 'object',
        shape: {
          user: {
            type: 'object',
            required: true,
            shape: {
              id: { type: 'string', required: true },
              name: { type: 'string', required: true },
              email: { 
                type: 'string', 
                required: true,
                constraints: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
              }
            }
          },
          metadata: {
            type: 'object',
            shape: {
              fetchTime: { type: 'number' },
              fromCache: { type: 'boolean' }
            }
          }
        }
      },
      postconditions: [
        'returns.user.id === params.userId',
        'returns.metadata.fetchTime > 0'
      ]
    },
    dataFlow: {
      transformations: {
        userIdValidation: {
          from: 'params.userId',
          to: 'internal.validatedId',
          transform: (id: string) => id.toLowerCase().trim(),
          validates: ['is valid UUID format']
        },
        userMapping: {
          from: 'database.result',
          to: 'returns.user',
          relationship: 'one-to-one',
          preserves: ['id', 'name', 'email']
        }
      }
    },
    invariants: [
      'typeof params.userId === "string"',
      'returns.user.id === params.userId.toLowerCase()'
    ],
    examples: [
      {
        input: ['abc12345', { limit: 10 }],
        output: { user: { id: 'abc12345', name: 'John', email: 'john@example.com' } },
        description: 'Standard user fetch'
      }
    ]
  })
  @ThreadLog('DATA_FLOW', 'VALIDATION')
  async getUser(userId: string, options?: QueryOptions): Promise<UserResult> {
    // Implementation
  }
}
```

---

## 2. Enhanced ThreadLog with Value Tracking

### 2.1 Value Capture and Validation

```typescript
// src/threading/decorators/EnhancedThreadLog.ts
export function ThreadLog(...threads: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const spec = Reflect.getMetadata('enhanced:threadspec', target, propertyKey);
      const context = `${target.constructor.name}.${propertyKey}`;
      const executionId = generateExecutionId();
      
      // Create execution tracker
      const tracker = new ExecutionTracker(executionId, context, spec);
      
      // ENTRY: Capture and validate input
      const entryCapture = tracker.captureEntry({
        args,
        thisContext: this,
        timestamp: Date.now(),
        threads
      });
      
      // Validate input contract
      if (spec?.expects) {
        const validation = await validateDataContract(args, spec.expects.params);
        if (!validation.valid) {
          tracker.logContractViolation('input', validation);
          
          // Log detailed mismatch
          ThreadLogger.log({
            type: 'contract-violation',
            subtype: 'input',
            context,
            threads,
            executionId,
            expected: spec.expects.params,
            actual: captureActualTypes(args),
            violations: validation.violations,
            severity: 'error'
          });
        }
      }
      
      // Check preconditions
      if (spec?.expects?.preconditions) {
        const preconditionResults = await checkPreconditions(
          spec.expects.preconditions,
          { args, context: this }
        );
        tracker.logPreconditions(preconditionResults);
      }
      
      try {
        // Track data transformations during execution
        const proxyContext = createTrackingProxy(this, tracker);
        const result = await originalMethod.apply(proxyContext, args);
        
        // EXIT: Capture and validate output
        const exitCapture = tracker.captureExit({
          result,
          timestamp: Date.now(),
          mutations: tracker.getMutations()
        });
        
        // Validate output contract
        if (spec?.produces) {
          const validation = await validateDataContract(result, spec.produces.returns);
          if (!validation.valid) {
            tracker.logContractViolation('output', validation);
            
            ThreadLogger.log({
              type: 'contract-violation',
              subtype: 'output',
              context,
              threads,
              executionId,
              expected: spec.produces.returns,
              actual: captureActualType(result),
              violations: validation.violations,
              severity: 'error'
            });
          }
        }
        
        // Check postconditions
        if (spec?.produces?.postconditions) {
          const postconditionResults = await checkPostconditions(
            spec.produces.postconditions,
            { args, result, context: this }
          );
          tracker.logPostconditions(postconditionResults);
        }
        
        // Validate invariants
        if (spec?.invariants) {
          const invariantResults = await checkInvariants(
            spec.invariants,
            { args, result, context: this }
          );
          tracker.logInvariants(invariantResults);
        }
        
        // Log complete execution trace
        ThreadLogger.log({
          type: 'execution-trace',
          context,
          threads,
          executionId,
          trace: tracker.getCompleteTrace(),
          dataFlow: tracker.getDataFlow(),
          violations: tracker.getViolations(),
          transformations: tracker.getTransformations()
        });
        
        return result;
        
      } catch (error) {
        // Capture error state
        tracker.captureError({
          error,
          state: captureErrorState(this),
          timestamp: Date.now()
        });
        
        ThreadLogger.log({
          type: 'execution-error',
          context,
          threads: [...threads, 'ERROR_RECOVERY'],
          executionId,
          error: {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name
          },
          trace: tracker.getCompleteTrace(),
          lastValidState: tracker.getLastValidState(),
          violations: tracker.getViolations()
        });
        
        throw error;
      }
    };
    
    return descriptor;
  };
}
```

### 2.2 Execution Tracker Implementation

```typescript
// src/threading/tracking/ExecutionTracker.ts
export class ExecutionTracker {
  private timeline: ExecutionEvent[] = [];
  private dataSnapshots: Map<string, DataSnapshot> = new Map();
  private mutations: Mutation[] = [];
  private violations: ContractViolation[] = [];
  private transformations: DataTransformation[] = [];
  
  constructor(
    private executionId: string,
    private context: string,
    private spec: EnhancedThreadSpecOptions
  ) {}
  
  captureEntry(entry: EntryPoint): EntryCapture {
    const capture: EntryCapture = {
      timestamp: entry.timestamp,
      args: this.captureValues(entry.args),
      context: this.captureContextState(entry.thisContext),
      types: this.captureTypes(entry.args),
      shapes: this.captureShapes(entry.args),
      memory: this.captureMemoryState()
    };
    
    this.timeline.push({
      type: 'entry',
      timestamp: entry.timestamp,
      capture
    });
    
    this.dataSnapshots.set('entry', capture);
    
    return capture;
  }
  
  captureExit(exit: ExitPoint): ExitCapture {
    const capture: ExitCapture = {
      timestamp: exit.timestamp,
      result: this.captureValue(exit.result),
      type: this.captureType(exit.result),
      shape: this.captureShape(exit.result),
      mutations: exit.mutations,
      memory: this.captureMemoryState()
    };
    
    this.timeline.push({
      type: 'exit',
      timestamp: exit.timestamp,
      capture
    });
    
    this.dataSnapshots.set('exit', capture);
    
    return capture;
  }
  
  private captureValues(values: any[]): CapturedValue[] {
    return values.map(value => this.captureValue(value));
  }
  
  private captureValue(value: any): CapturedValue {
    return {
      raw: this.shouldCaptureRaw(value) ? value : undefined,
      type: typeof value,
      constructor: value?.constructor?.name,
      stringified: this.safeStringify(value),
      size: this.calculateSize(value),
      preview: this.generatePreview(value)
    };
  }
  
  private captureTypes(values: any[]): TypeInfo[] {
    return values.map(value => this.captureType(value));
  }
  
  private captureType(value: any): TypeInfo {
    return {
      primitive: typeof value,
      constructor: value?.constructor?.name,
      isArray: Array.isArray(value),
      isNull: value === null,
      isUndefined: value === undefined,
      customType: this.detectCustomType(value)
    };
  }
  
  private captureShapes(values: any[]): ShapeInfo[] {
    return values.map(value => this.captureShape(value));
  }
  
  private captureShape(value: any): ShapeInfo {
    if (typeof value !== 'object' || value === null) {
      return { type: 'primitive', value: typeof value };
    }
    
    if (Array.isArray(value)) {
      return {
        type: 'array',
        length: value.length,
        itemTypes: this.getArrayItemTypes(value),
        sample: value.slice(0, 3).map(v => this.captureShape(v))
      };
    }
    
    return {
      type: 'object',
      keys: Object.keys(value),
      shape: Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, this.captureType(v)])
      ),
      size: Object.keys(value).length
    };
  }
  
  getCompleteTrace(): ExecutionTrace {
    return {
      executionId: this.executionId,
      context: this.context,
      timeline: this.timeline,
      dataSnapshots: Array.from(this.dataSnapshots.entries()),
      mutations: this.mutations,
      violations: this.violations,
      transformations: this.transformations,
      summary: this.generateSummary()
    };
  }
  
  getDataFlow(): DataFlowDiagram {
    return {
      nodes: this.extractNodes(),
      edges: this.extractEdges(),
      transformations: this.transformations,
      violations: this.violations.map(v => ({
        node: v.location,
        type: v.type,
        severity: v.severity
      }))
    };
  }
}
```

---

## 3. Data Validation Engine

### 3.1 Contract Validator

```typescript
// src/threading/validation/ContractValidator.ts
export class ContractValidator {
  async validateDataContract(
    value: any,
    contract: DataContract
  ): Promise<ValidationResult> {
    const violations: Violation[] = [];
    
    // Type validation
    const typeResult = this.validateType(value, contract.type);
    if (!typeResult.valid) {
      violations.push({
        type: 'type-mismatch',
        expected: contract.type,
        actual: typeof value,
        path: '',
        message: typeResult.message
      });
    }
    
    // Shape validation for objects
    if (contract.shape && typeof value === 'object' && value !== null) {
      const shapeResult = this.validateShape(value, contract.shape);
      violations.push(...shapeResult.violations);
    }
    
    // Constraint validation
    if (contract.constraints) {
      const constraintResult = this.validateConstraints(value, contract.constraints);
      violations.push(...constraintResult.violations);
    }
    
    return {
      valid: violations.length === 0,
      violations,
      summary: this.generateSummary(violations)
    };
  }
  
  private validateShape(
    obj: any,
    shape: ShapeDefinition,
    path: string = ''
  ): ShapeValidationResult {
    const violations: Violation[] = [];
    
    // Check required fields
    for (const [key, field] of Object.entries(shape)) {
      const fieldPath = path ? `${path}.${key}` : key;
      
      if (field.required && !(key in obj)) {
        violations.push({
          type: 'missing-field',
          path: fieldPath,
          message: `Required field '${key}' is missing`
        });
        continue;
      }
      
      if (key in obj) {
        // Validate field type
        const fieldResult = this.validateType(obj[key], field.type);
        if (!fieldResult.valid) {
          violations.push({
            type: 'field-type-mismatch',
            path: fieldPath,
            expected: field.type,
            actual: typeof obj[key],
            message: fieldResult.message
          });
        }
        
        // Validate field constraints
        if (field.constraints) {
          const constraintResult = this.validateConstraints(obj[key], field.constraints);
          violations.push(...constraintResult.violations.map(v => ({
            ...v,
            path: fieldPath
          })));
        }
      }
    }
    
    // Check for unexpected fields
    const expectedKeys = new Set(Object.keys(shape));
    const actualKeys = Object.keys(obj);
    const unexpected = actualKeys.filter(k => !expectedKeys.has(k));
    
    if (unexpected.length > 0) {
      violations.push({
        type: 'unexpected-fields',
        path,
        fields: unexpected,
        message: `Unexpected fields: ${unexpected.join(', ')}`
      });
    }
    
    return { valid: violations.length === 0, violations };
  }
  
  private validateConstraints(
    value: any,
    constraints: ConstraintDefinition
  ): ConstraintValidationResult {
    const violations: Violation[] = [];
    
    // Numeric constraints
    if (typeof value === 'number') {
      if (constraints.min !== undefined && value < constraints.min) {
        violations.push({
          type: 'constraint-violation',
          constraint: 'min',
          expected: constraints.min,
          actual: value,
          message: `Value ${value} is less than minimum ${constraints.min}`
        });
      }
      
      if (constraints.max !== undefined && value > constraints.max) {
        violations.push({
          type: 'constraint-violation',
          constraint: 'max',
          expected: constraints.max,
          actual: value,
          message: `Value ${value} exceeds maximum ${constraints.max}`
        });
      }
      
      if (constraints.range && (value < constraints.range[0] || value > constraints.range[1])) {
        violations.push({
          type: 'constraint-violation',
          constraint: 'range',
          expected: constraints.range,
          actual: value,
          message: `Value ${value} outside range [${constraints.range[0]}, ${constraints.range[1]}]`
        });
      }
    }
    
    // String constraints
    if (typeof value === 'string') {
      if (constraints.pattern) {
        const pattern = constraints.pattern instanceof RegExp 
          ? constraints.pattern 
          : new RegExp(constraints.pattern);
        
        if (!pattern.test(value)) {
          violations.push({
            type: 'constraint-violation',
            constraint: 'pattern',
            expected: pattern.toString(),
            actual: value,
            message: `Value does not match pattern ${pattern}`
          });
        }
      }
      
      if (constraints.minLength !== undefined && value.length < constraints.minLength) {
        violations.push({
          type: 'constraint-violation',
          constraint: 'minLength',
          expected: constraints.minLength,
          actual: value.length,
          message: `String length ${value.length} less than minimum ${constraints.minLength}`
        });
      }
      
      if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
        violations.push({
          type: 'constraint-violation',
          constraint: 'maxLength',
          expected: constraints.maxLength,
          actual: value.length,
          message: `String length ${value.length} exceeds maximum ${constraints.maxLength}`
        });
      }
    }
    
    // Array constraints
    if (Array.isArray(value)) {
      if (constraints.minItems !== undefined && value.length < constraints.minItems) {
        violations.push({
          type: 'constraint-violation',
          constraint: 'minItems',
          expected: constraints.minItems,
          actual: value.length,
          message: `Array length ${value.length} less than minimum ${constraints.minItems}`
        });
      }
      
      if (constraints.uniqueItems && new Set(value).size !== value.length) {
        violations.push({
          type: 'constraint-violation',
          constraint: 'uniqueItems',
          message: `Array contains duplicate items`
        });
      }
    }
    
    // Custom validators
    if (constraints.validate) {
      const result = constraints.validate(value);
      if (result !== true) {
        violations.push({
          type: 'custom-validation',
          message: typeof result === 'string' ? result : 'Custom validation failed'
        });
      }
    }
    
    return { valid: violations.length === 0, violations };
  }
}
```

---

## 4. Visualization System

### 4.1 Data Flow Visualizer

```typescript
// src/threading/visualization/DataFlowVisualizer.ts
export class DataFlowVisualizer {
  private flows: Map<string, DataFlow> = new Map();
  private currentExecution?: ExecutionVisualization;
  
  /**
   * Generate interactive visualization of data flow
   */
  generateVisualization(trace: ExecutionTrace): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    .flow-container { 
      display: flex; 
      flex-direction: column; 
      padding: 20px; 
    }
    .timeline { 
      position: relative; 
      height: 100px; 
      border-left: 2px solid #333; 
    }
    .event { 
      position: absolute; 
      padding: 5px; 
      border-radius: 4px; 
      cursor: pointer;
    }
    .event.entry { background: #4CAF50; }
    .event.transform { background: #2196F3; }
    .event.validation { background: #FF9800; }
    .event.exit { background: #9C27B0; }
    .event.error { background: #F44336; }
    .violation { 
      border: 2px solid #F44336; 
      background: #ffebee; 
      padding: 10px; 
      margin: 10px 0;
    }
    .data-snapshot {
      background: #f5f5f5;
      padding: 10px;
      margin: 5px 0;
      font-family: monospace;
    }
    .shape-view {
      border: 1px solid #ddd;
      padding: 10px;
      margin: 5px 0;
    }
    .transformation {
      background: linear-gradient(to right, #e3f2fd, #f3e5f5);
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
    }
  </style>
  <script src="https://d3js.org/d3.v7.min.js"></script>
</head>
<body>
  <div class="flow-container">
    <h2>Execution Trace: ${trace.context}</h2>
    <div id="timeline"></div>
    <div id="data-flow"></div>
    <div id="violations"></div>
    <div id="transformations"></div>
    <div id="details"></div>
  </div>
  
  <script>
    const trace = ${JSON.stringify(trace, null, 2)};
    
    // Timeline visualization
    function renderTimeline() {
      const timeline = d3.select('#timeline');
      const events = trace.timeline;
      
      const scale = d3.scaleTime()
        .domain([events[0].timestamp, events[events.length-1].timestamp])
        .range([0, 800]);
      
      timeline.selectAll('.event')
        .data(events)
        .enter()
        .append('div')
        .attr('class', d => 'event ' + d.type)
        .style('left', d => scale(d.timestamp) + 'px')
        .text(d => d.type)
        .on('click', showDetails);
    }
    
    // Data flow diagram
    function renderDataFlow() {
      const svg = d3.select('#data-flow')
        .append('svg')
        .attr('width', 900)
        .attr('height', 400);
      
      // Render nodes for data states
      const nodes = extractNodes(trace);
      const links = extractLinks(trace);
      
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links))
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter(450, 200));
      
      // Render nodes
      const node = svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node');
      
      node.append('circle')
        .attr('r', 20)
        .attr('fill', d => getNodeColor(d));
      
      node.append('text')
        .text(d => d.label)
        .attr('text-anchor', 'middle');
      
      // Render links
      const link = svg.selectAll('.link')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-width', 2);
      
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        node.attr('transform', d => \`translate(\${d.x},\${d.y})\`);
      });
    }
    
    // Violations display
    function renderViolations() {
      const container = d3.select('#violations');
      
      trace.violations.forEach(violation => {
        const div = container.append('div')
          .attr('class', 'violation');
        
        div.append('h4').text(\`Violation: \${violation.type}\`);
        div.append('p').text(\`Path: \${violation.path || 'root'}\`);
        div.append('p').text(\`Expected: \${JSON.stringify(violation.expected)}\`);
        div.append('p').text(\`Actual: \${JSON.stringify(violation.actual)}\`);
        div.append('p').text(\`Message: \${violation.message}\`);
      });
    }
    
    // Transformations display
    function renderTransformations() {
      const container = d3.select('#transformations');
      
      trace.transformations.forEach(transform => {
        const div = container.append('div')
          .attr('class', 'transformation');
        
        div.append('h4').text(\`Transformation: \${transform.name}\`);
        div.append('p').html(\`
          <strong>From:</strong> \${transform.from}<br>
          <strong>To:</strong> \${transform.to}<br>
          <strong>Type:</strong> \${transform.inputType} → \${transform.outputType}
        \`);
        
        if (transform.sample) {
          div.append('pre').text(JSON.stringify(transform.sample, null, 2));
        }
      });
    }
    
    // Show details on click
    function showDetails(event, d) {
      const details = d3.select('#details');
      details.html('');
      
      details.append('h3').text(\`Event: \${d.type}\`);
      details.append('p').text(\`Timestamp: \${new Date(d.timestamp).toISOString()}\`);
      
      if (d.capture) {
        const snapshot = details.append('div')
          .attr('class', 'data-snapshot');
        
        snapshot.append('h4').text('Data Snapshot');
        snapshot.append('pre').text(JSON.stringify(d.capture, null, 2));
      }
    }
    
    // Initialize
    renderTimeline();
    renderDataFlow();
    renderViolations();
    renderTransformations();
  </script>
</body>
</html>
    `;
  }
}
```

### 4.2 Real-time Data Inspector

```typescript
// src/threading/visualization/DataInspector.ts
export class DataInspector {
  private inspectorPanel?: vscode.WebviewPanel;
  private currentTrace?: ExecutionTrace;
  
  /**
   * Show real-time data inspection panel
   */
  async showInspector(context: vscode.ExtensionContext): Promise<void> {
    this.inspectorPanel = vscode.window.createWebviewPanel(
      'dataInspector',
      'Thread Data Inspector',
      vscode.ViewColumn.Two,
      { 
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    this.inspectorPanel.webview.html = this.getInspectorHtml();
    
    // Listen for execution traces
    ThreadLogger.on('execution-trace', (trace) => {
      this.updateInspector(trace);
    });
  }
  
  private getInspectorHtml(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: 'Monaco', 'Menlo', monospace; 
      padding: 20px;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    .container { display: flex; gap: 20px; }
    .column { flex: 1; }
    
    .data-view {
      background: #252526;
      border: 1px solid #464647;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
    }
    
    .expected {
      background: #1e3a1e;
      border-color: #4CAF50;
    }
    
    .actual {
      background: #3a1e1e;
      border-color: #F44336;
    }
    
    .match {
      background: #1e3a3a;
      border-color: #2196F3;
    }
    
    .tree-view {
      margin-left: 20px;
    }
    
    .tree-node {
      cursor: pointer;
      padding: 2px 5px;
    }
    
    .tree-node:hover {
      background: #2a2d2e;
    }
    
    .type-string { color: #ce9178; }
    .type-number { color: #b5cea8; }
    .type-boolean { color: #569cd6; }
    .type-null { color: #808080; }
    .type-object { color: #4ec9b0; }
    .type-array { color: #c586c0; }
    
    .violation {
      background: #5a1e1e;
      border: 1px solid #f44336;
      padding: 5px;
      margin: 5px 0;
      border-radius: 3px;
    }
    
    .diff-added { background: #1e3a1e; }
    .diff-removed { background: #3a1e1e; }
    .diff-changed { background: #3a3a1e; }
  </style>
</head>
<body>
  <h2>Thread Data Inspector</h2>
  
  <div class="container">
    <div class="column">
      <h3>Expected</h3>
      <div id="expected-view" class="data-view expected"></div>
    </div>
    
    <div class="column">
      <h3>Actual</h3>
      <div id="actual-view" class="data-view actual"></div>
    </div>
    
    <div class="column">
      <h3>Violations</h3>
      <div id="violations-view"></div>
    </div>
  </div>
  
  <div id="transformation-flow"></div>
  <div id="data-timeline"></div>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    // Render data tree
    function renderDataTree(data, container, path = '') {
      const type = typeof data;
      const div = document.createElement('div');
      div.className = 'tree-node';
      
      if (data === null) {
        div.innerHTML = \`<span class="type-null">null</span>\`;
      } else if (data === undefined) {
        div.innerHTML = \`<span class="type-null">undefined</span>\`;
      } else if (type === 'object') {
        if (Array.isArray(data)) {
          div.innerHTML = \`<span class="type-array">Array[\${data.length}]</span>\`;
          const childContainer = document.createElement('div');
          childContainer.className = 'tree-view';
          data.forEach((item, i) => {
            renderDataTree(item, childContainer, \`\${path}[\${i}]\`);
          });
          div.appendChild(childContainer);
        } else {
          const keys = Object.keys(data);
          div.innerHTML = \`<span class="type-object">Object{\${keys.length}}</span>\`;
          const childContainer = document.createElement('div');
          childContainer.className = 'tree-view';
          keys.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.innerHTML = \`<strong>\${key}:</strong>\`;
            renderDataTree(data[key], keyDiv, \`\${path}.\${key}\`);
            childContainer.appendChild(keyDiv);
          });
          div.appendChild(childContainer);
        }
      } else if (type === 'string') {
        div.innerHTML = \`<span class="type-string">"\${data}"</span>\`;
      } else if (type === 'number') {
        div.innerHTML = \`<span class="type-number">\${data}</span>\`;
      } else if (type === 'boolean') {
        div.innerHTML = \`<span class="type-boolean">\${data}</span>\`;
      }
      
      container.appendChild(div);
    }
    
    // Handle messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.type) {
        case 'update-trace':
          updateDisplay(message.trace);
          break;
        case 'show-violation':
          showViolation(message.violation);
          break;
        case 'show-transformation':
          showTransformation(message.transformation);
          break;
      }
    });
    
    function updateDisplay(trace) {
      // Update expected view
      const expectedView = document.getElementById('expected-view');
      expectedView.innerHTML = '<h4>Contract</h4>';
      if (trace.spec?.expects) {
        renderDataTree(trace.spec.expects, expectedView);
      }
      
      // Update actual view
      const actualView = document.getElementById('actual-view');
      actualView.innerHTML = '<h4>Captured</h4>';
      if (trace.dataSnapshots?.entry) {
        renderDataTree(trace.dataSnapshots.entry, actualView);
      }
      
      // Update violations
      const violationsView = document.getElementById('violations-view');
      violationsView.innerHTML = '';
      trace.violations?.forEach(violation => {
        const div = document.createElement('div');
        div.className = 'violation';
        div.innerHTML = \`
          <strong>\${violation.type}</strong><br>
          Path: \${violation.path || 'root'}<br>
          \${violation.message}
        \`;
        violationsView.appendChild(div);
      });
    }
  </script>
</body>
</html>
    `;
  }
}
```

---

## 5. Integration with Agent Debugging

### 5.1 Agent-Friendly Error Messages

```typescript
// src/threading/agent/AgentDebugHelper.ts
export class AgentDebugHelper {
  /**
   * Generate agent-friendly debugging information
   */
  generateAgentDebugInfo(trace: ExecutionTrace): AgentDebugInfo {
    return {
      summary: this.generateSummary(trace),
      violations: this.formatViolations(trace.violations),
      suggestions: this.generateSuggestions(trace),
      examples: this.provideCorrectExamples(trace),
      learnings: this.extractLearnings(trace)
    };
  }
  
  private formatViolations(violations: Violation[]): FormattedViolation[] {
    return violations.map(v => ({
      issue: this.explainViolation(v),
      location: `${v.path || 'root'}`,
      expected: this.formatExpected(v.expected),
      actual: this.formatActual(v.actual),
      fix: this.suggestFix(v),
      example: this.provideExample(v)
    }));
  }
  
  private explainViolation(violation: Violation): string {
    const explanations = {
      'type-mismatch': `Expected ${violation.expected} but got ${violation.actual}`,
      'missing-field': `Required field is missing`,
      'constraint-violation': `Value violates constraint: ${violation.constraint}`,
      'shape-mismatch': `Object structure doesn't match expected shape`,
      'array-length': `Array has wrong number of items`,
      'pattern-mismatch': `String doesn't match required pattern`,
      'range-violation': `Number is outside valid range`,
      'null-unexpected': `Received null when value was required`,
      'undefined-unexpected': `Received undefined when value was required`
    };
    
    return explanations[violation.type] || violation.message;
  }
  
  private suggestFix(violation: Violation): string {
    // Generate specific fix suggestions based on violation type
    switch (violation.type) {
      case 'type-mismatch':
        return `Convert value to ${violation.expected} type`;
      
      case 'missing-field':
        return `Add required field '${violation.path}' to object`;
      
      case 'constraint-violation':
        if (violation.constraint === 'min') {
          return `Ensure value is at least ${violation.expected}`;
        }
        if (violation.constraint === 'max') {
          return `Ensure value does not exceed ${violation.expected}`;
        }
        if (violation.constraint === 'pattern') {
          return `Format string to match pattern: ${violation.expected}`;
        }
        break;
      
      case 'shape-mismatch':
        return `Restructure object to match expected shape`;
      
      default:
        return `Review and fix the data structure`;
    }
    
    return 'Review the constraint requirements';
  }
  
  private provideExample(violation: Violation): string {
    // Provide correct example based on violation
    switch (violation.type) {
      case 'type-mismatch':
        if (violation.expected === 'string') {
          return `"example-string"`;
        }
        if (violation.expected === 'number') {
          return `42`;
        }
        if (violation.expected === 'boolean') {
          return `true`;
        }
        if (violation.expected === 'object') {
          return `{ key: "value" }`;
        }
        break;
      
      case 'pattern-mismatch':
        // Generate example matching the pattern
        if (violation.expected.includes('uuid')) {
          return `"550e8400-e29b-41d4-a716-446655440000"`;
        }
        if (violation.expected.includes('email')) {
          return `"user@example.com"`;
        }
        break;
      
      case 'missing-field':
        return `{ ${violation.path}: "required-value" }`;
      
      default:
        return '// See contract definition for correct format';
    }
    
    return '// No example available';
  }
}
```

---

## 6. Configuration for Data Monitoring

### 6.1 Enhanced Threading Configuration

```json
{
  "threading": {
    "dataMonitoring": {
      "enabled": true,
      "captureMode": "smart",
      "features": {
        "typeValidation": true,
        "shapeValidation": true,
        "constraintValidation": true,
        "transformationTracking": true,
        "mutationTracking": true,
        "invariantChecking": true
      },
      "capture": {
        "values": {
          "primitives": true,
          "objects": "shallow",
          "arrays": "sample",
          "functions": false,
          "maxDepth": 3,
          "maxStringLength": 1000,
          "maxArrayLength": 100
        },
        "privacy": {
          "redactPatterns": [
            "password",
            "token",
            "secret",
            "key",
            "auth"
          ],
          "redactCreditCards": true,
          "redactEmails": false,
          "redactPII": true
        }
      },
      "visualization": {
        "autoOpen": false,
        "updateMode": "batch",
        "updateInterval": 500,
        "maxTraces": 100,
        "theme": "dark"
      },
      "analysis": {
        "detectPatterns": true,
        "suggestFixes": true,
        "generateExamples": true,
        "trackTrends": true
      }
    }
  }
}
```

---

## 7. Implementation Roadmap

### Phase 1: Data Contract Foundation (Week 1)
1. Implement enhanced ThreadSpec with data contracts
2. Create DataContract types and interfaces
3. Build ContractValidator
4. Add basic type and shape validation

### Phase 2: Value Tracking (Week 2)
1. Enhance ThreadLog with value capture
2. Implement ExecutionTracker
3. Add data snapshot functionality
4. Create transformation tracking

### Phase 3: Visualization (Week 3)
1. Build DataFlowVisualizer
2. Create interactive WebView dashboard
3. Implement real-time DataInspector
4. Add timeline and flow diagrams

### Phase 4: Agent Integration (Week 4)
1. Create AgentDebugHelper
2. Generate agent-friendly error messages
3. Provide fix suggestions and examples
4. Extract learnings from violations

### Phase 5: Testing & Refinement (Week 5)
1. Test with various data types and structures
2. Optimize performance for large datasets
3. Refine visualization UI
4. Add privacy and security features

---

## 8. Usage Examples

### 8.1 Basic Data Validation

```typescript
@ThreadSpec({
  threads: ['VALIDATION'],
  expects: {
    params: {
      email: {
        type: 'string',
        constraints: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
      }
    }
  }
})
@ThreadLog('VALIDATION')
async validateEmail(email: string): Promise<boolean> {
  // Implementation
  return this.emailValidator.validate(email);
}
```

### 8.2 Complex Object Validation

```typescript
@ThreadSpec({
  threads: ['DATA_FLOW'],
  expects: {
    params: {
      order: {
        type: 'object',
        shape: {
          id: { type: 'string', required: true },
          items: {
            type: 'array',
            required: true,
            constraints: {
              minItems: 1,
              itemType: {
                type: 'object',
                shape: {
                  productId: { type: 'string', required: true },
                  quantity: { 
                    type: 'number', 
                    required: true,
                    constraints: { min: 1 }
                  },
                  price: {
                    type: 'number',
                    required: true,
                    constraints: { min: 0 }
                  }
                }
              }
            }
          },
          customer: {
            type: 'object',
            required: true,
            shape: {
              id: { type: 'string', required: true },
              email: {
                type: 'string',
                required: true,
                constraints: {
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                }
              }
            }
          }
        }
      }
    }
  },
  produces: {
    returns: {
      type: 'object',
      shape: {
        success: { type: 'boolean', required: true },
        orderId: { type: 'string', required: false },
        total: { type: 'number', required: false },
        errors: { 
          type: 'array',
          required: false,
          constraints: { itemType: 'string' }
        }
      }
    }
  },
  invariants: [
    'params.order.items.length > 0',
    'params.order.items.every(item => item.quantity > 0)',
    'params.order.items.every(item => item.price >= 0)',
    'returns.success === true implies returns.orderId !== null'
  ]
})
@ThreadLog('DATA_FLOW')
async processOrder(order: Order): Promise<OrderResult> {
  // The system will automatically validate:
  // 1. Input structure matches expected shape
  // 2. All required fields are present
  // 3. Types are correct
  // 4. Constraints are satisfied
  // 5. Invariants hold
  // 6. Output matches contract
  
  // Your implementation
  const result = await this.orderService.process(order);
  return result;
}
```

---

## 9. Benefits and Impact

### For Human Operators
1. **Visual Understanding**: See exact data flow through system
2. **Immediate Feedback**: Know when contracts are violated
3. **Clear Expectations**: Understand what data should look like
4. **Debugging Aid**: Pinpoint where data goes wrong

### For Coding Agents
1. **Clear Contracts**: Understand expected data shapes
2. **Validation Feedback**: Know when implementation is wrong
3. **Fix Suggestions**: Get specific guidance on corrections
4. **Learning Opportunity**: Build pattern library from violations

### For System Quality
1. **Early Detection**: Catch data issues before they propagate
2. **Contract Enforcement**: Ensure API contracts are met
3. **Documentation**: Contracts serve as living documentation
4. **Regression Prevention**: Detect when changes break contracts

---

## 10. Conclusion

This extension transforms the threading system from a performance monitoring tool into a comprehensive data correctness platform. By tracking values, types, shapes, and transformations, it enables both human operators and coding agents to understand, debug, and improve system behavior with unprecedented clarity.

The visualization capabilities make data flow tangible and traceable, while the contract system ensures correctness at every step. This creates a collaborative debugging environment where humans and agents work together with shared understanding of what the data should be and what it actually is.