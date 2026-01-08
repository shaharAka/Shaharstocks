# Testing Guide

This directory contains test files and utilities for the application.

## Structure

```
server/tests/
├── setup.ts              # Test setup and configuration
├── test-utils/           # Test utilities and helpers
│   └── index.ts          # Common test utilities
└── README.md             # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- server/utils/emailValidation.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --grep "emailValidation"
```

## Test File Naming

- Unit tests: `*.test.ts` or `*.spec.ts`
- Place test files next to the code they test, or in a `__tests__` directory
- Example: `server/utils/emailValidation.test.ts` tests `server/utils/emailValidation.ts`

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from './module';

describe('module name', () => {
  it('should do something', () => {
    expect(functionToTest()).toBe(expectedValue);
  });
});
```

### Using Test Utilities

```typescript
import { createMockLogger, createMockStorage } from '../tests/test-utils';

describe('service', () => {
  it('should work with mocks', () => {
    const mockLogger = createMockLogger();
    const mockStorage = createMockStorage();
    
    // Test implementation
  });
});
```

## Coverage Goals

- **Target**: 70%+ coverage for services and utilities
- **Current Focus**: 
  - Utility functions (email validation, job utilities, etc.)
  - Service classes (stock service, AI analysis service, etc.)
  - Repository methods (as they are refactored)
  - Middleware functions

## Test Types

### Unit Tests
- Test individual functions and methods in isolation
- Use mocks for external dependencies
- Fast execution
- High coverage goal

### Integration Tests
- Test interactions between components
- Use test database
- Located in `server/tests/integration/`

### E2E Tests
- Test full user workflows
- Use Playwright/Cypress
- Located in `tests/e2e/`

## Mocking Guidelines

1. **External Services**: Always mock external API calls (Finnhub, OpenAI, etc.)
2. **Database**: Use test database for integration tests, mocks for unit tests
3. **Time**: Mock Date/time functions for time-dependent tests
4. **File System**: Mock file system operations if needed
5. **Environment**: Use test environment variables

## Best Practices

1. **Arrange-Act-Assert**: Structure tests with clear sections
2. **Descriptive Names**: Use clear test descriptions
3. **One Assertion Per Test**: Focus each test on one behavior
4. **Test Edge Cases**: Test null, undefined, empty values, boundaries
5. **Clean Up**: Use `afterEach`/`afterAll` to clean up mocks and state
6. **Fast Tests**: Keep unit tests fast (under 100ms each)

## Example Test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { myFunction } from './module';

describe('myFunction', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should handle normal case', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    const result = myFunction('');
    expect(result).toBe('');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

