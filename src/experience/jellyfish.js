import * as THREE from 'three';

// A bioluminescent jellyfish built from procedural geometry and two small
// custom shaders. Everything animates off two uniforms (uTime, uPulse) so
// the whole creature moves from GPU-side math instead of per-frame CPU
// vertex loops - the same "drive geometry from uniforms" pattern used by
// the official Three.js shader examples (see https://threejs.org/docs/#api/en/materials/ShaderMaterial).

// Bell profile revolved around the Y axis with THREE.LatheGeometry - the
// established Three.js technique for dome/mushroom-shaped solids of revolution.
const BELL_PROFILE = [
  [0.85, 0.0],
  [0.92, 0.16],
  [0.88, 0.36],
  [0.74, 0.56],
  [0.54, 0.73],
  [0.3, 0.86],
  [0.1, 0.95],
  [0.0, 0.98],
].map(([x, y]) => new THREE.Vector2(x, y));

function createBell({ colorA, colorB, gonadColor }) {
  const geometry = new THREE.LatheGeometry(BELL_PROFILE, 48);
  geometry.computeVertexNormals();

  // Custom attribute: 1 at the rim, 0 at the crown. The vertex shader uses
  // it so contraction is strongest at the rim, like a real bell muscle.
  const pos = geometry.attributes.position;
  const rim = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    rim[i] = 1.0 - THREE.MathUtils.clamp(pos.getY(i) / 0.98, 0, 1);
  }
  geometry.setAttribute('aRim', new THREE.BufferAttribute(rim, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) }, // rim glow
      uColorB: { value: new THREE.Color(colorB) }, // core tint
      uGonadColor: { value: new THREE.Color(gonadColor) }, // pale, warm - reads against the blue bell
    },
    vertexShader: /* glsl */ `
      attribute float aRim;
      uniform float uTime;
      uniform float uPulse;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vRim;
      varying float vAngle;

      void main() {
        vRim = aRim;
        vAngle = atan(position.z, position.x);
        vec3 pos = position;

        // Contraction pulls the rim inward and slightly up; a small ripple
        // travelling around the rim keeps the silhouette from looking rigid.
        float contraction = uPulse * aRim * 0.22;
        float ripple = sin(aRim * 6.0 - uTime * 2.0) * 0.01 * aRim;
        pos.xz *= (1.0 - contraction + ripple);
        pos.y += uPulse * aRim * 0.08;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uGonadColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vRim;
      varying float vAngle;

      void main() {
        // Fresnel term for glassy, translucent rim glow - standard technique
        // for underwater/bioluminescent materials.
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), vViewDir), 0.0), 2.2);
        vec3 color = mix(uColorB, uColorA, fresnel + vRim * 0.3);

        // Four faint horseshoe-shaped gonads, evenly spaced around the bell -
        // a real, visible field mark on moon jellies (Aurelia aurita), seen
        // through the translucent tissue rather than painted on top of it.
        float lobes = pow(abs(cos(vAngle * 2.0)), 10.0);
        float midBellBand = smoothstep(0.12, 0.35, vRim) - smoothstep(0.5, 0.72, vRim);
        float gonad = lobes * midBellBand;
        color = mix(color, uGonadColor, gonad * 0.55);

        float alpha = clamp(fresnel * 0.9 + vRim * 0.15 + 0.06 + gonad * 0.1, 0.0, 0.85);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  return new THREE.Mesh(geometry, material);
}

// A thin expanding ring of turbulence, shed from beneath the bell at the
// peak of each contraction - real jellyfish propel themselves by pushing a
// vortex ring of water backward with every pulse, then coast on its
// momentum rather than swimming continuously.
function createVortexRing() {
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
        float ring = smoothstep(0.5, 0.4, d) - smoothstep(0.4, 0.25, d);
        gl_FragColor = vec4(0.75, 0.95, 1.0, ring * (1.0 - uProgress) * 0.45);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.05; // just beneath the bell rim, above the tentacle bases
  mesh.visible = false;
  return mesh;
}

// Builds a ring of tapering ribbon tentacles as a single BufferGeometry (one
// draw call for all of them). Sway and taper are baked into per-vertex
// attributes and resolved in the vertex shader.
function createTentacles({ count, segments, length, radiusAtRim, thickness, color }) {
  const positions = [];
  const segT = [];
  const side = [];
  const phase = [];
  const indices = [];

  for (let t = 0; t < count; t++) {
    const angle = (t / count) * Math.PI * 2;
    const originX = Math.cos(angle) * radiusAtRim;
    const originZ = Math.sin(angle) * radiusAtRim;
    const tentaclePhase = Math.random() * Math.PI * 2;
    const base = positions.length / 3;

    for (let s = 0; s <= segments; s++) {
      const tt = s / segments;
      const y = -tt * length;
      const taper = thickness * (1 - tt * 0.85);

      for (const sgn of [-1, 1]) {
        positions.push(originX, y, originZ);
        segT.push(tt);
        side.push(sgn * taper);
        phase.push(tentaclePhase + angle);
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
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      attribute float aSide;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPulse;
      varying float vT;

      void main() {
        vT = aT;
        vec3 pos = position;

        // Sway amplitude grows toward the tip and gets a kick from the bell
        // pulse, mimicking the whip-lag of a real tentacle trailing the bell.
        float sway = sin(uTime * 1.6 + aPhase + aT * 4.0) * aT * aT * 0.35;
        sway += uPulse * aT * 0.25;
        pos.x += sway + aSide;
        pos.z += cos(uTime * 1.3 + aPhase + aT * 3.0) * aT * aT * 0.3;
        pos.y -= uPulse * aT * 0.05;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vT;
      void main() {
        float alpha = (1.0 - vT) * 0.5 + 0.05;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  return new THREE.Mesh(geometry, material);
}

// Color options let a second or third individual read as its own animal
// rather than a clone - useful for a loose "bloom" of jellyfish drifting
// together, which real jellyfish populations do form under the right
// conditions (see the increased jellyfish-bloom awareness this project's
// companion piece touches on).
export function createJellyfish({
  bellColorA = '#6fe3ff',
  bellColorB = '#8a5fe0',
  gonadColor = '#ffd7c2',
  tentacleColor = '#6fe3ff',
  oralColor = '#d68cff',
} = {}) {
  const group = new THREE.Group();

  const bell = createBell({ colorA: bellColorA, colorB: bellColorB, gonadColor });
  const tentacles = createTentacles({
    count: 14,
    segments: 18,
    length: 1.7,
    radiusAtRim: 0.82,
    thickness: 0.018,
    color: tentacleColor,
  });
  const oralArms = createTentacles({
    count: 5,
    segments: 14,
    length: 1.05,
    radiusAtRim: 0.12,
    thickness: 0.045,
    color: oralColor,
  });

  group.add(bell, tentacles, oralArms);

  const meshes = [bell, tentacles, oralArms];

  // Small reusable pool of vortex rings - three is enough to cover a
  // startle-triggered extra pulse overlapping the natural cycle.
  const vortexRings = [0, 1, 2].map(() => ({ mesh: createVortexRing(), t: 1 }));
  for (const ring of vortexRings) group.add(ring.mesh);

  function spawnVortexRing() {
    const ring = vortexRings.find((r) => r.t >= 1);
    if (!ring) return;
    ring.t = 0;
    ring.mesh.visible = true;
    ring.mesh.scale.setScalar(0.55);
  }

  let ringArmed = true;

  function update(elapsed, delta, pulseKick) {
    // Real jellyfish don't undulate continuously - they snap the bell shut
    // in a quick power stroke, then glide on the thrust before the next
    // contraction. max(0, sin) flattens half the cycle to a full rest, and
    // the high exponent sharpens the remaining half into a brief pulse. A
    // slow secondary sine keeps the cadence from feeling metronomic.
    const speed = 1.1 + 0.12 * Math.sin(elapsed * 0.15);
    const basePulse = Math.pow(Math.max(0, Math.sin(elapsed * speed)), 6.0);
    const pulse = THREE.MathUtils.clamp(basePulse + pulseKick, 0, 1.4);

    // Fire a vortex ring once per contraction peak (armed/disarmed by the
    // rest phase so a single pulse can't trigger it twice).
    if (ringArmed && pulse > 0.85) {
      spawnVortexRing();
      ringArmed = false;
    } else if (pulse < 0.15) {
      ringArmed = true;
    }

    for (const mesh of meshes) {
      mesh.material.uniforms.uTime.value = elapsed;
      mesh.material.uniforms.uPulse.value = pulse;
    }

    for (const ring of vortexRings) {
      if (ring.t >= 1) continue;
      ring.t = Math.min(ring.t + delta * 0.7, 1);
      ring.mesh.scale.setScalar(0.55 + ring.t * 1.7);
      ring.mesh.material.uniforms.uProgress.value = ring.t;
      if (ring.t >= 1) ring.mesh.visible = false;
    }
  }

  return { group, update };
}
