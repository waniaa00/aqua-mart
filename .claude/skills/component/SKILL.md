---
name: component
description: Build reusable, accessible, styled, and performant UI components.
---

# Component Skill

## Instructions

1. **Reusable UI**
   - Design components that can be reused across pages
   - Accept props to customize behavior and appearance
   - Keep components small and focused

2. **Accessibility**
   - Follow ARIA guidelines and semantic HTML
   - Ensure keyboard navigation and screen reader support
   - Provide visible focus states

3. **Styling**
   - Use modular CSS, Tailwind, or CSS-in-JS
   - Support theming and dark/light modes
   - Avoid inline styles that hinder reusability

4. **Performance**
   - Minimize unnecessary re-renders
   - Memoize heavy computations or components
   - Lazy-load components when possible

## Best Practices
- Keep components decoupled from business logic
- Write clean and readable JSX/HTML
- Use TypeScript for props typing
- Include unit tests for critical UI behavior
- Document component API for other developers

## Example Structure
```tsx
import React, { FC, memo } from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export default memo(Button);
