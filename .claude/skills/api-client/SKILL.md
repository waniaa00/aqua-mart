---
name: api-client
description: Build reusable frontend API clients with auth headers, request handling, and error management.
---

# API Client Skill

## Instructions

1. **Reusable requests**
   - Centralize API calls in a single client module
   - Use functions or classes to handle GET, POST, PUT, DELETE
   - Support query parameters, body data, and headers

2. **Auth headers**
   - Automatically attach tokens or API keys to requests
   - Refresh tokens when expired
   - Securely store credentials (cookies, secure storage, or context)

3. **Error handling**
   - Catch network or server errors
   - Handle different HTTP status codes
   - Return consistent error objects for UI components

## Best Practices
- Keep API client DRY (Don’t Repeat Yourself)
- Use TypeScript types for request and response data
- Log errors internally but return safe messages to users
- Support request cancellation or timeouts
- Abstract base URL for easy environment switching (dev/staging/prod)

## Example Structure
```ts
// apiClient.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    console.error("API error:", error);
    return Promise.reject({ message: error?.response?.data?.error || "Network Error" });
  }
);

export const getUsers = () => api.get("/users");
export const createUser = (data: { username: string; email: string }) =>
  api.post("/users", data);
