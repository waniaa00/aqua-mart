---
name: types
description: Define type-safe interfaces, sync with backend, and enforce strict checking.
---

# Types Skill

## Instructions

1. **Type-safe interfaces**
   - Define clear TypeScript interfaces and types for data structures
   - Ensure all props, state, and function parameters are typed
   - Use union and literal types where appropriate

2. **Sync with backend**
   - Keep frontend types aligned with backend API responses
   - Use code generation tools (e.g., OpenAPI, Zod, or GraphQL Codegen) when possible
   - Validate incoming API data against expected types

3. **Strict checking**
   - Enable TypeScript strict mode
   - Avoid using `any` or unsafe type assertions
   - Use type guards and runtime validation for dynamic data

## Best Practices
- Keep types centralized and reusable
- Use enums or union types for fixed sets of values
- Type errors early to prevent runtime issues
- Document types for better developer collaboration
- Combine TypeScript with runtime validators for safety

## Example Structure
```ts
// Backend response type
interface UserResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

// Frontend props type
interface UserCardProps {
  user: UserResponse;
}

// Component using typed props
const UserCard: React.FC<UserCardProps> = ({ user }) => {
  return (
    <div className="p-4 border rounded">
      <h2>{user.username}</h2>
      <p>{user.email}</p>
      <small>{new Date(user.createdAt).toLocaleDateString()}</small>
    </div>
  );
};

// Example API fetch with type enforcement
async function fetchUsers(): Promise<UserResponse[]> {
  const res = await fetch("/api/users");
  const data: UserResponse[] = await res.json();
  return data;
}
