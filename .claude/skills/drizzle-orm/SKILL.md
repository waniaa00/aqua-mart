---
name: drizzle-orm
description: Use Drizzle ORM for type-safe queries, migrations, relations, and transactions.
---

# Drizzle ORM Skill

## Instructions

1. **Type-safe queries**
   - Use Drizzle's typed query builder
   - Ensure compile-time safety for field names and types
   - Avoid raw SQL when possible

2. **Migrations**
   - Define schema changes in migration files
   - Apply migrations consistently across environments
   - Support rollback in case of errors

3. **Relations**
   - Define relations between tables (one-to-one, one-to-many, many-to-many)
   - Use joins or relation queries for complex data retrieval
   - Keep relational logic in ORM models

4. **Transactions**
   - Group multiple operations in a transaction
   - Rollback changes on failure
   - Ensure atomicity for critical operations

## Best Practices
- Keep queries modular and reusable
- Validate data before inserts/updates
- Use indexes and relations thoughtfully
- Test migrations on staging before production
- Log migration and transaction results for debugging

## Example Structure
```ts
import { drizzle } from "drizzle-orm";
import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

// Define schema
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }),
  email: varchar("email", { length: 100 }),
  created_at: timestamp("created_at").defaultNow(),
});

// Type-safe query
const allUsers = await db.select().from(users).where(eq(users.username, "test"));

// Transaction example
await db.transaction(async (trx) => {
  await trx.insert(users).values({ username: "new", email: "new@mail.com" });
  await trx.update(users).set({ email: "updated@mail.com" }).where(eq(users.id, 1));
});
