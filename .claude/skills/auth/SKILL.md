---
name: auth
description: Implement login/signup, protected routes, and token management for secure authentication.
---

# Auth Skill

## Instructions

1. **Login & Signup**
   - Create endpoints for user registration and login
   - Validate input data (email, password, etc.)
   - Hash passwords securely before storing

2. **Protected routes**
   - Use middleware or hooks to guard sensitive endpoints
   - Restrict access based on user roles or permissions
   - Return proper HTTP status codes for unauthorized access

3. **Token management**
   - Generate JWT or session tokens on login
   - Store tokens securely (cookies or local storage)
   - Validate and refresh tokens as needed

## Best Practices
- Never store plain-text passwords
- Keep auth logic centralized and reusable
- Use HTTPS for all auth-related requests
- Handle expired or invalid tokens gracefully
- Log login attempts for monitoring

## Example Structure
```ts
// Express.js example
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());

// Signup route
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({ data: { username, password: hashed } });
  res.status(201).json({ success: true, user });
});

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  res.json({ success: true, token });
});

// Protected route
app.get("/profile", authMiddleware, (req, res) => {
  res.json({ success: true, data: req.user });
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
