import { useEffect, useRef } from 'react';
import { mountJellyfishScene } from '../experience/scene.js';

// The jellyfish/ocean scene as an ambient, non-interactive homepage hero
// background - ownership of scroll and clicks stays with the page (see the
// `interactive: false` handling in scene.js), so this never fights the
// visitor for their scroll wheel or blocks the hero's own buttons.
export default function HeroScene() {
  const rootRef = useRef(null);

  useEffect(() => {
    const unmount = mountJellyfishScene(rootRef.current, { interactive: false });
    return unmount;
  }, []);

  return (
    <div className="hero-scene" ref={rootRef} aria-hidden="true">
      <canvas id="scene"></canvas>
    </div>
  );
}
