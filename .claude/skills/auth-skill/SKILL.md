---
name: auth-skill
description: Implement secure authentication systems including signup, signin, password hashing, JWT tokens, and Better Auth integration.
---

# Authentication Skill

## Instructions

1. **Core authentication flows**
   - User signup and signin
   - Input validation
   - Secure credential handling

2. **Password security**
   - Hash passwords using bcrypt or argon2
   - Never store plain-text passwords
   - Use salting and proper hash rounds

3. **Token-based authentication**
   - Generate JWT access tokens
   - Set token expiration
   - Verify and decode tokens on protected routes

4. **Better Auth integration**
   - Configure Better Auth provider
   - Connect authentication adapters
   - Enable session and token management

## Best Practices
- Always hash passwords before storing
- Use environment variables for secrets
- Short-lived access tokens with refresh tokens
- Protect routes using middleware
- Implement proper error handling (no sensitive info)

## Example Structure
```ts
// Signup
const hashedPassword = await bcrypt.hash(password, 12);

// JWT creation
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: "15m" }
);

// Protected route
app.get("/profile", verifyToken, (req, res) => {
  res.json({ user: req.user });
});
