---
name: openai-chatkit-backend-python
description: Build OpenAI-powered chat backends in Python with context, secure keys, and streaming responses.
---

# OpenAI ChatKit Backend (Python) Skill

## Instructions

1. **Chat APIs**
   - Create endpoints to send and receive messages
   - Maintain session or conversation IDs for context
   - Handle user messages asynchronously

2. **Context management**
   - Store conversation history per user/session
   - Pass relevant context to OpenAI API for coherent responses
   - Manage memory size to optimize performance

3. **Secure API keys**
   - Store OpenAI API keys in environment variables
   - Never expose keys in frontend code
   - Rotate keys periodically for security

4. **Streaming responses**
   - Stream AI responses to users for real-time feedback
   - Handle partial data and incremental updates
   - Manage connection timeouts and errors

## Best Practices
- Keep backend endpoints stateless except for session context
- Validate and sanitize all user input
- Log requests and responses for debugging while avoiding sensitive info
- Implement rate limiting to prevent abuse
- Test endpoints with multiple edge cases and conversation scenarios

## Example Structure
```py
from fastapi import FastAPI, Request
from openai import OpenAI
import os

app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

conversation_store = {}

@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    user_id = data["user_id"]
    message = data["message"]

    # Maintain context
    history = conversation_store.get(user_id, [])
    history.append({"role": "user", "content": message})

    # Send request to OpenAI
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=history,
        stream=True  # Enable streaming
    )

    # Collect streamed response
    reply = ""
    for event in response:
        if event.type == "response.output_text.delta":
            reply += event.delta
            # Optionally send partial updates to frontend

    # Update conversation history
    history.append({"role": "assistant", "content": reply})
    conversation_store[user_id] = history

    return {"success": True, "reply": reply}
