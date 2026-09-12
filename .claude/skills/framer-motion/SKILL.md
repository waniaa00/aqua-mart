---
name: framer-motion
description: Create smooth animations, transitions, gestures, and layout motion using Framer Motion.
---

# Framer Motion Skill

## Instructions

1. **Animations**
   - Apply motion to elements on mount/unmount
   - Use `animate`, `initial`, and `exit` props for smooth effects
   - Combine multiple properties (opacity, scale, position)

2. **Transitions**
   - Customize timing, easing, and duration
   - Use `transition` prop for delays, spring, or tween effects
   - Coordinate multiple animations for cohesive motion

3. **Gestures**
   - Implement `drag`, `whileHover`, `whileTap`, and `whileDrag` interactions
   - Handle user input dynamically and responsively
   - Combine gestures with animation for interactive UI

4. **Layout motion**
   - Use `layout` prop to animate position and size changes
   - Automatically animate shared layout transitions between components
   - Enable smooth reflow when elements are added or removed

## Best Practices
- Keep motion subtle and purposeful
- Avoid excessive animations that distract users
- Combine variants for reusable animation patterns
- Test animations across devices for performance
- Use `AnimatePresence` for exit animations

## Example Structure
```tsx
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";

const AnimatedCard = () => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div>
      <button onClick={() => setIsVisible(!isVisible)}>Toggle Card</button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="p-4 bg-blue-500 text-white rounded"
          >
            I am an animated card
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedCard;
