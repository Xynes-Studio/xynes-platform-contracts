# xynes-platform-contracts

A pure TypeScript library that defines the shared contracts (actions, errors, and types) for the Xynes platform. This library serves as the source of truth for communication between services.

## Overview

This library provides:

1.  **Base Action Contracts**: Standard types for internal action handlers and envelopes.
2.  **Error Hierarchy**: A unified `DomainError` system with standard HTTP-friendly subclasses (Validation, Not Found, Forbidden, etc.).

It is designed to be:
-   **Framework Agnostic**: No bindings to Hono, Express, or any DB.
-   **Lightweight**: Only TypeScript definitions and error classes.

## Installation

```bash
pnpm add @xynes/platform-contracts
```

## Usage

### 1. Errors

Always use the standard error classes to ensure consistent error handling across the gateway and services.

```typescript
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  DomainError
} from '@xynes/platform-contracts';

// Throwing errors
function validateUser(input: any) {
  if (!input.email) {
    throw new ValidationError('Email is required', { field: 'email' });
  }
}

// Catching errors
try {
  validateUser({});
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(err.code); // 'VALIDATION_ERROR'
    console.log(err.details); // { field: 'email' }
  }
}
```

### 2. Actions

Use `ActionHandler` and `ActionRequestEnvelope` when implementing internal service endpoints.

```typescript
import { ActionHandler, ActionRequestEnvelope } from '@xynes/platform-contracts';

interface CreateDocPayload {
  title: string;
}

interface CreateDocResult {
  id: string;
}

// Define the handler
const createDoc: ActionHandler<CreateDocPayload, CreateDocResult> = async (payload, ctx) => {
  // logic...
  return { id: '123' };
};
```

## Development

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

## Contributing

-   **Segregation**: Keep actions and errors in their respective folders.
-   **Testing**: Maintain >80% coverage.
-   **Standards**: Follow TDD and use standard ESLint rules.
