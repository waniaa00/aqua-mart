---
name: neon-postgres
description: Connect to cloud Postgres with pooling, secure connections, and Drizzle ORM integration.
---

# Neon Postgres Skill

## Instructions

1. **Cloud Postgres**
   - Use Neon or other cloud Postgres services
   - Ensure proper database URL and credentials management
   - Monitor performance and usage

2. **Pooling**
   - Use connection pooling to handle multiple concurrent requests
   - Avoid opening too many individual connections
   - Optimize pool size based on workload

3. **Secure connections**
   - Use SSL/TLS connections
   - Store credentials in environment variables or secret managers
   - Rotate keys and passwords periodically

4. **Drizzle ORM integration**
   - Define schemas using Drizzle ORM
   - Use type-safe queries for database operations
   - Leverage migrations and relations for structured data

## Best Practices
- Keep database credentials out of codebase
- Reuse connections for performance
- Test migrations on staging before production
- Handle query errors and timeouts gracefully
- Use indexes and optimized queries for better performance

## Example Structure
```ts
import { drizzle } from "drizzle-orm/neon-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Initialize Drizzle ORM
const db = drizzle(pool, { schema });

// Example query
async function getUsers() {
  return await db.select().from(schema.users);
}

// Example insert
async function createUser(username: string, email: string) {
  return await db.insert(schema.users).values({ username, email });
}

export { db, getUsers, createUser };

