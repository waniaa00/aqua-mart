---
name: openai-chatkit-frontend-embed-skill
description: Embed OpenAI chat in frontend apps with streaming, history, and theming support.
---

# OpenAI ChatKit Frontend Embed Skill

## Instructions

1. **Embed chat**
   - Integrate chat UI component into any page or app
   - Support user input, send/receive messages
   - Connect securely to backend chat API

2. **Streaming**
   - Display AI responses incrementally for real-time feedback
   - Handle partial updates and streaming tokens
   - Ensure smooth scroll as new messages appear

3. **History**
   - Maintain conversation history per user/session
   - Load past messages on component mount
   - Support persistence via backend API or local storage

4. **Themed UI**
   - Support light/dark mode and custom styling
   - Make components reusable across projects
   - Use CSS, Tailwind, or styled-components for theming

## Best Practices
- Keep the chat component decoupled from page logic
- Sanitize user input before sending to backend
- Limit message history to optimize performance
- Handle errors gracefully and show fallback messages
- Animate new messages for smooth UX

## Example Structure
```tsx
import React, { useEffect, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const ChatEmbed = ({ userId }: { userId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // Load history from API
    fetch(`/api/chat/history?userId=${userId}`)
      .then(res => res.json())
      .then(data => setMessages(data));
  }, [userId]);

  const sendMessage = async () => {
    const userMessage = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    const response = await fetch(`/api/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message: input }),
    });

    const reader = response.body?.getReader();
    let assistantMessage = { id: Date.now().toString(), role: "assistant", content: "" };

    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantMessage.content += new TextDecoder().decode(value);
        setMessages(prev => [...prev.filter(m => m.id !== assistantMessage.id), assistantMessage]);
      }
    }
  };

  return (
    <div className="chat-container p-4 border rounded bg-white dark:bg-gray-800">
      <div className="messages overflow-y-auto h-64">
        {messages.map(m => (
          <div key={m.id} className={`message ${m.role === "user" ? "text-right" : "text-left"}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="input mt-2 flex">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <button onClick={sendMessage} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatEmbed;
