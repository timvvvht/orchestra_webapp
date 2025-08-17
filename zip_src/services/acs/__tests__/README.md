# ACS Client Integration Tests

This directory contains comprehensive integration tests for the Orchestra ACS (Agent Core Service) client. These tests make **real HTTP requests** to a running ACS server instance to validate end-to-end functionality.

## 🎯 Test Coverage

### Authentication Tests (`ACSAuthService.integration.test.ts`)
- ✅ User login with valid credentials
- ✅ Login failure with invalid credentials  
- ✅ Token management and storage
- ✅ Authentication state restoration
- ✅ User information retrieval
- ✅ Logout functionality
- ✅ Token validation utilities

### Session Management Tests (`ACSSessionService.integration.test.ts`)
- ✅ Session CRUD operations (Create, Read, Update, Delete)
- ✅ Session listing and pagination
- ✅ Session search functionality
- ✅ Session duplication
- ✅ Agent configuration changes
- ✅ Session utilities and validation
- ✅ Error handling for invalid operations

### Core Conversation Tests (`ACSCoreService.integration.test.ts`)
- ✅ Basic conversation flow via `/acs/converse`
- ✅ Message sending with session context
- ✅ New conversation creation
- ✅ Custom working directory support
- ✅ Message history override
- ✅ Custom API key handling
- ✅ Tool execution testing
- ✅ TES instance connectivity
- ✅ Routing and system features

### Infrastructure Management Tests (`ACSInfrastructureService.integration.test.ts`)
- ✅ App-per-user TES environment provisioning
- ✅ Infrastructure status monitoring and polling
- ✅ Resource cleanup and destruction
- ✅ Idempotent operations and existing infrastructure handling
- ✅ Error handling for invalid requests
- ✅ Infrastructure utilities and state detection
- ✅ Cost tracking and resource information extraction

### Full Client Integration Tests (`OrchestACSClient.integration.test.ts`)
- ✅ Client initialization and configuration
- ✅ Complete authentication workflow
- ✅ End-to-end conversation with streaming
- ✅ Cross-service operations
- ✅ Health status monitoring
- ✅ Error handling and resilience
- ✅ Cleanup and logout procedures

## 🚀 Prerequisites

### 1. Running ACS Server
Ensure you have an accessible ACS server instance:
- **Staging Environment**: `https://orchestra-acs-staging.fly.dev`
- **Local Development**: `http://localhost:8000`
- **Custom Environment**: Any accessible ACS server URL

### 2. Test User Account
You need valid credentials for a test user on your ACS server:
- Email address (e.g., `test@orchestra.dev`)
- Password
- User should have appropriate permissions for session and conversation operations

### 3. Environment Configuration
Create a `.env.test` file in the project root with your test configuration:

```env
# ACS server configuration
TEST_ACS_BASE_URL=https://your-acs-server.com
TEST_SSE_BASE_URL=https://your-sse-server.com  # Optional, defaults to ACS_URL/sse

# Test user credentials
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password

# Optional settings
INTEGRATION_TEST_QUIET=false  # Set to 'true' to reduce console output
```

**⚠️ Security Note**: The `.env.test` file is gitignored. Never commit real credentials to version control.

## 🧪 Running the Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run with UI (Browser Interface)
```bash
npm run test:integration:ui
```

### Run Specific Test Files
```bash
# Authentication tests only
npx vitest run src/services/acs/auth/__tests__/ACSAuthService.integration.test.ts

# Session management tests only
npx vitest run src/services/acs/sessions/__tests__/ACSSessionService.integration.test.ts

# Core conversation tests only
npx vitest run src/services/acs/core/__tests__/ACSCoreService.integration.test.ts

# Infrastructure management tests only
npx vitest run src/services/acs/infrastructure/__tests__/ACSInfrastructureService.integration.test.ts

# Full client integration tests only
npx vitest run src/services/acs/__tests__/OrchestACSClient.integration.test.ts
```

### Run with Debug Output
```bash
DEBUG=true npm run test:integration
```

## 📊 Test Configuration

