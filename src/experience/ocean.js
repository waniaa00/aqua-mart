import * as THREE from 'three';

// A large inverted sphere with a vertical gradient stands in for a sea
// "dome" - far cheaper than a skybox texture, always in focus, and needs
// no assets to load. Same BackSide-sphere trick used for Three.js sky
// examples (see https://threejs.org/docs/#api/en/constants/Materials, Side).
export function createOceanBackdrop(scene) {
  const geometry = new THREE.SphereGeometry(60, 24, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color('#0a3a52') },
      uBottom: { value: new THREE.Color('#00060c') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uBottom;
      varying vec3 vPos;
      void main() {
        float h = clamp(vPos.y / 60.0 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(uBottom, uTop, h), 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(geometry, material);
  scene.add(dome);
  return dome;
}

// "Marine snow": drifting particulate matter that reads instantly as
// underwater depth. A single THREE.Points draw call, position offsets are
// computed per-frame in the vertex shader so the CPU stays idle.
export function createMarineSnow(count = 350) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    speeds[i] = 0.15 + Math.random() * 0.35;
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#bfe9ff') },
    },
    vertexShader: /* glsl */ `
      attribute float aSpeed;
      attribute float aSeed;
      uniform float uTime;
      varying float vFade;

      void main() {
        vec3 pos = position;
        float y = mod(pos.y + uTime * aSpeed, 20.0) - 10.0;
        pos.x += sin(uTime * 0.4 + aSeed) * 0.6;
        pos.z += cos(uTime * 0.3 + aSeed) * 0.6;
        pos.y = y;
        vFade = 1.0 - abs(y) / 10.0;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 26.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = (1.0 - d * 2.0) * vFade * 0.5;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);

  function update(elapsed) {
    material.uniforms.uTime.value = elapsed;
  }

  return { points, update };
}

// Sunlight scattered and dimmed by depth arrives as soft, drifting shafts
// rather than sharp rays - a handful of large, low-opacity additive planes
// is enough to read as light moving through water without the cost of a
// real volumetric pass.
export function createLightShafts(count = 5) {
  const group = new THREE.Group();
  const shafts = [];

  for (let i = 0; i < count; i++) {
    const height = 24 + Math.random() * 10;
    const width = 1.2 + Math.random() * 1.5;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 0.05 + Math.random() * 0.04 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          // brightest near the surface (top of the plane), fading with
          // depth, and tapering at the horizontal edges into a soft shaft
          float vertical = smoothstep(0.0, 0.85, vUv.y);
          float edges = 1.0 - abs(vUv.x - 0.5) * 2.0;
          gl_FragColor = vec4(0.8, 0.95, 1.0, vertical * edges * uOpacity);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const angle = (i / count) * Math.PI * 2 + Math.random();
    const radius = 4 + Math.random() * 6;
    mesh.position.set(Math.cos(angle) * radius, height / 2 - 8, Math.sin(angle) * radius);
    mesh.rotation.y = Math.random() * Math.PI;
    const baseTilt = (Math.random() - 0.5) * 0.25;
    mesh.rotation.z = baseTilt;

    group.add(mesh);
    shafts.push({ mesh, baseTilt, phase: Math.random() * Math.PI * 2 });
  }

  function update(elapsed) {
    for (const shaft of shafts) {
      // a slow sway, as if the whole water column is breathing with the swell
      shaft.mesh.rotation.z = shaft.baseTilt + Math.sin(elapsed * 0.15 + shaft.phase) * 0.04;
    }
  }

  return { group, update };
}

// A flat kite in the Y-Z plane (nose along -Z) so THREE.Object3D#lookAt can
// orient each instance toward its direction of travel with no extra trig.
// Unlit and small - it only needs to read as a glint from a distance. Shared
// by every fish school so there's one silhouette to tune, not several.
function createFishGeometry(scale = 1) {
  const geometry = new THREE.BufferGeometry();
  const verts = new Float32Array(
    [
      0, 0, -0.045,
      0, 0.018, 0.02,
      0, 0, 0.045,
      0, -0.018, 0.02,
    ].map((v) => v * scale)
  );
  geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

// A school of small fish circling a moving anchor point. Used both for the
// juveniles sheltering in the jellyfish's tentacle canopy (documented
// behavior in several jellyfish species - small fish gain cover from the
// stinging fringe while staying just clear of it) and, with a wider radius
// and its own slow-drifting anchor, for an independent school roaming the
// open water nearby. Unlike the jellyfish, these fish are genuinely
// reactive: they scatter fast at a disturbance and drift back once it passes.
export function createFishSchool({
  count = 9,
  color = '#cfe9f5',
  scale = 1,
  radius = [0.35, 0.65],
  height = [-1.4, -0.5],
  angularSpeed = [0.4, 0.9],
} = {}) {
  const geometry = createFishGeometry(scale);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const fish = Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    angularSpeed: THREE.MathUtils.lerp(angularSpeed[0], angularSpeed[1], Math.random()),
    radius: THREE.MathUtils.lerp(radius[0], radius[1], Math.random()),
    height: THREE.MathUtils.lerp(height[0], height[1], Math.random()),
    bobPhase: Math.random() * Math.PI * 2,
    scatter: 0, // 0 = tucked in close, 1 = fully startled outward
    reactivity: 3 + Math.random() * 3, // how fast this individual responds
  }));

  const dummy = new THREE.Object3D();
  const lookTarget = new THREE.Vector3();

  // anchor: world position the school circles (jellyfish, or its own drift).
  // startle: 0..1 disturbance signal - rises sharply, decays back to 0.
  function update(elapsed, delta, anchor, startle) {
    fish.forEach((f, i) => {
      f.scatter = THREE.MathUtils.damp(f.scatter, startle, f.reactivity, delta);
      f.angle += f.angularSpeed * delta * (1 + f.scatter * 1.5);

      const r = f.radius + f.scatter * 0.6;
      const x = anchor.x + Math.cos(f.angle) * r;
      const z = anchor.z + Math.sin(f.angle) * r;
      const y = anchor.y + f.height + Math.sin(elapsed * 1.5 + f.bobPhase) * 0.04;

      dummy.position.set(x, y, z);
      const ahead = f.angle + Math.PI / 2; // tangent to the orbit = direction of travel
      lookTarget.set(x + Math.cos(ahead) * 0.1, y, z + Math.sin(ahead) * 0.1);
      dummy.lookAt(lookTarget);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}

// A kelp bed: tapering ribbon fronds rooted in the seafloor and swaying
// with the current - the same tapered-ribbon-plus-sine-sway technique used
// for the jellyfish's tentacles, just growing up instead of hanging down.
export function createKelp(count = 12, spread = 11, floorY = -10) {
  const positions = [];
  const segT = [];
  const side = [];
  const phase = [];
  const indices = [];

  for (let k = 0; k < count; k++) {
    const angle = Math.random() * Math.PI * 2;
    const r = spread * (0.4 + Math.random() * 0.6);
    const originX = Math.cos(angle) * r;
    const originZ = Math.sin(angle) * r;
    const originY = floorY + Math.random() * 0.4; // rooted right at the sand, not floating above it
    const height = 3.5 + Math.random() * 3.5;
    const frondPhase = Math.random() * Math.PI * 2;
    const segments = 10;
    const base = positions.length / 3;

    for (let s = 0; s <= segments; s++) {
      const tt = s / segments;
      const y = originY + tt * height;
      const taper = 0.09 * (1 - tt * 0.8);

      for (const sgn of [-1, 1]) {
        positions.push(originX, y, originZ);
        segT.push(tt);
        side.push(sgn * taper);
        phase.push(frondPhase);
      }

      if (s < segments) {
        const a = base + s * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(segT), 1));
  geometry.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(side), 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(phase), 1));
  geometry.setIndex(indices);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColorBase: { value: new THREE.Color('#0f3d2e') },
      uColorTip: { value: new THREE.Color('#3f8f5f') },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute float aSide;
      attribute float aPhase;
      uniform float uTime;
      varying float vT;

      void main() {
        vT = aT;
        vec3 pos = position;

        // sway grows toward the tip, like a frond rooted in the seabed
        // bending with the current rather than swimming under its own power
        float sway = sin(uTime * 0.5 + aPhase + aT * 2.0) * aT * aT * 0.6;
        pos.x += sway + aSide;
        pos.z += cos(uTime * 0.4 + aPhase * 1.4 + aT * 1.5) * aT * aT * 0.5;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorBase;
      uniform vec3 uColorTip;
      varying float vT;
      void main() {
        vec3 color = mix(uColorBase, uColorTip, vT);
        gl_FragColor = vec4(color, 0.75);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);

  function update(elapsed) {
    material.uniforms.uTime.value = elapsed;
  }

  return { mesh, update };
}

// A single ray gliding on a slow, wide loop through the scene - a larger,
// unhurried presence that crosses paths with the jellyfish now and then
// rather than orbiting it. Its wings are a span-subdivided flat mesh so a
// simple sine displacement can read as a proper flapping swim cycle, and a
// thin tapering tail trails behind using the same ribbon technique as the
// kelp and tentacles.
export function createRay({ wingspan = 1.6, bodyLength = 0.9, color = '#3a5a72' } = {}) {
  const group = new THREE.Group();

  // --- wings: a span-subdivided flat mesh, tapered into a diamond and
  // displaced by a sine wave (stronger toward the tips) for the flap.
  const spanSegments = 12;
  const positions = [];
  const spanCoord = [];
  const indices = [];

  for (let i = 0; i <= spanSegments; i++) {
    const t = (i / spanSegments) * 2 - 1; // -1 (left tip) .. 1 (right tip)
    const x = t * (wingspan / 2);
    const taper = 1 - Math.abs(t) * 0.82;
    const front = -bodyLength * 0.5 * taper;
    const back = bodyLength * 0.55 * taper;

    positions.push(x, 0, front);
    spanCoord.push(t);
    positions.push(x, 0, back);
    spanCoord.push(t);

    if (i < spanSegments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  wingGeometry.setAttribute('aSpan', new THREE.BufferAttribute(new Float32Array(spanCoord), 1));
  wingGeometry.setIndex(indices);

  const wingMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      attribute float aSpan;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        vec3 pos = position;
        // wingtips flap while the spine holds steady, like a real ray's swim stroke
        float flap = sin(uTime * 2.2 + abs(aSpan) * 1.5) * pow(abs(aSpan), 1.4) * 0.3;
        pos.y += flap;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vNormal = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        // the same fresnel rim used on the jellyfish bell, toned down, so
        // every creature in the scene shares one underwater "material language"
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), vViewDir), 0.0), 3.0);
        vec3 color = mix(uColor, vec3(0.75, 0.85, 0.9), fresnel * 0.5);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  group.add(wings);

  // --- tail: one thin tapering ribbon trailing behind the body.
  const tailSegments = 10;
  const tailLength = bodyLength * 1.4;
  const tailPositions = [];
  const tailT = [];
  const tailSide = [];
  const tailIndices = [];

  for (let s = 0; s <= tailSegments; s++) {
    const tt = s / tailSegments;
    const z = bodyLength * 0.5 + tt * tailLength;
    const taper = 0.025 * (1 - tt * 0.9);
    for (const sgn of [-1, 1]) {
      tailPositions.push(sgn * taper, 0, z);
      tailT.push(tt);
      tailSide.push(sgn);
    }
    if (s < tailSegments) {
      const a = s * 2;
      tailIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const tailGeometry = new THREE.BufferGeometry();
  tailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tailPositions), 3));
  tailGeometry.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(tailT), 1));
  tailGeometry.setIndex(tailIndices);

  const tailMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      attribute float aT;
      uniform float uTime;
      varying float vT;
      void main() {
        vT = aT;
        vec3 pos = position;
        pos.x += sin(uTime * 2.2 + aT * 5.0) * aT * aT * 0.12;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vT;
      void main() {
        gl_FragColor = vec4(uColor, (1.0 - vT) * 0.6);
      }
    `,
  });

  const tail = new THREE.Mesh(tailGeometry, tailMaterial);
  group.add(tail);

  // --- a slow, wide patrol loop around the scene, independent of the jellyfish.
  const orbitRadius = 9 + Math.random() * 4;
  const orbitHeight = -1.5 + Math.random() * 2.5;
  const orbitSpeed = 0.05 + Math.random() * 0.02;
  let angle = Math.random() * Math.PI * 2;
  const lookTarget = new THREE.Vector3();

  function update(elapsed, delta) {
    wingMaterial.uniforms.uTime.value = elapsed;
    tailMaterial.uniforms.uTime.value = elapsed;

    angle += orbitSpeed * delta;
    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius;
    const y = orbitHeight + Math.sin(elapsed * 0.2 + orbitRadius) * 0.6;

    group.position.set(x, y, z);
    const ahead = angle + Math.PI / 2;
    lookTarget.set(x + Math.cos(ahead), y, z + Math.sin(ahead));
    group.lookAt(lookTarget);
    // lookAt recomputes orientation fresh every frame, so rotating on top of
    // it here adds a bounded bank into the turn rather than accumulating.
    group.rotateZ(Math.sin(elapsed * 0.3) * 0.15);
  }

  return { group, update };
}

