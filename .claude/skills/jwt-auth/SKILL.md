---
name: jwt-auth
description: Implement JWT authentication with token generation, validation, and secure route protection.
---

# JWT Authentication Skill

## Instructions

1. **Token generation**
   - Generate access tokens upon successful login
   - Include user ID and role in payload
   - Set expiration for security

2. **Token validation**
   - Verify JWT tokens on every protected route
   - Handle expired or invalid tokens gracefully
   - Decode tokens to access user information

3. **Secure routes**
   - Protect endpoints with authentication middleware
   - Restrict actions based on roles or permissions
   - Ensure sensitive routes never expose data to unauthorized users

## Best Practices
- Store JWT secret in environment variables
- Use short-lived access tokens with refresh tokens
- Handle token errors consistently in JSON responses
- Never store tokens in plain text in localStorage without precautions
- Log authentication attempts for monitoring

## Example Structure
```ts
// Generate JWT
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "15m" }
);

// Middleware to protect routes
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

// Protected route
app.get("/profile", authMiddleware, (req, res) => {
  res.json({ success: true, data: req.user });
});
