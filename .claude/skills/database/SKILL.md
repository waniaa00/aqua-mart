---
name: database
description: Design efficient database schemas, manage migrations, create indexes, and optimize queries.
---

# Database Design Skill

## Instructions

1. **Schema design**
   - Define tables/collections with clear relationships
   - Normalize data where appropriate
   - Use descriptive field names and types

2. **Migrations**
   - Version-control database changes
   - Apply changes safely without losing data
   - Rollback migrations if needed

3. **Indexes**
   - Add indexes to frequently queried fields
   - Use unique and composite indexes where appropriate
   - Avoid unnecessary indexes that slow writes

4. **Query optimization**
   - Analyze query plans
   - Reduce unnecessary joins and lookups
   - Paginate large result sets

## Best Practices
- Keep database schemas consistent across environments
- Validate data at both application and database levels
- Monitor query performance regularly
- Use environment variables for credentials
- Avoid storing sensitive data unencrypted

## Example Structure
```ts
// Example schema (Postgres)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

// Index for quick lookup
CREATE INDEX idx_users_email ON users(email);

// Query optimization example
SELECT id, username FROM users
WHERE email = 'example@mail.com'
LIMIT 1;
