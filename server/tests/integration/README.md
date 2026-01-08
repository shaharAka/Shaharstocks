# Integration Tests

Integration tests test the interaction between multiple components, typically testing API endpoints with a real or test database.

## Setup

### Dependencies

Install required dependencies:

```bash
npm install --save-dev supertest @types/supertest
```

### Test Database

Integration tests require a database. Configure using:

```env
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
```

Or use the same database as development (not recommended for CI, but fine for local testing):

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dev_db
```

### Running Integration Tests

```bash
# Run all integration tests
npm test -- server/tests/integration

# Run specific test file
npm test -- server/tests/integration/auth.test.ts

# Run with coverage
npm test:coverage -- server/tests/integration
```

## Test Structure

Integration tests:
- Use real Express app with routes and middleware
- Use test database (or isolated test schema)
- Test full request/response cycle
- Verify database state changes

## Test Files

- `setup.ts` - Test database setup and teardown
- `helpers.ts` - Utility functions for creating test data
- `appFactory.ts` - Factory for creating Express app for tests
- `auth.test.ts` - Authentication endpoint tests

## Writing Integration Tests

### Basic Structure

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp, closeTestApp } from './appFactory';
import { createTestUser, deleteTestUser } from './helpers';

describe('Integration: Endpoint Name', () => {
  let app: Express;
  let server: Server;
  let testUser: { id: string; email: string; password: string };

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    server = testApp.server;
    
    testUser = await createTestUser();
  });

  afterAll(async () => {
    if (testUser) await deleteTestUser(testUser.id);
    if (server) await closeTestApp(server);
  });

  it('should do something', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
  });
});
```

### Using Test Helpers

```typescript
import { createTestUser, createAuthenticatedSession, loginUser } from './helpers';

// Create test user
const user = await createTestUser({ email: 'test@example.com' });

// Create authenticated session
const agent = createAuthenticatedSession(app, user.email, user.password);
await loginUser(agent, user.email, user.password);

// Use agent for authenticated requests
const response = await agent
  .get('/api/protected-endpoint')
  .expect(200);
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clean Up**: Delete test data after each test suite
3. **Use Test Data**: Create dedicated test users/data
4. **Test Database**: Use separate test database when possible
5. **Verify State**: Check database state after operations
6. **Error Cases**: Test error handling and edge cases

## Current Test Coverage

### Auth Endpoints ✅
- POST /api/auth/login
- GET /api/auth/current-user
- POST /api/auth/logout

### Next Priority Endpoints

1. **User Endpoints**
   - GET /api/users/me
   - PATCH /api/users/me
   - GET /api/users/settings

2. **Stock Endpoints** (high traffic)
   - GET /api/stocks
   - GET /api/stocks/:ticker
   - POST /api/stocks/:ticker/refresh

3. **Followed Stocks**
   - POST /api/followed-stocks
   - DELETE /api/followed-stocks/:ticker

4. **Portfolio**
   - GET /api/portfolio
   - POST /api/portfolio/holdings

## Notes

- Integration tests are slower than unit tests
- Run them separately from unit tests in CI if needed
- Use test database transactions for faster cleanup (future enhancement)
- Install `supertest` and `@types/supertest` before running tests
