---
name: testing
description: Write unit and integration tests with mocks, handling edge cases for robust backend code.
---

# Testing Skill

## Instructions

1. **Unit tests**
   - Test individual functions or methods
   - Cover expected outputs and edge cases
   - Mock external dependencies

2. **Integration tests**
   - Test multiple components together
   - Verify database interactions, API calls, and service layers
   - Ensure the system behaves correctly under real-world scenarios

3. **Mocks**
   - Use mocking libraries to isolate units
   - Simulate external services, APIs, or databases
   - Control responses to test edge cases

4. **Edge cases**
   - Test invalid inputs, empty states, and boundary conditions
   - Include negative scenarios (errors, exceptions)
   - Ensure graceful failure and proper error messages

## Best Practices
- Keep tests independent and repeatable
- Write tests alongside features, not after
- Cover both success and failure paths
- Automate tests with CI/CD pipelines
- Use descriptive test names for readability

## Example Structure
```ts
// Using Jest
import { UserService } from "./UserService";

describe("UserService.createUser", () => {
  it("should hash password and create a user", async () => {
    const mockDb = { user: { create: jest.fn().mockResolvedValue({ id: "1" }) } };
    const service = new UserService(mockDb as any);

    const user = await service.createUser({ username: "test", password: "pass123" });
    expect(user.id).toBe("1");
    expect(mockDb.user.create).toHaveBeenCalled();
  });

  it("should throw error on invalid input", async () => {
    const service = new UserService({} as any);
    await expect(service.createUser({ username: "", password: "" })).rejects.toThrow();
  });
});
