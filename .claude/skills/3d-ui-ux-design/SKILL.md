---
name: 3d-ui-ux-design
description: Create immersive, interactive, performant, and accessible 3D web interfaces using Three.js and React Three Fiber, including 3D scenes, models, lighting, materials, cameras, animations, interactions, responsive layouts, and UX.
---

# 3D UI/UX Design Skill

## Purpose

Use this skill to design and implement polished 3D web experiences that combine strong visual design, intuitive UX, responsive layouts, and efficient real-time rendering.

## Core Capabilities

- Build 3D interfaces with **Three.js** and **React Three Fiber (R3F)**.
- Design immersive 3D scenes and spatial layouts.
- Import, position, transform, and optimize 3D models.
- Configure cameras, lighting, shadows, materials, textures, and environments.
- Create smooth animations, transitions, and interactive effects.
- Implement mouse, touch, pointer, scroll, drag, hover, click, and gesture interactions.
- Combine 3D content with conventional HTML/CSS UI.
- Create responsive experiences for desktop, tablet, and mobile.
- Apply accessibility principles to 3D experiences.
- Optimize rendering, assets, memory, loading, and frame rate.
- Design graceful fallbacks for devices that cannot handle advanced 3D.

## Design Principles

### 1. UX First

3D should improve the experience rather than exist only as decoration.

- Establish a clear primary action.
- Maintain predictable navigation and interaction.
- Avoid unnecessary camera movement and visual noise.
- Preserve readable content and UI hierarchy.
- Provide feedback for interactive elements.
- Give users control over immersive effects when appropriate.

### 2. Visual Hierarchy

Use depth intentionally.

- Foreground: primary interactive objects and actions.
- Midground: supporting content and visual context.
- Background: atmosphere and environmental elements.
- Use scale, position, lighting, contrast, and motion to guide attention.

### 3. Spatial Consistency

Maintain a coherent 3D world.

- Use consistent coordinate systems.
- Keep object scale realistic or intentionally stylized.
- Establish clear camera conventions.
- Avoid clipping and awkward intersections.
- Use depth and perspective to communicate relationships.

## Three.js / R3F

Prefer React Three Fiber for React-based applications.

Typical structure:

```text
Canvas
├── Scene
│   ├── Environment
│   ├── Lights
│   ├── Camera
│   ├── Models
│   ├── Effects
│   └── Interaction Controllers
└── HTML / UI Overlay
```

Use `@react-three/fiber` for rendering and `@react-three/drei` for reusable helpers when appropriate.

Use Three.js directly when lower-level control is necessary.

## 3D Scenes

When creating a scene, consider:

- Canvas configuration
- Camera type and position
- Scene scale
- Lighting setup
- Environment/background
- Fog when useful
- Ground planes
- Shadows
- Materials
- Post-processing
- Object hierarchy
- Interaction zones

Keep the scene composition intentional and avoid adding effects without a UX or visual purpose.

## Models and Assets

Prefer optimized web-friendly assets.

- Use GLTF/GLB for 3D models.
- Compress large models and textures.
- Remove unused geometry, materials, and animations.
- Reuse shared assets where possible.
- Lazy-load expensive models.
- Provide loading states.
- Consider Draco or mesh compression when appropriate.
- Use appropriate texture resolutions for the target device.

Never assume that a high-poly asset is automatically better.

## Lighting

Choose lighting according to the visual goal.

Common approaches:

- Ambient/environment lighting for general illumination.
- Directional lights for sunlight-style lighting.
- Point lights for localized illumination.
- Spotlights for focused lighting.
- HDR environments for realistic reflections and illumination.

Avoid excessive lights because real-time lighting can be expensive.

## Materials and Textures

Use materials intentionally.

Consider:

- Roughness
- Metalness
- Normal maps
- Ambient occlusion
- Emissive effects
- Transparency
- Texture resolution
- Texture compression

Prefer physically based materials when realistic rendering is required.

## Cameras

Use camera movement carefully.

- Perspective camera for immersive scenes.
- Orthographic camera for controlled/product-style views.
- Smooth transitions between camera states.
- Constrain orbital controls when free movement is unnecessary.
- Prevent disorienting rotations.
- Keep important content within the user's visual field.

## Animation

Animations should communicate state, hierarchy, or affordance.

Use:

- `useFrame` for frame-based behavior.
- R3F-compatible animation libraries for complex transitions.
- GSAP or similar tools when timeline-based animation is appropriate.

Prefer smooth, purposeful motion over constant movement.

Support reduced-motion preferences for accessibility.

