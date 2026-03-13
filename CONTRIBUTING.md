# Contributing to Micro-Security Gateway

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Security Review](#security-review)
- [Coding Standards](#coding-standards)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- Git
- Cloudflare Workers account (free tier)
- Supabase account (free tier)

### Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/micro-gateway.git
cd micro-gateway

# 2. Install dependencies
npm install

# 3. Copy environment variables template
cp .dev.vars.example .dev.vars

# 4. Configure your environment
# Edit .dev.vars with your credentials
```

### Local Development

```bash
# Start gateway API (port 8787)
npm run dev:gateway

# Start dashboard UI (port 3000)
npm run dev:dashboard

# Run tests
npm run test
```

## Development Workflow

### 1. Branch Naming

Use descriptive branch names:

```bash
# Feature branches
feature/add-provider-support
feature/improve-rate-limiting

# Bug fix branches
fix/fix-auth-middleware
fix/resolve-dashboard-error

# Documentation branches
docs/update-api-documentation
docs/add-deployment-guide
```

### 2. Making Changes

**Follow this workflow**:

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

**Commit Message Format**:
```bash
# Format: type(scope): description

feat(auth): add OAuth2 support
fix(middleware): resolve rate limit race condition
docs(readme): update deployment instructions
test(gateway): add integration tests for proxy
```

**Types**: feat, fix, docs, test, refactor, chore, perf, ci

### 3. Testing

**Before submitting PR**:

```bash
# Run all tests
npm run test

# Run specific test suite
cd apps/gateway-api && npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

**Test Coverage Requirements**:
- New features: Minimum 80% code coverage
- Bug fixes: Add regression tests
- Critical security code: 100% coverage required

## Pull Request Process

### 1. PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
```

### 2. PR Review Process

**Review Criteria**:
- Code quality and clarity
- Test coverage
- Documentation completeness
- Security implications
- Performance impact

**Approval Requirements**:
- At least 1 maintainer approval
- All CI checks passing
- No unresolved conversations

### 3. Merge Policy

- Squash merge to `main` branch
- Maintainers handle merges
- Delete branch after merge

## Security Review

### Security-Sensitive Changes

**Requires Security Review**:
- Authentication/authorization changes
- Encryption key handling
- API route modifications
- Database schema changes
- Rate limiting logic
- Anomaly detection rules

**Security Review Process**:
1. Tag PR with `security-review` label
2. Security team reviews within 48 hours
3. Address all security feedback
4. Final approval from security maintainer

### Vulnerability Reporting

**DO NOT** report vulnerabilities via public issues.

**Email**: security-report@example.com

Include:
- Vulnerability description
- Proof of concept
- Suggested fix
- Contact information

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types for public APIs
export function validateApiKey(key: string): boolean {
  // Implementation
}

// Use interfaces for data structures
interface ApiKey {
  id: string;
  hashedKey: string;
  rateLimit: number;
}

// Avoid any types
// ❌ Bad
const data: any = fetchData();

// ✅ Good
const data: ApiResponse = fetchData();
```

### Error Handling

```typescript
// Always handle errors
try {
  await database.insert(data);
} catch (error) {
  logger.error('Database insertion failed', { error });
  throw new ApiError('Failed to save data', 500);
}
```

### Logging

```typescript
// Use structured logging
logger.info('Request received', {
  endpoint: '/v1/chat/completions',
  apiKeyId: apiKey.id,
  model: requestBody.model
});
```

### Documentation Comments

```typescript
/**
 * Validates and processes an API key for authentication
 *
 * @param key - The raw API key from request header
 * @returns Authentication result with user data
 * @throws {UnauthorizedError} If key is invalid or expired
 */
export async function authenticateKey(key: string): Promise<AuthResult> {
  // Implementation
}
```

## Project Structure Guidelines

### Gateway API (`apps/gateway-api/`)

- **middleware/**: Request/response middleware
- **gateway/**: OpenAI-compatible proxy endpoints
- **management/**: Dashboard management API
- **auth/**: Authentication endpoints

### Dashboard UI (`apps/dashboard-ui/`)

- **app/**: Next.js App Router pages
- **components/**: Reusable UI components
- **lib/**: Utilities and API clients
- **hooks/**: Custom React hooks

### Database (`packages/db/`)

- **src/types.ts**: All TypeScript interfaces
- **src/pricing.ts**: Cost calculation logic
- **migrations/**: Database schema changes

## Performance Guidelines

### Cloudflare Workers

```typescript
// Avoid heavy computations in Workers
// ❌ Bad: Long-running operations
for (let i = 0; i < 1000000; i++) {
  complexCalculation();
}

// ✅ Good: Use cached results
const cached = await cache.get('result');
if (!cached) {
  const result = await calculate();
  await cache.put('result', result, 3600);
}
```

### Database Queries

```typescript
// Use prepared statements
// ❌ Bad: SQL injection risk
const query = `SELECT * FROM keys WHERE id = '${userId}'`;

// ✅ Good: Prepared statement
const result = await db
  .prepare('SELECT * FROM keys WHERE id = ?')
  .bind(userId)
  .all();
```

## Documentation Standards

### Code Documentation

- All public APIs must have JSDoc comments
- Complex logic requires inline comments
- Maintain README.md for high-level documentation

### Feature Documentation

- Add usage examples for new features
- Update API documentation
- Include migration guides for breaking changes

## Getting Help

- **Issues**: https://github.com/dongvannhan1000/micro-gateway/issues
- **Discussions**: https://github.com/dongvannhan1000/micro-gateway/discussions
- **Email**: support@example.com

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Invited to join maintainer team (for significant contributions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Happy Contributing!** 🚀

**Last Updated**: March 13, 2026
