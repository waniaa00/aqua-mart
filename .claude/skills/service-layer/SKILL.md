---
name: service-layer
description: Structure backend logic with a service layer for reusable, testable code.
---

# Service Layer Skill

## Instructions

1. **Separate logic**
   - Keep business logic out of controllers or routes
   - Use service classes or modules to encapsulate functionality
   - Make controllers thin and focused on request/response handling

2. **Reusable services**
   - Create generic, composable service methods
   - Share services across multiple routes or modules
   - Avoid duplicating code in different endpoints

3. **Testable code**
   - Write unit tests for service methods
   - Use dependency injection for easier mocking
   - Keep services stateless when possible

## Best Practices
- Single Responsibility: each service handles one domain
- Isolate database or external API calls in services
- Handle errors consistently within services
- Keep service methods small and composable
- Document service interfaces for easier collaboration

## Example Structure
```ts
// UserService.ts
class UserService {
  async createUser(data: CreateUserDto) {
    // Business logic: validate, hash password, save user
    const hashedPassword = await hashPassword(data.password);
    return db.user.create({ data: { ...data, password: hashedPassword } });
  }

  async getUserById(id: string) {
    return db.user.findUnique({ where: { id } });
  }
}

// Controller
app.post("/api/users", async (req, res) => {
  try {
    const user = await UserService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
