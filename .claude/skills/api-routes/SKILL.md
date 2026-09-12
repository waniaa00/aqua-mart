---
name: api-routes
description: Build robust backend API routes with CRUD operations, validation, authentication, and consistent JSON responses.
---

# API Routes Design

## Instructions

1. **Route structure**
   - Separate routes by resource (`/users`, `/posts`, `/orders`)
   - Use RESTful naming conventions
   - Organize routes in modular files

2. **CRUD operations**
   - Implement Create, Read, Update, Delete endpoints
   - Handle input validation for each operation
   - Return meaningful HTTP status codes

3. **Authentication & Authorization**
   - Protect private routes with auth middleware
   - Restrict actions based on user roles
   - Verify JWT tokens or session tokens

4. **Response format**
   - Return consistent JSON structure
   - Include success/error messages and data payload
   - Handle errors gracefully

## Best Practices
- Validate all incoming requests
- Keep controllers thin; delegate logic to service layer
- Always handle unexpected errors
- Use proper HTTP status codes
- Maintain a consistent response format across all endpoints

## Example Structure
```ts
// Create User
app.post("/api/users", validateUser, authMiddleware, async (req, res) => {
  try {
    const user = await UserService.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Users
app.get("/api/users", authMiddleware, async (req, res) => {
  const users = await UserService.getAll();
  res.json({ success: true, data: users });
});
