---
name: shadcn
description: Build accessible, themeable UI components using the ShadCN component library.
---

# ShadCN Skill

## Instructions

1. **Component library**
   - Use ShadCN pre-built components for rapid UI development
   - Customize components via props or variants
   - Combine components to create complex layouts

2. **Theming**
   - Support light/dark modes out-of-the-box
   - Override design tokens for custom brand colors
   - Use context or theme provider for dynamic theming

3. **Accessibility**
   - Ensure all components are ARIA-compliant
   - Support keyboard navigation and focus management
   - Test components with screen readers for usability

## Best Practices
- Keep components consistent across pages
- Reuse variants for common patterns
- Avoid inline styles that break theming
- Test responsiveness across devices
- Document customizations and usage for team members

## Example Structure
```tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Example() {
  return (
    <Card className="max-w-sm mx-auto mt-8">
      <CardHeader>
        <CardTitle>Welcome to ShadCN</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">Build accessible and themeable components fast.</p>
        <Button variant="default" onClick={() => alert("Clicked!")}>
          Get Started
        </Button>
      </CardContent>
    </Card>
  );
}
