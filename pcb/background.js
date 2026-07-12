/**
 * BACKGROUND — Light Caustics
 *
 * Renders soft, slowly evolving light-refraction patterns (caustics)
 * on a pristine white field. The effect is intentionally subdued:
 * luminous traces in near-white and pale blue that shift gently,
 * creating depth and atmosphere without demanding attention.
 *
 * Mouse movement subtly influences the caustic origin, giving the
 * page a living, responsive quality.
 */

(function () {
  'use strict';

  /* ---- WebGL bootstrap ---- */
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return;

  /* ---- Shaders ---- */
  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  // The caustics are built by layering several rotated copies of a
  // simple 2-D "voronoi-edge" function. Where the layers' bright
  // ridges overlap, light concentrates — exactly like real caustics.
  // We keep the palette extremely restrained: the base is pure white,
  // and only the lightest hints of blue appear in the bright folds.
  const FRAG = `
    precision highp float;

    uniform float u_time;
    uniform vec2  u_resolution;
    uniform vec2  u_mouse;     // normalised [0,1]
    uniform float u_entrance;  // 0→1 fade-in

    /* --- Smooth Voronoi distance (IQ style) --- */
    // Returns an approximate distance to the nearest cell edge.
    // We use this as the building-block for caustic layers.

    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)),
               dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float voronoiEdge(vec2 uv, float t, vec2 mouseUV, float pullRadius) {
      vec2 i = floor(uv);
      vec2 f = fract(uv);

      float minDist  = 8.0;
      float minDist2 = 8.0;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 point    = hash(i + neighbor);
          point = 0.5 + 0.5 * sin(t * 0.4 + 6.2831 * point);
          
          // Cell center in this layer's world coordinates
          vec2 cellWorld = i + neighbor + point;
          
          // Shift the cell center toward the mouse
          vec2 diff = mouseUV - cellWorld;
          float dist = length(diff);
          float pullStrength = 0.75;
          float pull = pullStrength * exp(-(dist * dist) / (2.0 * pullRadius * pullRadius));
          vec2 shiftedCellWorld = cellWorld + diff * pull;
          
          // Distance from the unwarped pixel coordinate to the shifted cell center
          float d = length(shiftedCellWorld - uv);
          
          if (d < minDist) {
            minDist2 = minDist;
            minDist  = d;
          } else if (d < minDist2) {
            minDist2 = d;
          }
        }
      }

      // Edge distance: thin bright lines where two cells meet
      return minDist2 - minDist;
    }

    /* --- Rotation matrix --- */
    mat2 rot(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float aspect = u_resolution.x / u_resolution.y;
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

      // Mouse in same coordinate space
      vec2 mouseWorld = (u_mouse - 0.5) * vec2(aspect, 1.0);

      float t = u_time;
      float sigma = 0.122; // Radius of influence in screen-space

      // Layer multiple caustic patterns at different scales & rotations
      float caustic = 0.0;

      // Layer 1 — large, slow
      float scale1 = 2.8;
      vec2 p1 = p * scale1 + vec2(t * 0.015, t * 0.01);
      p1 *= rot(0.42);
      vec2 m1 = mouseWorld * scale1 + vec2(t * 0.015, t * 0.01);
      m1 *= rot(0.42);
      float c1 = voronoiEdge(p1, t * 0.5, m1, sigma * scale1);
      caustic += smoothstep(0.06, 0.0, c1) * 0.45;

      // Layer 2 — medium, medium speed
      float scale2 = 4.2;
      vec2 p2 = p * scale2 + vec2(-t * 0.02, t * 0.018);
      p2 *= rot(1.15);
      vec2 m2 = mouseWorld * scale2 + vec2(-t * 0.02, t * 0.018);
      m2 *= rot(1.15);
      float c2 = voronoiEdge(p2, t * 0.65, m2, sigma * scale2);
      caustic += smoothstep(0.05, 0.0, c2) * 0.35;

      // Layer 3 — fine detail, slightly faster
      float scale3 = 6.5;
      vec2 p3 = p * scale3 + vec2(t * 0.012, -t * 0.022);
      p3 *= rot(2.1);
      vec2 m3 = mouseWorld * scale3 + vec2(t * 0.012, -t * 0.022);
      m3 *= rot(2.1);
      float c3 = voronoiEdge(p3, t * 0.8, m3, sigma * scale3);
      caustic += smoothstep(0.045, 0.0, c3) * 0.25;

      // Soft vignette — push caustics toward center
      float vig = 1.0 - length((uv - 0.5) * 1.6);
      vig = smoothstep(0.0, 0.7, vig);
      caustic *= vig;

      // Map to colour: white base with saturated blue in bright peaks
      vec3 base   = vec3(1.0);                         // pure white
      vec3 tint   = vec3(0.86, 0.91, 1.0);             // clear pastel ice-blue
      vec3 accent = vec3(0.28, 0.52, 1.0);             // saturated vibrant blue for peak refraction

      float intensity = caustic * 0.65;
      vec3 col = mix(base, tint, intensity * 1.3);
      col = mix(col, accent, pow(intensity, 1.8) * 0.85);

      // Very subtle radial warmth at edges to prevent flatness
      float edgeWarm = length((uv - 0.5) * vec2(aspect, 1.0));
      col = mix(col, vec3(0.98, 0.975, 0.97), edgeWarm * 0.08);

      // Entrance fade
      col = mix(vec3(1.0), col, u_entrance);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ---- Compile & link ---- */
  function createShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = createShader(VERT, gl.VERTEX_SHADER);
  const fs = createShader(FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  /* ---- Full-screen quad ---- */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
  ]), gl.STATIC_DRAW);

  const a_pos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(a_pos);
  gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);

  /* ---- Uniforms ---- */
  const u_time = gl.getUniformLocation(prog, 'u_time');
  const u_resolution = gl.getUniformLocation(prog, 'u_resolution');
  const u_mouse = gl.getUniformLocation(prog, 'u_mouse');
  const u_entrance = gl.getUniformLocation(prog, 'u_entrance');

  /* ---- State ---- */
  let mouse = { x: 0.5, y: 0.5 };
  let mouseSmooth = { x: 0.5, y: 0.5 };
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let startTime = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  /* ---- Mouse and Touch tracking ---- */
  function updateMouse(clientX, clientY) {
    mouse.x = clientX / window.innerWidth;
    mouse.y = 1.0 - clientY / window.innerHeight; // GL coords
  }

  document.addEventListener('mousemove', function (e) {
    updateMouse(e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches.length > 0) {
      updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 0) {
      updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  /* ---- Render loop ---- */
  function render(ts) {
    if (!startTime) startTime = ts;
    const elapsed = (ts - startTime) * 0.001; // seconds

    // Smooth mouse interpolation (faster response for visibility)
    mouseSmooth.x += (mouse.x - mouseSmooth.x) * 0.08;
    mouseSmooth.y += (mouse.y - mouseSmooth.y) * 0.08;

    // Entrance: fade in over 2 seconds
    const entrance = Math.min(1.0, elapsed / 2.0);
    const easedEntrance = 1.0 - Math.pow(1.0 - entrance, 3.0); // ease-out cubic

    gl.uniform1f(u_time, elapsed);
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform2f(u_mouse, mouseSmooth.x, mouseSmooth.y);
    gl.uniform1f(u_entrance, easedEntrance);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
