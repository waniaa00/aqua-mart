---
name: fastapi
description: Build async APIs with FastAPI using Pydantic models, OpenAPI, authentication, and background tasks.
---

# FastAPI Skill

## Instructions

1. **Async APIs**
   - Use `async def` for route handlers
   - Ensure non-blocking operations with async database queries
   - Handle concurrency efficiently

2. **Pydantic models**
   - Define request and response schemas
   - Validate data automatically
   - Use type hints for better clarity and documentation

3. **OpenAPI**
   - Leverage FastAPI’s automatic OpenAPI docs
   - Include detailed descriptions, examples, and response models
   - Test endpoints directly in Swagger UI

4. **Authentication**
   - Implement JWT or OAuth2 authentication
   - Protect routes using dependency injection
   - Secure sensitive endpoints with proper permissions

5. **Background tasks**
   - Offload long-running tasks with `BackgroundTasks`
   - Ensure tasks don’t block main request/response cycle
   - Monitor and log background task execution

## Best Practices
- Keep route handlers small and delegate logic to services
- Validate all input and handle errors consistently
- Use dependency injection for reusable components
- Document models and endpoints clearly
- Test background tasks and async operations

## Example Structure
```py
from fastapi import FastAPI, Depends, BackgroundTasks
from pydantic import BaseModel

app = FastAPI()

# Pydantic model
class User(BaseModel):
    username: str
    email: str

# Background task
def send_welcome_email(email: str):
    print(f"Sending welcome email to {email}")

# Async route with auth dependency
@app.post("/users")
async def create_user(user: User, background_tasks: BackgroundTasks):
    # Simulate async DB call
    await fake_db_insert(user.dict())
    background_tasks.add_task(send_welcome_email, user.email)
    return {"success": True, "user": user}

# Auth dependency example
async def get_current_user(token: str = Depends(oauth2_scheme)):
    user = verify_token(token)
    return user
