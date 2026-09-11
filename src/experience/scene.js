import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createJellyfish } from './jellyfish.js';
import {
  createOceanBackdrop,
  createMarineSnow,
  createLightShafts,
  createFishSchool,
  createZooplankton,
  createKelp,
  createRay,
  createSeafloor,
  createRocks,
} from './ocean.js';
import { OceanAudio } from './audio.js';

const FLOOR_Y = -10; // shared reference so the floor, kelp roots, and rocks all agree on "ground"

// Builds and runs the jellyfish/ocean scene inside `root`. Everything that
// used to run at module scope in main.js now lives inside this function so
// it can be mounted and torn down cleanly by React (route away, and the
// renderer/audio/listeners all actually stop - no leaked animation loop
// running behind the shop).
//
// `interactive` (default true) toggles between two very different jobs for
// the same scene:
//  - true  (the /experience page): full drag-to-orbit, scroll-to-zoom,
//    click-to-ripple, and the synthesized audio, gated behind the
//    "Enter the Ocean" button the browser's autoplay policy requires. Needs
//    the full experience.css markup (#enter-btn, #intro-overlay, #hint,
//    #mute-btn) present in `root`.
//  - false (the homepage hero background): OrbitControls' event handling is
//    switched off so scrolling the page and clicking hero buttons work
//    normally - a background must never hijack the page's own scroll/drag -
//    while autoRotate keeps the camera gently moving on its own. No audio,
//    no click handling, no gated UI: `root` only needs the <canvas>.
export function mountJellyfishScene(root, { interactive = true } = {}) {
  const canvas = root.querySelector('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

  const getSize = () => ({ width: root.clientWidth, height: root.clientHeight });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const initialSize = getSize();
  renderer.setSize(initialSize.width, initialSize.height);

  const scene = new THREE.Scene();
  // Lighter than a close-up needs - at wider viewing distances a denser fog
  // would swallow the light shafts and school of fish before they read.
  scene.fog = new THREE.FogExp2('#031420', 0.035);

  const camera = new THREE.PerspectiveCamera(55, initialSize.width / initialSize.height, 0.1, 100);
  camera.position.set(0, 1, 9);

  // Drag-to-orbit / scroll-to-zoom, the standard Three.js interaction
  // controls: https://threejs.org/docs/#examples/en/controls/OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 18; // far enough to pull back into a full scenic view of the ocean
  controls.minPolarAngle = Math.PI * 0.2;
  // Capped well short of straight-up-from-below: at maxDistance and a steeper
  // angle than this the camera would dip below the seafloor (y = FLOOR_Y).
  controls.maxPolarAngle = Math.PI * 0.65;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.3;
  // autoRotate/damping still run every frame via controls.update() even
  // with input disabled - only the drag/wheel/touch event handling turns
  // off, which is exactly what a background needs: alive, but passive.
  controls.enabled = interactive;

  // --- world ---------------------------------------------------------------

  createOceanBackdrop(scene);

  const seafloor = createSeafloor({ y: FLOOR_Y });
  scene.add(seafloor);

  const rocks = createRocks(14, { spread: 20, floorY: FLOOR_Y });
  scene.add(rocks);

  const { points: marineSnow, update: updateSnow } = createMarineSnow(500);
  scene.add(marineSnow);

  const { group: lightShaftGroup, update: updateLightShafts } = createLightShafts(7);
  scene.add(lightShaftGroup);

  const { mesh: shelterFish, update: updateFish } = createFishSchool();
  scene.add(shelterFish);

  // A second, larger school that roams the open water on its own slow drift
  // rather than sheltering under the jellyfish - a different species, distinct
  // color, distinct behavior, so the water feels inhabited beyond one animal.
  const { mesh: wanderingFish, update: updateWanderingFish } = createFishSchool({
    count: 14,
    color: '#e8cfa0',
    scale: 1.8,
    radius: [1.4, 2.6],
    height: [-0.6, 1.6],
    angularSpeed: [0.15, 0.32],
  });
  scene.add(wanderingFish);
  const wanderAnchor = new THREE.Vector3();

  const { points: zooplankton, update: updateZooplankton } = createZooplankton(60, 8);
  scene.add(zooplankton);

  const { mesh: kelp, update: updateKelp } = createKelp(12, 11, FLOOR_Y);
  scene.add(kelp);

  const rays = [createRay({ color: '#3a5a72' }), createRay({ wingspan: 1.3, bodyLength: 0.75, color: '#4a6b82' })];
  for (const ray of rays) scene.add(ray.group);

  const sun = new THREE.DirectionalLight('#bfe9ff', 1.4);
  sun.position.set(2, 6, 3);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight('#1c5f7a', '#01050a', 0.6));

  const { group: jellyfishGroup, update: updateJellyfish } = createJellyfish();
  scene.add(jellyfishGroup);

  // A loose "bloom" of smaller, differently-tinted jellyfish drifting further
  // out - real jellyfish populations do cluster this way. Each gets its own
  // drift phase and pulse offset so they read as individuals, not clones, and
  // they don't respond to clicks (too far off to be part of the interaction).
  const bloomJellies = [
    {
      ...createJellyfish({ bellColorA: '#8fd9ff', bellColorB: '#6a4fc2', tentacleColor: '#8fd9ff', oralColor: '#c77bf0' }),
      scale: 0.55,
      driftRadius: 4.5,
      driftPhase: 1.7,
      pulsePhase: 2.1,
    },
    {
      ...createJellyfish({ bellColorA: '#7fe8c9', bellColorB: '#5a8fd0', gonadColor: '#ffe6d0', tentacleColor: '#7fe8c9', oralColor: '#a0d6ff' }),
      scale: 0.4,
      driftRadius: 6.5,
      driftPhase: 4.2,
      pulsePhase: 5.6,
    },
  ];
  for (const jelly of bloomJellies) {
    jelly.group.scale.setScalar(jelly.scale);
    scene.add(jelly.group);
  }

  // Audio only exists at all in interactive mode - a background has no
  // business autoplaying sound, and browsers would block it without a
  // user gesture anyway.
  const audio = interactive ? new OceanAudio() : null;

  // --- pointer interaction ---------------------------------------------

  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let pulseKick = 0;
  let fishStartle = 0;

  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  }

  // Head-tracking (the jellyfish subtly tilts toward the pointer) stays on
  // in both modes - it's just a mousemove read, never blocks a click or
  // the page's own scroll, so it's harmless to leave on for the background.
  function onPointerMove(event) {
    updatePointer(event);
    dismissHint();
  }

  function onPointerDown(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);

    const hitPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(interactionPlane, hitPoint)) {
      spawnRipple(hitPoint);
    }

    // A click reads as a disturbance in the water, not a direct "hit" - the
    // jellyfish, which has no eyes or brain, only answers with one extra
    // pulse; the small fish, which do sense danger, scatter far more sharply.
    pulseKick = 0.6;
    fishStartle = 1;
    audio.playBubble(0.25);
    dismissHint();
  }

  function onResize() {
    const size = getSize();
    if (size.width === 0 || size.height === 0) return;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    renderer.setSize(size.width, size.height);
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  if (interactive) renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onResize);

  // ResizeObserver instead of only window resize - the experience now lives
  // in a container whose size can change independently of the window (e.g.
  // a hero panel), not just full-viewport as it was as a standalone page.
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(root);

  // --- click ripples (small reusable pool, avoids per-click allocation) ---
  // Only built in interactive mode - nothing ever triggers them otherwise.

  function createRippleMesh() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uProgress: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uProgress;
        varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(0.5));
          float ring = smoothstep(0.5, 0.42, d) - smoothstep(0.42, 0.3, d);
          gl_FragColor = vec4(0.6, 0.9, 1.0, ring * (1.0 - uProgress) * 0.6);
        }
      `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  const ripplePool = interactive ? Array.from({ length: 6 }, () => ({ mesh: createRippleMesh(), t: 1 })) : [];

  function spawnRipple(position) {
    const ripple = ripplePool.find((r) => r.t >= 1);
    if (!ripple) return;
    ripple.t = 0;
    ripple.mesh.position.copy(position);
    ripple.mesh.quaternion.copy(camera.quaternion); // always face the viewer
    ripple.mesh.visible = true;
  }

  // --- UI wiring -----------------------------------------------------------
  // Only present in interactive mode - the hero background renders none of
  // this markup (see HeroScene.jsx), so these elements simply don't exist.

  const enterBtn = interactive ? root.querySelector('#enter-btn') : null;
  const overlay = interactive ? root.querySelector('#intro-overlay') : null;
  const muteBtn = interactive ? root.querySelector('#mute-btn') : null;
  const hint = interactive ? root.querySelector('#hint') : null;

  function onEnter() {
    audio.start();
    overlay.classList.add('hidden');
    setTimeout(() => hint.classList.add('visible'), 400);
  }

  function onToggleMute() {
    const muted = audio.toggleMute();
    muteBtn.classList.toggle('muted', muted);
  }

  let hintDismissed = !interactive;
  function dismissHint() {
    if (hintDismissed) return;
    hintDismissed = true;
    hint.classList.remove('visible');
  }

  if (interactive) {
    enterBtn.addEventListener('click', onEnter);
    muteBtn.addEventListener('click', onToggleMute);
  }

  // --- render loop -----------------------------------------------------

  const clock = new THREE.Clock();
  let disposed = false;

  renderer.setAnimationLoop(() => {
    if (disposed) return;

    // getElapsedTime() calls getDelta() internally, so calling both here
    // would have the second call measure only the gap between these two
    // statements instead of the real frame time. One call, then read the
    // accumulated total off the clock directly.
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    pulseKick = THREE.MathUtils.damp(pulseKick, 0, 3, delta);
    fishStartle = THREE.MathUtils.damp(fishStartle, 0, 2.5, delta);
    updateJellyfish(elapsed, delta, pulseKick);
    updateSnow(elapsed);
    updateLightShafts(elapsed);

    // Passive drift: a few slow, independent sine terms stand in for the
    // gentle push of ambient current. The jellyfish's own pulse only supplies
    // a little thrust - most of its movement is borrowed from the water, the
    // same way a real jellyfish travels more as plankton than as a swimmer.
    const driftX = Math.sin(elapsed * 0.11) * 0.6 + Math.sin(elapsed * 0.045 + 1.3) * 0.3;
    const driftZ = Math.cos(elapsed * 0.09 + 0.7) * 0.5 + Math.sin(elapsed * 0.037 + 2.1) * 0.25;
    const driftY = Math.sin(elapsed * 0.3) * 0.15 + Math.sin(elapsed * 0.065) * 0.1;
    jellyfishGroup.position.set(driftX, driftY, driftZ);
    jellyfishGroup.rotation.z = THREE.MathUtils.damp(jellyfishGroup.rotation.z, -pointer.x * 0.15, 4, delta);
    jellyfishGroup.rotation.x = THREE.MathUtils.damp(jellyfishGroup.rotation.x, pointer.y * 0.1, 4, delta);

    updateFish(elapsed, delta, jellyfishGroup.position, fishStartle);

    // The wandering school roams on its own slow, wide loop, independent of
    // the jellyfish - just another few sine terms, same pattern as the
    // jellyfish's own current-driven drift, at a different scale and phase.
    wanderAnchor.set(
      Math.sin(elapsed * 0.06 + 2.4) * 3.5 + Math.sin(elapsed * 0.023 + 0.4) * 2,
      0.3 + Math.sin(elapsed * 0.09) * 0.6,
      Math.cos(elapsed * 0.05 + 1.1) * 3 + Math.sin(elapsed * 0.02 + 3.2) * 2
    );
    updateWanderingFish(elapsed, delta, wanderAnchor, fishStartle);

    // The tentacle canopy roughly spans this radius and height beneath the
    // bell - used to decide when a drifting zooplankter has been "captured."
    const canopyRadius = 0.85;
    const canopyYRange = [jellyfishGroup.position.y - 1.7, jellyfishGroup.position.y - 0.05];
    updateZooplankton(elapsed, delta, jellyfishGroup.position, canopyRadius, canopyYRange);

    updateKelp(elapsed);
    for (const ray of rays) ray.update(elapsed, delta);

    for (const jelly of bloomJellies) {
      const x = Math.sin(elapsed * 0.05 + jelly.driftPhase) * jelly.driftRadius;
      const z = Math.cos(elapsed * 0.04 + jelly.driftPhase * 1.3) * jelly.driftRadius;
      const y = -1 + Math.sin(elapsed * 0.15 + jelly.driftPhase) * 0.4;
      jelly.group.position.set(x, y, z);
      // no pulseKick of their own - they're background life, not part of the
      // click interaction - and a phase offset keeps their pulses desynced.
      jelly.update(elapsed + jelly.pulsePhase, delta, 0);
    }

    for (const ripple of ripplePool) {
      if (ripple.t >= 1) continue;
      ripple.t = Math.min(ripple.t + delta * 0.6, 1);
      ripple.mesh.scale.setScalar(0.3 + ripple.t * 3);
      ripple.mesh.material.uniforms.uProgress.value = ripple.t;
      if (ripple.t >= 1) ripple.mesh.visible = false;
    }

    controls.update();
    renderer.render(scene, camera);
  });

  // --- teardown --------------------------------------------------------

  return function unmount() {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    window.removeEventListener('resize', onResize);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    if (interactive) {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      enterBtn.removeEventListener('click', onEnter);
      muteBtn.removeEventListener('click', onToggleMute);
      audio.dispose();
    }
    controls.dispose();
    renderer.dispose();
    scene.traverse((obj) => {
      obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of materials) m?.dispose?.();
    });
  };
}
