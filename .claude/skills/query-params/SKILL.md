---
name: query-params
description: Parse, filter, paginate, and safely handle query parameters with defaults.
---

# Query Parameters Skill

## Instructions

1. **Parsing & validation**
   - Extract query parameters from requests
   - Validate types and formats
   - Apply default values when missing

2. **Filtering**
   - Allow filtering by fields safely
   - Prevent injection or malicious input
   - Map query params to database queries

3. **Pagination**
   - Support `limit` and `page` parameters
   - Calculate offsets for database queries
   - Return metadata (total, pages, current page)

4. **Safe queries**
   - Sanitize input to prevent SQL/NoSQL injection
   - Use parameterized queries or ORM methods
   - Avoid directly concatenating query strings

## Best Practices
- Always validate query params against expected schema
- Set sensible default values for missing params
- Limit maximum page size to avoid performance issues
- Return structured JSON including results and pagination info
- Keep filtering logic consistent across endpoints

## Example Structure
```ts
// Express.js example
app.get("/api/users", async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const users = await UserService.find({
    search: search.toString(),
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  res.json({
    success: true,
    data: users,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: await UserService.count(search.toString()),
    },
  });
});