### Timeouts
- **Default Test Timeout**: 30 seconds
- **Conversation Tests**: 60 seconds (longer for AI responses)
- **Infrastructure Tests**: 300 seconds (5 minutes for provisioning)
- **Network Timeout**: 30 seconds per request
- **Retry Logic**: 2 retries for failed requests

### Test Isolation
- Each test file authenticates independently
- Sessions created during tests are automatically cleaned up
- Authentication state is cleared between test suites
- Tests can run in parallel (default) or serially if needed
- **Infrastructure tests**: Run serially and include robust cleanup to prevent orphaned cloud resources

### Error Handling
Tests are designed to handle various server states gracefully:
- **404 Errors**: Some endpoints may not be implemented (logged as warnings)
- **503 Errors**: Services may be temporarily unavailable
- **401/403 Errors**: Expected for authentication failure tests
- **Network Errors**: Handled with retries and clear error messages

## 🔧 Troubleshooting

### Common Issues

#### "Missing required environment variables"
- Ensure `.env.test` file exists in project root
- Verify all required variables are set: `TEST_ACS_BASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`

#### "Authentication failed"
- Verify test user credentials are correct
- Check if test user exists on the target ACS server
- Ensure ACS server is accessible from your network

#### "Connection refused" or network errors
- Verify ACS server URL is correct and accessible
- Check if server is running and responding to requests
- Test server connectivity: `curl https://your-acs-server.com/acs/health`

#### Tests timeout
- Increase timeout in `vitest.config.ts` if needed
- Check server response times
- Verify network connectivity is stable

#### "Session not found" errors during cleanup
- This is usually harmless - sessions may have been deleted by other tests
- Check server logs if persistent

### Debug Mode
Enable debug mode for detailed request/response logging:

```env
# In .env.test
DEBUG=true
```

Or run tests with debug flag:
```bash
DEBUG=true npm run test:integration
```

### Server Logs
If tests fail unexpectedly, check ACS server logs for:
- Authentication errors
- Database connectivity issues
- Tool execution failures
- Rate limiting

## 📈 Test Metrics

### Success Criteria
- ✅ All authentication flows work correctly
- ✅ Session CRUD operations complete successfully  
- ✅ Conversations can be initiated and continued
- ✅ Error handling works as expected
- ✅ Cleanup procedures remove test data

### Performance Expectations
- **Authentication**: < 2 seconds
- **Session Operations**: < 1 second
- **Simple Conversations**: < 10 seconds
- **Complex Conversations**: < 30 seconds

### Coverage Goals
- **API Endpoints**: All major ACS endpoints tested
- **Error Scenarios**: Common failure modes covered
- **Edge Cases**: Invalid inputs and boundary conditions
- **Integration Points**: Cross-service functionality verified

## 🔄 Continuous Integration

### CI/CD Integration
These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Integration Tests
  env:
    TEST_ACS_BASE_URL: ${{ secrets.TEST_ACS_BASE_URL }}
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
  run: npm run test:integration
```

### Test Environment Management
- Use dedicated test environments for CI
- Ensure test data isolation between runs
- Consider using test-specific user accounts
- Monitor test environment health and capacity

## 📝 Contributing

### Adding New Tests
1. Follow existing test patterns and structure
2. Include proper setup and cleanup procedures
3. Add meaningful assertions and error handling
4. Document any special requirements or dependencies

### Test Naming Conventions
- Use descriptive test names: `should create session with valid data`
- Group related tests in `describe` blocks
- Use consistent naming for test files: `ServiceName.integration.test.ts`

### Best Practices
- Always clean up created resources in `afterAll` hooks
- Handle optional/experimental endpoints gracefully
- Include both positive and negative test cases
- Log meaningful information for debugging
- Keep tests independent and idempotent

## 📞 Support

If you encounter issues with the integration tests:

1. **Check Prerequisites**: Verify server accessibility and credentials
2. **Review Logs**: Enable debug mode for detailed output
3. **Test Manually**: Try operations manually via API or UI
4. **Check Documentation**: Review ACS API documentation
5. **Ask for Help**: Contact the development team with specific error details

---

**Happy Testing! 🧪✨**