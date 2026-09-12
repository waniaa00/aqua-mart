---
name: error-handling
description: Implement centralized error handling, custom error classes, logging, and safe responses.
---

# Error Handling Skill

## Instructions

1. **Centralized error handling**
   - Use a global error middleware or handler
   - Capture synchronous and asynchronous errors
   - Avoid scattering try/catch blocks everywhere

2. **Custom error classes**
   - Define application-specific error types
   - Include HTTP status codes and messages
   - Extend native Error class for consistency

3. **Logging**
   - Log errors with context (stack trace, request info)
   - Use a logging library (e.g., Winston, Pino)
   - Separate logs by level (info, warning, error)

4. **Safe responses**
   - Never expose stack traces to clients
   - Return consistent JSON error structures
   - Include user-friendly messages

## Best Practices
- Centralize all error handling for maintainability
- Differentiate client vs server errors
- Monitor and alert on critical errors
- Include unique error codes for debugging
- Keep logs secure and compliant with privacy rules

## Example Structure
```ts
// Custom Error Class
class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Centralized Middleware
app.use((err, req, res, next) => {
  console.error(err); // Logging
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// Throwing errors
if (!user) throw new AppError("User not found", 404);
