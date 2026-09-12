---
name: cors-error-handling
description: Detect and fix CORS issues, set proper headers, handle preflight requests, support credentials, and log blocked requests.
---

# CORS Error Handling Skill

## Instructions

1. **Detect CORS issues**
   - Monitor browser console for blocked requests
   - Identify requests failing due to missing or misconfigured headers
   - Check both simple and preflight requests

2. **Set proper headers**
   - `Access-Control-Allow-Origin` to specify allowed origins
   - `Access-Control-Allow-Methods` for supported HTTP methods
   - `Access-Control-Allow-Headers` for custom headers
   - Use wildcard `*` only when safe and acceptable

3. **Handle preflight requests**
   - Respond to `OPTIONS` requests with appropriate headers
   - Include methods and headers that the main request will use
   - Return `204 No Content` or `200 OK` for successful preflight

4. **Support credentials**
   - Use `Access-Control-Allow-Credentials: true` for cookies or HTTP auth
   - Ensure the origin is explicit and not a wildcard
   - Handle cookies securely with `Secure` and `SameSite` attributes

5. **Log blocked requests**
   - Log failed CORS requests on the server for debugging
   - Include origin, method, and URL in logs
   - Optionally alert when repeated violations occur

## Best Practices
- Avoid using `*` when credentials are required
- Keep CORS configuration centralized (middleware or proxy)
- Validate origins against a whitelist
- Combine CORS handling with proper authentication
- Test using different browsers and endpoints

## Example Structure
```ts
// Express.js CORS middleware example
import express from "express";
const app = express();

const allowedOrigins = ["https://example.com", "https://app.example.com"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin!)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    console.warn(`Blocked CORS request from origin: ${origin}`);
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // Preflight response
  }

  next();
});

app.get("/data", (req, res) => {
  res.json({ message: "CORS configured properly" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
