function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutQuint(t) {
  if (t < 0.5) {
    return 16 * t * t * t * t * t;
  }
  const p = -2 * t + 2;
  return 1 - (p * p * p * p * p) / 2;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function createTexture(gl) {
  const texture = gl.createTexture();
  if (!texture) {
    return null;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

export class WebGLTransitionEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.intensity = options.intensity ?? 0.9;
    this.gl = null;
    this.program = null;
    this.locations = null;
    this.buffers = null;
    this.textures = null;
    this.rafId = 0;
    this.fadeTimer = 0;
    this.currentProgress = 0;
    this.currentDirection = 1;
    this.ready = false;
    this.resizeObserver = null;
  }

  init() {
    if (!this.canvas) {
      return false;
    }
    const gl =
      this.canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true }) ||
      this.canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) {
      return false;
    }

    const vertexSource = `
      attribute vec2 a_position;
      attribute vec2 a_uv;
      varying vec2 v_uv;

      void main() {
        v_uv = a_uv;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;
      varying vec2 v_uv;

      uniform sampler2D u_from;
      uniform sampler2D u_to;
      uniform float u_progress;
      uniform float u_direction;
      uniform float u_intensity;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float n00 = hash21(i + vec2(0.0, 0.0));
        float n10 = hash21(i + vec2(1.0, 0.0));
        float n01 = hash21(i + vec2(0.0, 1.0));
        float n11 = hash21(i + vec2(1.0, 1.0));
        return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
      }

      void main() {
        float progress = clamp(u_progress, 0.0, 1.0);
        float p = progress * progress * (3.0 - 2.0 * progress);
        float n = noise(v_uv * vec2(8.0, 5.0) + vec2(0.0, p * 2.2));
        float displacement = (n - 0.5) * 0.035 * u_intensity;
        vec2 dir = vec2(u_direction, 0.0);

        vec2 fromUv = v_uv + dir * (0.085 * p) + dir * displacement * (1.0 - p);
        vec2 toUv = v_uv - dir * (0.085 * (1.0 - p)) - dir * displacement * p;

        vec4 fromColor = texture2D(u_from, fromUv);
        vec4 toColor = texture2D(u_to, toUv);
        vec3 mixed = mix(fromColor.rgb, toColor.rgb, p);

        float bloomBand = smoothstep(0.16, 0.52, p) * (1.0 - smoothstep(0.68, 0.98, p));
        vec3 bloom = mix(fromColor.rgb, toColor.rgb, 0.5) * 0.12 * bloomBand;

        float vignette = smoothstep(0.94, 0.22, distance(v_uv, vec2(0.5)));
        vec3 finalColor = mix(mixed * 0.92, mixed + bloom, vignette);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const program = createProgram(gl, vertexSource, fragmentSource);
    if (!program) {
      return false;
    }

    const positionBuffer = gl.createBuffer();
    const uvBuffer = gl.createBuffer();
    if (!positionBuffer || !uvBuffer) {
      return false;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);

    const fromTexture = createTexture(gl);
    const toTexture = createTexture(gl);
    if (!fromTexture || !toTexture) {
      return false;
    }

    this.gl = gl;
    this.program = program;
    this.buffers = { positionBuffer, uvBuffer };
    this.textures = { fromTexture, toTexture };
    this.locations = {
      position: gl.getAttribLocation(program, "a_position"),
      uv: gl.getAttribLocation(program, "a_uv"),
      from: gl.getUniformLocation(program, "u_from"),
      to: gl.getUniformLocation(program, "u_to"),
      progress: gl.getUniformLocation(program, "u_progress"),
      direction: gl.getUniformLocation(program, "u_direction"),
      intensity: gl.getUniformLocation(program, "u_intensity"),
    };

    this.ready = true;
    this.resize();
    this.hideCanvas(true);

    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas);
    } else {
      window.addEventListener("resize", () => this.resize());
    }
    return true;
  }

  isReady() {
    return this.ready;
  }

  resize() {
    if (!this.ready || !this.canvas || !this.gl) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width * Math.min(window.devicePixelRatio || 1, 2)));
    const height = Math.max(1, Math.floor(rect.height * Math.min(window.devicePixelRatio || 1, 2)));
    if (this.canvas.width === width && this.canvas.height === height) {
      return;
    }
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  showCanvas() {
    if (!this.canvas) {
      return;
    }
    this.canvas.style.opacity = "1";
  }

  hideCanvas(immediate = false) {
    if (!this.canvas) {
      return;
    }
    if (immediate) {
      this.canvas.style.opacity = "0";
      return;
    }
    this.canvas.style.opacity = "0";
  }

  cancel() {
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.fadeTimer) {
      window.clearTimeout(this.fadeTimer);
      this.fadeTimer = 0;
    }
  }

  uploadTextures(fromImage, toImage) {
    if (!this.ready || !this.gl || !this.textures) {
      return false;
    }
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.fromTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fromImage);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.toTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, toImage);

    return true;
  }

  render(progress, direction) {
    if (!this.ready || !this.gl || !this.program || !this.locations || !this.buffers) {
      return;
    }
    this.resize();
    this.currentProgress = clamp(progress, 0, 1);
    this.currentDirection = direction === 0 ? 1 : Math.sign(direction);

    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positionBuffer);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uvBuffer);
    gl.enableVertexAttribArray(this.locations.uv);
    gl.vertexAttribPointer(this.locations.uv, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1i(this.locations.from, 0);
    gl.uniform1i(this.locations.to, 1);
    gl.uniform1f(this.locations.progress, this.currentProgress);
    gl.uniform1f(this.locations.direction, this.currentDirection);
    gl.uniform1f(this.locations.intensity, this.intensity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  playTransition({
    fromImage,
    toImage,
    direction = 1,
    duration = 780,
    commitAt = 0.52,
    onCommit,
    onComplete,
  }) {
    if (!this.ready || !fromImage || !toImage) {
      return Promise.resolve(false);
    }

    this.cancel();
    this.uploadTextures(fromImage, toImage);
    this.showCanvas();

    let committed = false;
    const startAt = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
        const t = clamp((now - startAt) / duration, 0, 1);
        const eased = easeInOutQuint(t);
        this.render(eased, direction);

        if (!committed && eased >= commitAt) {
          committed = true;
          onCommit?.();
        }

        if (t < 1) {
          this.rafId = window.requestAnimationFrame(tick);
          return;
        }

        if (!committed) {
          committed = true;
          onCommit?.();
        }
        this.hideCanvas();
        onComplete?.();
        resolve(true);
      };
      this.rafId = window.requestAnimationFrame(tick);
    });
  }

  beginInteractiveTransition({ fromImage, toImage, direction = 1 }) {
    if (!this.ready || !fromImage || !toImage) {
      return false;
    }
    this.cancel();
    this.uploadTextures(fromImage, toImage);
    this.currentDirection = direction === 0 ? 1 : Math.sign(direction);
    this.currentProgress = 0;
    this.showCanvas();
    this.render(0, this.currentDirection);
    return true;
  }

  updateInteractiveProgress(progress) {
    if (!this.ready) {
      return;
    }
    this.currentProgress = clamp(progress, 0, 1);
    this.render(this.currentProgress, this.currentDirection);
  }

  finishInteractiveTransition({ commit, onCommit, onComplete }) {
    if (!this.ready) {
      return Promise.resolve(false);
    }

    this.cancel();
    let committed = false;
    let value = this.currentProgress;
    let velocity = 0;
    const target = commit ? 1 : 0;
    const stiffness = commit ? 0.24 : 0.2;
    const damping = commit ? 0.78 : 0.74;

    return new Promise((resolve) => {
      const tick = () => {
        velocity += (target - value) * stiffness;
        velocity *= damping;
        value += velocity;
        value = clamp(value, 0, 1);
        this.currentProgress = value;
        this.render(value, this.currentDirection);

        if (commit && !committed && value >= 0.5) {
          committed = true;
          onCommit?.();
        }

        const settled = Math.abs(target - value) < 0.002 && Math.abs(velocity) < 0.002;
        if (!settled) {
          this.rafId = window.requestAnimationFrame(tick);
          return;
        }

        if (commit && !committed) {
          committed = true;
          onCommit?.();
        }
        this.render(target, this.currentDirection);
        this.hideCanvas();
        onComplete?.(commit);
        resolve(commit);
      };

      this.rafId = window.requestAnimationFrame(tick);
    });
  }
}
