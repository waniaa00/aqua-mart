---
name: tailwind-css
description: Build responsive, themeable, and accessible UIs using Tailwind CSS with spacing and dark mode support.
---

# Tailwind CSS Skill

## Instructions

1. **Responsive design**
   - Use responsive utility classes (sm:, md:, lg:, xl:) for layout and typography
   - Ensure components look good on all screen sizes
   - Combine flex, grid, and spacing utilities for adaptable layouts

2. **Theme**
   - Configure Tailwind theme colors, fonts, and breakpoints
   - Use design tokens consistently across components
   - Leverage `@apply` for reusable custom utilities

3. **Spacing**
   - Use Tailwind spacing scale for padding, margin, and gap
   - Maintain consistent spacing across UI
   - Avoid hard-coded CSS values outside the Tailwind scale

4. **Dark mode**
   - Enable dark mode in Tailwind config (`class` or `media`)
   - Use `dark:` variants to style components for dark theme
   - Provide toggle functionality for user preference

## Best Practices
- Keep class names readable and structured
- Avoid inline styles that break consistency
- Combine utilities for reusable component patterns
- Test responsiveness on multiple devices
- Ensure text and background contrast for accessibility

## Example Structure
```tsx
import React from "react";

export default function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 animate-fade-in">
        Welcome to Tailwind CSS
      </h1>
      <p className="text-lg sm:text-xl md:text-2xl mb-6 animate-fade-in-delay">
        Build responsive, themeable, and accessible interfaces.
      </p>
      <button className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        Get Started
      </button>
    </section>
  );
}
