import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { mountJellyfishScene } from '../experience/scene.js';
import '../experience/experience.css';

// The full interactive jellyfish/ocean scene, as its own page. Kept as a
// dedicated full-screen route rather than embedded in the homepage layout -
// it needs the whole viewport to read as immersive, and this way the scene's
// mount/unmount lines up exactly with this component's lifecycle (leave the
// page, the renderer and audio actually stop).
export default function Experience() {
  const rootRef = useRef(null);

  useEffect(() => {
    const unmount = mountJellyfishScene(rootRef.current);
    return unmount;
  }, []);

  return (
    <div className="experience-page" ref={rootRef}>
      <canvas id="scene"></canvas>

      <Link to="/" className="back-to-shop">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>Back to Shop</span>
      </Link>

      <main id="intro-overlay">
        <div className="intro-content">
          <h1>Abyssal Bloom</h1>
          <p>
            A bioluminescent jellyfish drifting through an ocean built entirely from Three.js geometry and shaders &mdash; no
            video, no photo textures, just code.
          </p>
          <button id="enter-btn">Enter the Ocean</button>
          <p className="intro-note">Sound is synthesized live &mdash; turn your volume up.</p>
        </div>
      </main>

      <div id="hint">Drag to look around &middot; Scroll to zoom &middot; Click to stir the current</div>

      <button id="mute-btn" aria-label="Toggle sound" title="Toggle sound">
        <svg className="icon-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
          <path d="M19 5a10 10 0 0 1 0 14"></path>
        </svg>
        <svg className="icon-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="17" y1="9" x2="23" y2="15"></line>
          <line x1="23" y1="9" x2="17" y2="15"></line>
        </svg>
      </button>

      <footer id="site-footer">
        <span>
          Built with <a href="https://threejs.org" target="_blank" rel="noopener">Three.js</a>
        </span>
        <span className="divider">&middot;</span>
        <span>Sound synthesized with the Web Audio API</span>
        <span className="divider">&middot;</span>
        <span>Developed by Wania A</span>
      </footer>
    </div>
  );
}
