---
name: better-auth-python-ts
description: Implement authentication flows using Better Auth in Python or TypeScript with sessions, OAuth, and secure integration.
---

# Better Auth (Python / TypeScript) Skill

## Instructions

1. **Authentication flows**
   - Handle user signup and login
   - Support passwordless, OAuth, or multi-factor authentication
   - Manage session creation and validation

2. **Sessions**
   - Store session tokens securely
   - Support short-lived and refresh tokens
   - Integrate session validation middleware for protected routes

3. **OAuth integration**
   - Configure external providers (Google, GitHub, etc.)
   - Handle OAuth callbacks safely
   - Map provider accounts to internal user records

4. **Secure integration**
   - Store secrets and API keys in environment variables
   - Use HTTPS for token exchange
   - Prevent token leakage and CSRF attacks

## Best Practices
- Keep auth logic centralized for maintainability
- Validate all incoming auth requests
- Log login attempts for monitoring
- Rotate secrets periodically
- Handle errors gracefully without exposing sensitive information

## Example Structure (Python)
```py
from better_auth import BetterAuth

auth = BetterAuth(api_key=os.getenv("BETTER_AUTH_KEY"))

# Login route
@app.post("/login")
def login(email: str, password: str):
    user = auth.login(email, password)
    session_token = auth.create_session(user.id)
    return {"success": True, "session": session_token}

# OAuth callback
@app.get("/auth/callback")
def oauth_callback(provider: str, code: str):
    user_info = auth.oauth(provider, code)
    session_token = auth.create_session(user_info.id)
    return {"success": True, "session": session_token}