## Interaction

Interactive 3D objects should have clear affordances.

Support when appropriate:

- Hover states
- Click/tap actions
- Pointer movement
- Dragging
- Scroll-driven animation
- Camera controls
- Object selection
- Tooltips
- Focus states
- Touch gestures

Provide visual feedback such as scale, rotation, glow, cursor changes, or UI labels.

Do not rely exclusively on hover because touch devices do not provide hover in the same way.

## Responsive Design

Design for different capabilities, not just different screen widths.

### Desktop

- Richer scenes
- Larger models
- Advanced effects when performance allows
- More interactive controls

### Tablet

- Simplified interactions
- Moderate rendering complexity
- Touch-friendly controls

### Mobile

- Simplified geometry and effects
- Reduced animation complexity
- Larger touch targets
- Minimal camera movement
- Fast loading
- Consider replacing complex 3D with static or lightweight alternatives when necessary

Use responsive breakpoints and runtime capability checks where appropriate.

## Performance Optimization

Treat performance as a core UX requirement.

Optimize:

- Polygon count
- Draw calls
- Texture sizes
- Shadow maps
- Post-processing
- Number of lights
- Particle counts
- Animation loops
- Memory usage
- Asset loading

Prefer:

- Instancing for repeated objects.
- Asset reuse.
- Lazy loading.
- Level-of-detail strategies.
- Compressed textures/models.
- Conditional effects.
- Device-aware quality settings.

Avoid unnecessary work inside `useFrame`.

Do not create objects repeatedly during every render frame when they can be reused.

## Loading and Error States

Every significant 3D asset should have a graceful loading strategy.

Provide:

- Loading indicators
- Skeletons/placeholders
- Progress feedback when useful
- Error handling
- Fallback visuals
- Retry options where appropriate

A broken 3D asset should not break the entire page.

## Accessibility

3D interfaces must remain usable without relying exclusively on visual depth or motion.

Include:

- Semantic HTML controls.
- Keyboard navigation.
- Visible focus states.
- Accessible labels.
- Alternative text or descriptions where appropriate.
- Reduced-motion support.
- Sufficient contrast.
- Touch-friendly controls.
- Non-3D alternatives for critical information and actions.

Critical content should remain available in accessible HTML whenever possible.

## 3D + HTML UI

Use HTML/CSS for content-heavy interface elements.

Good candidates for HTML:

- Navigation
- Buttons
- Forms
- Product information
- Menus
- Dialogs
- Tooltips
- Accessibility content

Good candidates for 3D:

- Product visualization
- Interactive environments
- Hero scenes
- Spatial navigation
- Data visualization
- Decorative immersive backgrounds

Avoid rebuilding ordinary UI controls as 3D geometry unless there is a strong reason.

## Recommended Workflow

1. Define the user goal and primary interaction.
2. Establish the visual direction and 3D concept.
3. Sketch the page hierarchy and interaction flow.
4. Decide what should be 3D versus HTML/CSS.
5. Build the basic responsive layout.
6. Create the camera and scene structure.
7. Add models, materials, and lighting.
8. Add interactions and animation.
9. Add loading and error states.
10. Test keyboard, touch, and reduced-motion behavior.
11. Profile rendering performance.
12. Optimize assets and effects.
13. Test on low-end mobile hardware.
14. Polish visual details without sacrificing usability.

## Quality Checklist

Before considering a 3D UI complete, verify:

- [ ] The 3D elements serve a clear UX purpose.
- [ ] The primary action is obvious.
- [ ] Camera behavior is comfortable and predictable.
- [ ] Interactions provide clear feedback.
- [ ] Desktop and mobile experiences are usable.
- [ ] Touch interactions work correctly.
- [ ] Keyboard navigation works for important controls.
- [ ] Reduced-motion preferences are respected.
- [ ] Loading states exist.
- [ ] Asset failures have fallbacks.
- [ ] Models and textures are optimized.
- [ ] Rendering performance is acceptable.
- [ ] No unnecessary work occurs every frame.
- [ ] Critical information is not locked inside 3D.
- [ ] The experience remains usable when 3D is disabled.

## Output Expectations

When implementing a 3D interface:

- Produce production-oriented, maintainable code.
- Prefer reusable React components.
- Keep scene logic separate from UI logic.
- Explain important performance trade-offs.
- Avoid unnecessary dependencies.
- Use accessible HTML for essential controls.
- Optimize for real devices rather than only high-end development hardware.
- Prioritize usability, performance, and clarity alongside visual impact.
