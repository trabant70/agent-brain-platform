# Threading System Examples

Practical examples showing how to use the Threading Data Correctness Monitoring System.

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [E-Commerce Examples](#e-commerce-examples)
3. [API Examples](#api-examples)
4. [Data Processing Examples](#data-processing-examples)
5. [Testing Examples](#testing-examples)

## Basic Examples

### Example 1: Simple Function Monitoring

Monitor a basic function with type checking:

```typescript
import { ThreadSpec } from '@agent-brain/core/domains/threading/decorators/ThreadSpec';
import { DataContract } from '@agent-brain/core/domains/threading/contracts/DataContract';

class MathService {
  @ThreadSpec({
    thread: 'MATH',
    contract: new DataContract({
      input: {
        type: 'array',
        items: [
          { type: 'number' },
          { type: 'number' }
        ],
        minItems: 2,
        maxItems: 2
      },
      output: {
        type: 'number'
      }
    })
  })
  add(a: number, b: number): number {
    return a + b;
  }
}

// Usage
const math = new MathService();
const result = math.add(5, 3);  // ✅ Monitored, returns 8

// This would trigger a violation:
// math.add("5", 3);  // ❌ Type mismatch: expected number, got string
```

### Example 2: Object Validation

Validate object structure and properties:

```typescript
class UserService {
  @ThreadSpec({
    thread: 'USER_MANAGEMENT',
    contract: new DataContract({
      input: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 50
          },
          email: {
            type: 'string',
            format: 'email'
          },
          age: {
            type: 'number',
            minimum: 18,
            maximum: 120
          }
        },
        required: ['name', 'email']
      },
      output: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'email', 'createdAt']
      }
    })
  })
  createUser(userData: UserData): User {
    // Implementation
    return {
      id: generateId(),
      ...userData,
      createdAt: new Date().toISOString()
    };
  }
}

// Usage
const userService = new UserService();

// ✅ Valid
userService.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

// ❌ Invalid: Missing required field 'email'
userService.createUser({
  name: 'Jane Doe',
  age: 25
});

// ❌ Invalid: Age below minimum
userService.createUser({
  name: 'Bob Smith',
  email: 'bob@example.com',
  age: 15
});
```

## E-Commerce Examples

### Example 3: Shopping Cart Operations

Monitor shopping cart with complex validation:

```typescript
interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

class ShoppingCartService {
  @ThreadSpec({
    thread: 'CART_OPERATIONS',
    contract: new DataContract({
      input: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string', pattern: '^PROD-\\d{6}$' },
                name: { type: 'string', minLength: 1 },
                quantity: { type: 'number', minimum: 1, multipleOf: 1 },
                price: { type: 'number', minimum: 0 }
              },
              required: ['productId', 'name', 'quantity', 'price']
            },
            minItems: 1
          }
        },
        required: ['items']
      },
      output: {
        type: 'object',
        properties: {
          items: { type: 'array' },
          subtotal: { type: 'number', minimum: 0 },
          tax: { type: 'number', minimum: 0 },
          total: { type: 'number', minimum: 0 }
        },
        required: ['items', 'subtotal', 'tax', 'total']
      }
    })
  })
  calculateTotal(cart: Partial<Cart>): Cart {
    const items = cart.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08;  // 8% tax
    const total = subtotal + tax;

    return {
      items,
      subtotal,
      tax,
      total
    };
  }
}

// Usage
const cartService = new ShoppingCartService();

const cart = cartService.calculateTotal({
  items: [
    {
      productId: 'PROD-123456',
      name: 'Laptop',
      quantity: 1,
      price: 999.99
    },
    {
      productId: 'PROD-789012',
      name: 'Mouse',
      quantity: 2,
      price: 29.99
    }
  ]
});

console.log('Total:', cart.total);  // 1139.98
```

### Example 4: Order Processing Pipeline

Monitor multi-step order processing:

```typescript
class OrderService {
  @ThreadSpec({
    thread: 'ORDER_PROCESSING',
    contract: new DataContract({
      input: {
        type: 'object',
        properties: {
          orderId: { type: 'string', pattern: '^ORD-\\d{8}$' },
          customerId: { type: 'string' },
          items: { type: 'array', minItems: 1 },
          paymentMethod: {
            type: 'string',
            enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer']
          },
          shippingAddress: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zipCode: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' }
            },
            required: ['street', 'city', 'state', 'zipCode']
          }
        },
        required: ['orderId', 'customerId', 'items', 'paymentMethod', 'shippingAddress']
      },
      output: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          orderId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'failed']
          },
          trackingNumber: { type: 'string' }
        },
        required: ['success', 'orderId', 'status']
      }
    })
  })
  async processOrder(order: Order): Promise<OrderResult> {
    // Validate inventory
    await this.validateInventory(order.items);

    // Process payment
    const paymentResult = await this.processPayment(order);
    if (!paymentResult.success) {
      return { success: false, orderId: order.orderId, status: 'failed' };
    }

    // Create shipment
    const trackingNumber = await this.createShipment(order);

    return {
      success: true,
      orderId: order.orderId,
      status: 'confirmed',
      trackingNumber
    };
  }
}
```

## API Examples

### Example 5: REST API Endpoint

Monitor API request/response handling:

```typescript
class ApiController {
  @ThreadSpec({
    thread: 'API_REQUEST',
    contract: new DataContract({
      input: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
          },
          path: { type: 'string' },
          headers: { type: 'object' },
          body: { type: 'object' },
          query: { type: 'object' }
        },
        required: ['method', 'path']
      },
      output: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', minimum: 100, maximum: 599 },
          headers: { type: 'object' },
          body: { type: 'object' }
        },
        required: ['statusCode', 'body']
      }
    })
  })
  async handleRequest(request: ApiRequest): Promise<ApiResponse> {
    try {
      // Route to appropriate handler
      const handler = this.getHandler(request.path);
      const result = await handler(request);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: result
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          error: 'Internal Server Error',
          message: error.message
        }
      };
    }
  }
}
```

### Example 6: GraphQL Resolver

Monitor GraphQL query resolution:

```typescript
class UserResolver {
  @ThreadSpec({
    thread: 'GRAPHQL_RESOLVER',
    contract: new DataContract({
      input: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      output: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          posts: { type: 'array' },
          followers: { type: 'array' }
        },
        required: ['id', 'username', 'email']
      }
    })
  })
  async user(args: { id: string }, context: Context): Promise<User> {
    const user = await context.db.users.findById(args.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Fetch related data
    const posts = await context.db.posts.findByUserId(user.id);
    const followers = await context.db.followers.findByUserId(user.id);

    return {
      ...user,
      posts,
      followers
    };
  }
}
```

## Data Processing Examples

### Example 7: Data Transformation Pipeline

Monitor data transformation with multiple steps:

```typescript
class DataPipeline {
  @ThreadSpec({
    thread: 'DATA_TRANSFORM',
    contract: new DataContract({
      input: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            value: { type: 'number' }
          }
        }
      },
      output: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          average: { type: 'number' },
          min: { type: 'number' },
          max: { type: 'number' },
          count: { type: 'number' }
        },
        required: ['total', 'average', 'min', 'max', 'count']
      }
    })
  })
  computeStatistics(data: DataPoint[]): Statistics {
    // Extract values
    const values = data.map(d => d.value);

    // Calculate statistics
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      total,
      average,
      min,
      max,
      count: values.length
    };
  }

  @ThreadSpec({
    thread: 'DATA_TRANSFORM',
    contract: new DataContract({
      input: {
        type: 'array',
        items: { type: 'object' }
      },
      output: {
        type: 'array',
        items: { type: 'object' }
      }
    })
  })
  filterOutliers(data: DataPoint[], threshold: number = 2): DataPoint[] {
    const stats = this.computeStatistics(data);
    const stdDev = this.calculateStdDev(data, stats.average);

    return data.filter(d => {
      const zScore = Math.abs((d.value - stats.average) / stdDev);
      return zScore <= threshold;
    });
  }
}
```

### Example 8: Batch Processing

Monitor batch operations with progress tracking:

```typescript
class BatchProcessor {
  @ThreadSpec({
    thread: 'BATCH_PROCESSING',
    contract: new DataContract({
      input: {
        type: 'object',
        properties: {
          items: { type: 'array', minItems: 1 },
          batchSize: { type: 'number', minimum: 1, maximum: 1000 }
        },
        required: ['items', 'batchSize']
      },
      output: {
        type: 'object',
        properties: {
          processed: { type: 'number' },
          succeeded: { type: 'number' },
          failed: { type: 'number' },
          errors: { type: 'array' }
        },
        required: ['processed', 'succeeded', 'failed', 'errors']
      }
    })
  })
  async processBatch(config: BatchConfig): Promise<BatchResult> {
    const result = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: []
    };

    // Process in batches
    for (let i = 0; i < config.items.length; i += config.batchSize) {
      const batch = config.items.slice(i, i + config.batchSize);

      for (const item of batch) {
        try {
          await this.processItem(item);
          result.succeeded++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            item: item.id,
            error: error.message
          });
        }
        result.processed++;
      }

      // Allow event loop to process
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return result;
  }
}
```

## Testing Examples

### Example 9: Unit Test with Threading

Use threading in unit tests to catch contract violations:

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  setGlobalDataCorrectnessConfig,
  TESTING_CONFIG,
  DISABLED_CONFIG
} from '@agent-brain/core/domains/threading/config/DataCorrectnessConfig';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    // Enable threading in test mode (fail on violations)
    setGlobalDataCorrectnessConfig(TESTING_CONFIG);
    userService = new UserService();
  });

  afterEach(() => {
    // Disable threading after test
    setGlobalDataCorrectnessConfig(DISABLED_CONFIG);
  });

  it('should create user with valid data', () => {
    const user = userService.createUser({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
  });

  it('should throw on invalid email', () => {
    expect(() => {
      userService.createUser({
        name: 'Jane Doe',
        email: 'invalid-email',  // Invalid format
        age: 25
      });
    }).toThrow('Contract violation');
  });

  it('should throw on missing required field', () => {
    expect(() => {
      userService.createUser({
        name: 'Bob Smith',
        // Missing email
        age: 35
      });
    }).toThrow('Contract violation');
  });
});
```

### Example 10: Integration Test with Session

Use sessions to track execution across multiple operations:

```typescript
import { ThreadLogger } from '@agent-brain/core/domains/threading/logging/ThreadLogger';
import { JsonlFileWriter } from 'packages/vscode/src/services/threading/JsonlFileWriter';

describe('Order Processing Integration', () => {
  let logger: ThreadLogger;

  beforeAll(async () => {
    // Setup file writer
    const fileWriter = new JsonlFileWriter({
      workspacePath: './test-logs',
      bufferSize: 10,
      flushIntervalMs: 1000
    });

    logger = new ThreadLogger(fileWriter);

    // Start session
    logger.startSession({
      id: 'test-session-1',
      name: 'Order Processing Test',
      startTime: Date.now(),
      endTime: 0,
      traceCount: 0
    });
  });

  afterAll(async () => {
    // End session and close logger
    await logger.endSession();
    await logger.close();
  });

  it('should process order end-to-end', async () => {
    const orderService = new OrderService();
    const cartService = new ShoppingCartService();
    const paymentService = new PaymentService();

    // Create cart
    const cart = cartService.calculateTotal({
      items: [
        { productId: 'PROD-123456', name: 'Laptop', quantity: 1, price: 999.99 }
      ]
    });

    // Process payment
    const payment = await paymentService.processPayment({
      amount: cart.total,
      method: 'credit_card'
    });

    expect(payment.success).toBe(true);

    // Create order
    const order = await orderService.processOrder({
      orderId: 'ORD-12345678',
      customerId: 'CUST-001',
      items: cart.items,
      paymentMethod: 'credit_card',
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345'
      }
    });

    expect(order.success).toBe(true);
    expect(order.status).toBe('confirmed');
    expect(order.trackingNumber).toBeDefined();

    // All operations monitored and logged to session
  });
});
```

---

**Related Documentation**:
- [User Guide](./THREADING_USER_GUIDE.md)
- [API Reference](./THREADING_API_REFERENCE.md)
- [Architecture](./THREADING_ARCHITECTURE.md)