// Small drifting zooplankton standing in for copepods and similar
// mesozooplankton. When one wanders inside the jellyfish's tentacle canopy
// it's treated as captured - there's no visible strike, just a fade and a
// small absence, which is genuinely how cnidocyte prey capture looks to an
// observer rather than a dramatized "attack."
export function createZooplankton(count = 45, bounds = 6) {
  const positions = new Float32Array(count * 3);
  const fades = new Float32Array(count).fill(1);
  const drift = [];

  function respawn(i, awayFrom) {
    let x = 0;
    let y = 0;
    let z = 0;
    let clear = false;
    while (!clear) {
      x = (Math.random() - 0.5) * bounds * 2;
      y = (Math.random() - 0.5) * 4 - 0.5;
      z = (Math.random() - 0.5) * bounds * 2;
      clear = !awayFrom || Math.hypot(x - awayFrom.x, z - awayFrom.z) > 1.5;
    }
    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    fades[i] = 1;
  }

  for (let i = 0; i < count; i++) {
    respawn(i);
    drift.push({ phase: Math.random() * Math.PI * 2, speed: 0.05 + Math.random() * 0.08, captured: false });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color('#d7ffd0') } },
    vertexShader: /* glsl */ `
      attribute float aFade;
      varying float vFade;
      void main() {
        vFade = aFade;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 10.0 * aFade / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(uColor, (1.0 - d * 2.0) * vFade * 0.9);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);

  // canopyCenter: world position under the bell; canopyRadius/YRange define
  // the tentacle field's rough capture volume.
  function update(elapsed, delta, canopyCenter, canopyRadius, canopyYRange) {
    for (let i = 0; i < count; i++) {
      const d = drift[i];
      const ix = i * 3;

      if (d.captured) {
        fades[i] -= delta * 1.5;
        if (fades[i] <= 0) {
          respawn(i, canopyCenter);
          d.captured = false;
        }
        continue;
      }

      // slow, slightly erratic tumbling - distinct from marine snow's
      // steady fall, closer to how small swimming zooplankton actually move
      positions[ix + 0] += Math.sin(elapsed * d.speed + d.phase) * 0.002;
      positions[ix + 1] += Math.cos(elapsed * d.speed * 0.7 + d.phase) * 0.0015;
      positions[ix + 2] += Math.cos(elapsed * d.speed + d.phase * 1.3) * 0.002;

      const dx = positions[ix + 0] - canopyCenter.x;
      const dz = positions[ix + 2] - canopyCenter.z;
      const withinRadius = dx * dx + dz * dz < canopyRadius * canopyRadius;
      const withinHeight = positions[ix + 1] > canopyYRange[0] && positions[ix + 1] < canopyYRange[1];

      if (withinRadius && withinHeight) {
        d.captured = true;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aFade.needsUpdate = true;
  }

  return { points, update };
}

// A sandy seafloor: a flat plane with a few overlapping sine ripples baked
// into it once (cheap stand-in for real terrain noise - the floor is
// static, so there's no reason to recompute it every frame like the
// animated elements above). Shaded with a simple hand-rolled directional
// light plus a hash-based speckle for sand grain, since nothing else in
// this scene reads from a texture either.
export function createSeafloor({ radius = 45, y = -10, segments = 64 } = {}) {
  const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments);
  const pos = geometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const py = pos.getY(i);
    const dist = Math.hypot(x, py);
    const dune =
      Math.sin(x * 0.15 + py * 0.08) * 0.35 +
      Math.sin(x * 0.35 - py * 0.22) * 0.15 +
      Math.sin(dist * 0.5) * 0.08;
    const settle = 1 - THREE.MathUtils.clamp(dist / radius, 0, 1); // flatten toward the edges
    pos.setZ(i, dune * settle);
  }
  geometry.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColorLow: { value: new THREE.Color('#241f16') },
      uColorHigh: { value: new THREE.Color('#7a6c4c') },
      uLightDir: { value: new THREE.Vector3(0.4, 1, 0.3).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorLow;
      uniform vec3 uColorHigh;
      uniform vec3 uLightDir;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      // Cheap value noise for sand mottling - no texture needed. A raw
      // per-cell hash shows as a hard tile grid at the grazing angles you
      // get looking across a ground plane, no matter how fine the cells
      // are, so this interpolates smoothly between hash corners instead.
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        float light = clamp(dot(normalize(vNormal), uLightDir), 0.0, 1.0);
        vec3 base = mix(uColorLow, uColorHigh, light);

        // fine grain plus a broader, low-contrast blotch layer, both smooth
        float grain = noise(vWorldPos.xz * 20.0) * 0.06;
        float blotch = noise(vWorldPos.xz * 2.0) * 0.1 - 0.05;
        base += grain + blotch;

        // fade to black toward the edge of the (finite) floor so it blends
        // into the fog instead of showing a hard boundary
        float edge = 1.0 - smoothstep(30.0, 45.0, length(vWorldPos.xz));
        gl_FragColor = vec4(base * edge, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

// A scatter of rocks resting on the seafloor - low-poly icosahedra with
// their vertices knocked around by a cheap sine "noise" so each one reads
// as irregular rather than a faceted sphere. Static, so unlike everything
// else in this module there's no update() to call each frame.
export function createRocks(count = 14, { spread = 20, floorY = -10 } = {}) {
  const group = new THREE.Group();

  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#2e3a42') } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float light = clamp(dot(normalize(vNormal), normalize(vec3(0.4, 1.0, 0.3))), 0.15, 1.0);
        // the same fresnel rim used on the jellyfish bell and the ray,
        // toned down, so wet rock shares the scene's underwater "material language"
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), vViewDir), 0.0), 3.0);
        vec3 color = uColor * light + vec3(0.5, 0.65, 0.75) * fresnel * 0.25;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  for (let i = 0; i < count; i++) {
    const geometry = new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.5, 1);
    const pos = geometry.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      const y = pos.getY(v);
      const z = pos.getZ(v);
      const bump = (Math.sin(x * 5.2) + Math.sin(y * 4.7) + Math.sin(z * 6.1)) * 0.08;
      pos.setXYZ(v, x * (1 + bump), y * (1 + bump) * 0.75, z * (1 + bump)); // squashed a little flatter than a boulder
    }
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    const angle = Math.random() * Math.PI * 2;
    const r = spread * (0.2 + Math.random() * 0.8);
    mesh.position.set(Math.cos(angle) * r, floorY + 0.15, Math.sin(angle) * r);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.scale.setScalar(0.6 + Math.random() * 0.8);
    group.add(mesh);
  }

  return group;
}
