const ASCII_RAMP = " .`',:;-=+*#%@";
const PORTRAIT_ASCII_RAMP = "  ..`',:-=+*#";
const MAPLINE_ASCII_RAMP = "   ..`',:;-=+";
const GLITCH_CHARS = ":;+xX$#@%&*=-/";
const TERMINAL_BUILD_TAG = "TERMINAL_REWRITE_V3";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getImageDimensions(imageLike) {
  if (!imageLike) {
    return { width: 0, height: 0 };
  }
  return {
    width: Number(imageLike.naturalWidth || imageLike.width || 0),
    height: Number(imageLike.naturalHeight || imageLike.height || 0),
  };
}

export class TerminalAsciiExperience {
  constructor(options = {}) {
    this.dock = options.dock ?? null;
    this.bridge = options.bridge ?? null;
    this.bridgeParticles = options.bridgeParticles ?? null;
    this.bridgeCaption = options.bridgeCaption ?? null;
    this.bridgeStream = options.bridgeStream ?? null;
    this.stage = options.stage ?? null;
    this.panelWrap = options.panelWrap ?? null;
    this.asciiViewport = options.asciiViewport ?? null;
    this.asciiStack = options.asciiStack ?? null;
    this.asciiPrimary = options.asciiPrimary ?? null;
    this.asciiSecondary = options.asciiSecondary ?? null;
    this.promptLabel = options.promptLabel ?? null;
    this.metaLine = options.metaLine ?? null;

    this.prefersReducedMotion = Boolean(options.prefersReducedMotion);
    this.imageLoader = typeof options.imageLoader === "function" ? options.imageLoader : null;

    this.terminalData = null;
    this.currentCharacterId = "";
    this.scenes = new Map();
    this.sceneOrder = [];
    this.sceneCursor = 0;
    this.currentSceneId = "";
    this.baseAsciiText = "";
    this.layoutInfo = { columns: 0, rows: 0 };
    this.lastErrors = [];
    this.lastDensityMode = "BALANCED";

    this.isVisible = false;
    this.hasStarted = false;
    this.activeLayer = this.asciiPrimary;
    this.inactiveLayer = this.asciiSecondary;
    this.sceneBuildToken = 0;
    this.typeToken = 0;
    this.isTyping = false;

    this.sceneTimer = 0;
    this.glitchTimer = 0;
    this.glitchResetTimer = 0;
    this.pointerResetTimer = 0;
    this.resizeTimer = 0;
    this.bridgeScrollTicking = false;
    this.handleBridgeScroll = this.handleBridgeScroll.bind(this);
  }

  init() {
    if (!this.stage || !this.panelWrap || !this.asciiPrimary || !this.asciiSecondary || !this.asciiViewport) {
      return;
    }

    this.asciiViewport.addEventListener("pointermove", (event) => this.handlePointerMove(event));
    this.asciiViewport.addEventListener("pointerleave", () => this.handlePointerLeave());
    if (this.bridge && this.bridgeParticles) {
      window.addEventListener("scroll", this.handleBridgeScroll, { passive: true });
      window.addEventListener("resize", this.handleBridgeScroll, { passive: true });
      this.updateBridgeParticleVisibility();
    }

    this.renderBridgeWords(["FONTAINE", "HYDRO", "SALON SOLITAIRE"]);
    this.initVisibilityObserver();
    this.setMeta("Idle", "NO_SCENE");
  }

  handleBridgeScroll() {
    if (this.bridgeScrollTicking) {
      return;
    }
    this.bridgeScrollTicking = true;
    window.requestAnimationFrame(() => {
      this.bridgeScrollTicking = false;
      this.updateBridgeParticleVisibility();
    });
  }

  updateBridgeParticleVisibility() {
    if (!this.bridge || !this.bridgeParticles) {
      return;
    }
    const rect = this.bridge.getBoundingClientRect();
    const viewportH = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);

    // 아래로 진입할 때 서서히 등장, 위로 올리면 자연스럽게 사라지도록 alpha를 계산한다.
    const reveal = clamp((viewportH - rect.top) / (viewportH + rect.height * 0.25), 0, 1);
    const leaveTop = clamp((rect.bottom + viewportH * 0.08) / (viewportH * 0.72), 0, 1);
    const alpha = clamp(reveal * leaveTop, 0, 1) * 0.9;

    this.bridgeParticles.style.setProperty("--bridge-particle-opacity", alpha.toFixed(3));
  }

  getAssetPaths(character) {
    const assets = character?.terminal?.assets;
    if (!assets) {
      return [];
    }
    return [assets.portrait, assets.mapline].filter((path) => typeof path === "string" && path.length > 0);
  }

  async setCharacter(character) {
    if (!character) {
      return;
    }
    this.currentCharacterId = character.id;
    this.terminalData = this.buildTerminalData(character);
    this.hasStarted = false;
    this.stopRuntimeLoops();

    if (this.promptLabel) {
      this.promptLabel.textContent = this.terminalData.prompt;
    }
    if (this.bridgeCaption) {
      this.bridgeCaption.textContent = this.terminalData.bridgeCaption;
    }
    this.renderBridgeWords(this.terminalData.banners);

    await this.prepareScenes(this.terminalData);
    if (this.isVisible) {
      this.startRuntime();
    }
  }

  handleResize() {
    if (!this.terminalData) {
      return;
    }
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.prepareScenes(this.terminalData);
    }, 180);
  }

  buildTerminalData(character) {
    const source = character.terminal ?? {};
    return {
      prompt: source.prompt ?? `${character.id}@teyvat:~$`,
      bridgeCaption: source.bridgeCaption ?? `${character.displayName.toUpperCase()} ARCHIVE`,
      checksum: source.checksum ?? "UNSIGNED",
      assets: {
        portrait: source.assets?.portrait ?? "",
        mapline: source.assets?.mapline ?? "",
      },
      sceneLabels: {
        portrait: source.sceneLabels?.portrait ?? `${character.displayName.toUpperCase()}_PORTRAIT.ASC`,
        mapline: source.sceneLabels?.mapline ?? `${character.displayName.toUpperCase()}_MAPLINE.ASC`,
      },
      sceneOrder:
        Array.isArray(source.sequence) && source.sequence.length
          ? source.sequence.filter((id) => id === "portrait" || id === "mapline")
          : ["portrait", "mapline", "portrait", "mapline"],
      banners:
        Array.isArray(source.banners) && source.banners.length
          ? source.banners
          : [character.displayName.toUpperCase(), character.element.toUpperCase()],
    };
  }

  async prepareScenes(terminalData) {
    const token = ++this.sceneBuildToken;
    const layout = this.getAsciiLayout();
    this.layoutInfo = { columns: layout.columns, rows: layout.rows };
    this.lastErrors = [];

    const [portraitAscii, maplineAscii] = await Promise.all([
      this.buildAsciiFromImage(terminalData.assets.portrait, layout, "portrait"),
      this.buildAsciiFromImage(terminalData.assets.mapline, layout, "mapline"),
    ]);

    if (token !== this.sceneBuildToken) {
      return;
    }

    this.scenes.clear();
    if (portraitAscii) {
      this.scenes.set("portrait", {
        id: "portrait",
        label: terminalData.sceneLabels.portrait,
        text: portraitAscii,
      });
    }
    if (maplineAscii) {
      this.scenes.set("mapline", {
        id: "mapline",
        label: terminalData.sceneLabels.mapline,
        text: maplineAscii,
      });
    }

    if (!this.scenes.size) {
      const reason = this.lastErrors.length ? this.lastErrors.join(" | ") : "UNKNOWN";
      this.scenes.set("portrait", {
        id: "portrait",
        label: "ASCII_SOURCE_ERROR",
        text: this.buildFallbackAscii(layout, reason),
      });
    }

    const order = terminalData.sceneOrder.filter((id) => this.scenes.has(id));
    this.sceneOrder = order.length ? order : Array.from(this.scenes.keys());
    this.sceneCursor = 0;
    const scene = this.scenes.get(this.sceneOrder[0]);
    this.currentSceneId = scene?.id ?? "";
    this.baseAsciiText = scene?.text ?? "";

    if (!this.hasStarted) {
      this.asciiPrimary.textContent = "";
      this.asciiSecondary.textContent = "";
      this.asciiPrimary.classList.add("is-active");
      this.asciiSecondary.classList.remove("is-active");
      this.activeLayer = this.asciiPrimary;
      this.inactiveLayer = this.asciiSecondary;
    } else if (scene) {
      this.swapToScene(scene, true);
    }
  }

  async buildAsciiFromImage(src, layout, kind) {
    if (!src) {
      this.lastErrors.push(`${kind}:empty-path`);
      return "";
    }

    try {
      const image = await this.loadImage(src);
      const dims = getImageDimensions(image);
      if (dims.width < 2 || dims.height < 2) {
        this.lastErrors.push(`${kind}:invalid-size-${dims.width}x${dims.height}`);
        return "";
      }

      const source = document.createElement("canvas");
      source.width = dims.width;
      source.height = dims.height;
      const ctx = source.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        this.lastErrors.push(`${kind}:no-canvas-context`);
        return "";
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, source.width, source.height);

      return this.convertCanvasToAscii(source, layout, kind);
    } catch (error) {
      this.lastErrors.push(`${kind}:${error?.message ?? "load-failed"}`);
      return "";
    }
  }

  convertCanvasToAscii(canvas, layout, kind) {
    const srcW = canvas.width;
    const srcH = canvas.height;
    const dstCols = Math.max(1, layout.columns);
    const dstRows = Math.max(1, layout.rows);
    const charAspect = clamp(Number(layout.charAspect || 0.6), 0.45, 0.95);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return "";
    }

    const pixels = context.getImageData(0, 0, srcW, srcH).data;

    const sampleLuma = (sx, sy) => {
      const x = clamp(Math.floor(sx), 0, srcW - 1);
      const y = clamp(Math.floor(sy), 0, srcH - 1);
      const index = (y * srcW + x) * 4;
      return pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
    };

    const visualCols = dstCols * charAspect;
    const sourceAspect = srcW / Math.max(1, srcH);
    const gridAspect = visualCols / Math.max(1, dstRows);
    const aspectDelta = gridAspect / Math.max(0.001, sourceAspect);
    const isPortrait = kind === "portrait";
    const isMapline = kind === "mapline";
    const ramp = isPortrait ? PORTRAIT_ASCII_RAMP : isMapline ? MAPLINE_ASCII_RAMP : ASCII_RAMP;
    // "포토샵 캔버스 안에 원본 비율 유지" 방식: contain 배치.
    // 단, mapline은 가독성을 위해 장면별로 약간 확대 허용.
    const containScale = Math.min(visualCols / srcW, dstRows / srcH);
    const sceneZoom = kind === "mapline" ? 1.1 : 1;
    const effectiveScale = containScale * sceneZoom;
    const mappedW = srcW * effectiveScale;
    const mappedH = srcH * effectiveScale;
    const offsetX = (visualCols - mappedW) * 0.5;
    const offsetY = (dstRows - mappedH) * 0.5;

    const sceneDampen = kind === "mapline" ? 0.8 : 1;
    const densityBoostX = aspectDelta < 1 ? clamp((1 / Math.max(0.001, aspectDelta)) * sceneDampen, 1, 1.85) : 1;
    const densityBoostY = aspectDelta > 1 ? clamp(aspectDelta * sceneDampen, 1, 1.85) : 1;
    if (aspectDelta > 1.32) {
      this.lastDensityMode = "HIGH-V";
    } else if (aspectDelta > 1.12) {
      this.lastDensityMode = "MID-V";
    } else if (aspectDelta < 0.78) {
      this.lastDensityMode = "HIGH-H";
    } else if (aspectDelta < 0.9) {
      this.lastDensityMode = "MID-H";
    } else {
      this.lastDensityMode = "BALANCED";
    }

    const lines = [];
    for (let y = 0; y < dstRows; y += 1) {
      let row = "";
      for (let x = 0; x < dstCols; x += 1) {
        const gx0 = x * charAspect;
        const gx1 = (x + 1) * charAspect;
        const gy0 = y;
        const gy1 = y + 1;
        const rawSx0 = (gx0 - offsetX) / effectiveScale;
        const rawSx1 = (gx1 - offsetX) / effectiveScale;
        const rawSy0 = (gy0 - offsetY) / effectiveScale;
        const rawSy1 = (gy1 - offsetY) / effectiveScale;

        if (rawSx1 <= 0 || rawSx0 >= srcW || rawSy1 <= 0 || rawSy0 >= srcH) {
          // 여백은 너무 짙지 않도록 희소 패턴으로만 채운다.
          const mod = isMapline ? 67 : 41;
          const noise = (x * 17 + y * 13) % mod;
          if (noise === 0) {
            row += ":";
          } else if (noise <= (isMapline ? 1 : 2)) {
            row += ".";
          } else {
            row += " ";
          }
          continue;
        }

        const sx0 = clamp(rawSx0, 0, srcW - 1);
        const sx1 = clamp(rawSx1, 0, srcW);
        const sy0 = clamp(rawSy0, 0, srcH - 1);
        const sy1 = clamp(rawSy1, 0, srcH);

        const cellW = Math.max(1, sx1 - sx0);
        const cellH = Math.max(1, sy1 - sy0);
        const stepsX = clamp(Math.ceil((cellW / 1.55) * densityBoostX), 4, 14);
        const stepsY = clamp(Math.ceil((cellH / 1.55) * densityBoostY), 4, 14);

        let darkest = 255;
        let edgeSum = 0;
        let avgSum = 0;
        let samples = 0;
        for (let yy = 0; yy < stepsY; yy += 1) {
          for (let xx = 0; xx < stepsX; xx += 1) {
            const sx = sx0 + ((xx + 0.5) / stepsX) * cellW;
            const sy = sy0 + ((yy + 0.5) / stepsY) * cellH;
            const luma = sampleLuma(sx, sy);
            const right = sampleLuma(sx + 1.0, sy);
            const down = sampleLuma(sx, sy + 1.0);
            darkest = Math.min(darkest, luma);
            avgSum += luma;
            edgeSum += Math.abs(luma - right) + Math.abs(luma - down);
            samples += 1;
          }
        }

        const avgLuma = avgSum / Math.max(1, samples);
        const edgeAvg = edgeSum / Math.max(1, samples);
        let signal;
        if (isPortrait) {
          // 실루엣 채움보다 선(edge)을 우선해 두께를 줄인다.
          signal = (255 - darkest) * 1.32 + (255 - avgLuma) * 0.44 + edgeAvg * 1.34;
          // 내부가 넓게 칠해지는 구간(눈/음영)을 억제.
          if (edgeAvg < 9.5 && signal > 110) {
            signal *= 0.7;
          }
        } else if (isMapline) {
          // mapline은 과도한 면 채움을 줄이고 선 정보 위주로 단순하게 표현한다.
          signal = (255 - darkest) * 1.22 + (255 - avgLuma) * 0.36 + edgeAvg * 1.08;
        } else {
          signal = (255 - darkest) * 2.2 + (255 - avgLuma) * 0.84 + edgeAvg * 1.04;
        }
        if (kind === "mapline") {
          signal *= 0.93;
        } else if (densityBoostY > 1) {
          // 초광폭에서 portrait의 세로 디테일이 뭉개지지 않도록 엣지 비중을 소폭 올린다.
          signal += edgeAvg * 0.08;
        }
        signal = clamp(signal, 0, 255);

        const lowSignalCut = isPortrait ? 14 : isMapline ? 19 : 7;
        if (signal < lowSignalCut) {
          // 저신호 영역도 과도하게 짙어지지 않게 희소화.
          const mod = isMapline ? 71 : 37;
          const noise = (x * 11 + y * 7) % mod;
          if (noise === 0) {
            row += ":";
          } else if (noise <= (isMapline ? 1 : 2)) {
            row += ".";
          } else {
            row += " ";
          }
          continue;
        }

        const gamma = isPortrait ? 0.9 : isMapline ? 0.98 : 0.62;
        const normalized = Math.pow(signal / 255, gamma);
        const maxCharIndex = isPortrait || isMapline ? ramp.length - 2 : ramp.length - 1;
        const charIndex = Math.floor(normalized * maxCharIndex);
        const char = ramp[charIndex] ?? ".";
        if (char === " ") {
          row += isMapline ? " " : ".";
        } else {
          row += char;
        }
      }
      lines.push(row);
    }
    return lines.join("\n");
  }

  buildFallbackAscii(layout, reason) {
    const rows = layout.rows;
    const cols = layout.columns;
    const lines = [];
    for (let y = 0; y < rows; y += 1) {
      let row = "";
      for (let x = 0; x < cols; x += 1) {
        row += (x + y) % 3 === 0 ? ":" : ".";
      }
      lines.push(row);
    }
    const message = `ASCII SOURCE LOAD FAILED :: ${reason}`.toUpperCase();
    const center = Math.floor(rows * 0.5);
    const start = Math.max(0, Math.floor((cols - message.length) * 0.5));
    const chars = lines[center].split("");
    for (let i = 0; i < message.length && start + i < cols; i += 1) {
      chars[start + i] = message[i];
    }
    lines[center] = chars.join("");
    return lines.join("\n");
  }

  getAsciiLayout() {
    const width = this.asciiViewport?.clientWidth || window.innerWidth;
    const height = this.asciiViewport?.clientHeight || Math.round(window.innerHeight * 0.82);
    const font = parseFloat(window.getComputedStyle(this.asciiPrimary).fontSize || "9") || 9;
    const charWidth = font * 0.62;
    const lineHeight = font * 1.04;
    const charAspect = clamp(charWidth / Math.max(1, lineHeight), 0.45, 0.95);
    const viewportAspect = width / Math.max(1, height);
    const rowDensityBoost = clamp(1 + (viewportAspect - 1.45) * 0.14, 1, 1.18);

    const rows = clamp(Math.floor(((height - 32) / lineHeight) * rowDensityBoost), 58, 248);
    const rawCols = Math.floor((width - 28) / charWidth);
    // 초광폭에서 좌측 몰림이 생기지 않도록 가로 컬럼 상한을 확장한다.
    const cols = clamp(Math.min(rawCols, Math.floor(rows * 4.4)), 72, 620);
    return { columns: cols, rows, charAspect };
  }

  async loadImage(src) {
    if (this.imageLoader) {
      try {
        const loaded = await this.imageLoader(src);
        const dims = getImageDimensions(loaded);
        if (loaded && dims.width > 0 && dims.height > 0) {
          return loaded;
        }
      } catch (_error) {
        // no-op
      }
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        const dims = getImageDimensions(image);
        if (dims.width > 0 && dims.height > 0) {
          resolve(image);
          return;
        }
        reject(new Error("empty-image"));
      };
      image.onerror = () => reject(new Error("image-load-failed"));
      image.src = new URL(src, window.location.href).href;
    });
  }

  initVisibilityObserver() {
    if (!("IntersectionObserver" in window)) {
      this.isVisible = true;
      this.panelWrap.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target !== this.stage) {
            return;
          }
          const visible = entry.isIntersecting;
          this.panelWrap.classList.toggle("is-visible", visible);
          if (visible === this.isVisible) {
            return;
          }
          this.isVisible = visible;
          if (visible) {
            this.startRuntime();
          } else {
            this.stopRuntimeLoops();
          }
        });
      },
      { threshold: [0, 0.01], rootMargin: "0px 0px -6% 0px" }
    );
    observer.observe(this.stage);
  }

  async startRuntime() {
    if (!this.sceneOrder.length) {
      return;
    }
    if (!this.hasStarted) {
      const first = this.scenes.get(this.sceneOrder[0]);
      if (first) {
        await this.swapToScene(first, false);
      }
      this.hasStarted = true;
    } else if (this.baseAsciiText && this.activeLayer) {
      // Visibility toggle로 typing이 중단된 경우, 부분 문자열 상태를 전체 문자열로 복원한다.
      this.activeLayer.textContent = this.baseAsciiText;
    }
    this.startSceneCycle();
    this.scheduleAmbientGlitch();
  }

  startSceneCycle() {
    window.clearInterval(this.sceneTimer);
    if (this.prefersReducedMotion || this.sceneOrder.length < 2) {
      return;
    }
    this.sceneTimer = window.setInterval(async () => {
      if (!this.isVisible || this.isTyping) {
        return;
      }
      this.sceneCursor = (this.sceneCursor + 1) % this.sceneOrder.length;
      const next = this.scenes.get(this.sceneOrder[this.sceneCursor]);
      if (next) {
        await this.swapToScene(next, false);
      }
    }, 9000);
  }

  async swapToScene(scene, immediate = false) {
    this.currentSceneId = scene.id;
    this.baseAsciiText = scene.text;
    if (immediate || this.prefersReducedMotion) {
      this.activeLayer.textContent = scene.text;
      this.inactiveLayer.textContent = scene.text;
      this.asciiPrimary.classList.add("is-active");
      this.asciiSecondary.classList.remove("is-active");
      this.activeLayer = this.asciiPrimary;
      this.inactiveLayer = this.asciiSecondary;
      this.setMeta("Live", scene.label);
      return;
    }

    const incoming = this.activeLayer === this.asciiPrimary ? this.asciiSecondary : this.asciiPrimary;
    const outgoing = this.activeLayer;
    incoming.textContent = "";
    incoming.classList.add("is-active");
    outgoing.classList.remove("is-active");
    this.activeLayer = incoming;
    this.inactiveLayer = outgoing;
    this.setMeta("Typing", scene.label);
    await this.typeInText(incoming, scene.text);
    this.setMeta("Live", scene.label);
  }

  async typeInText(target, fullText) {
    const token = ++this.typeToken;
    this.isTyping = true;
    const duration = clamp(700 + fullText.length * 0.035, 900, 2400);
    const start = performance.now();

    await new Promise((resolve) => {
      const tick = (now) => {
        if (token !== this.typeToken) {
          resolve();
          return;
        }
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const visible = Math.floor(fullText.length * eased);
        target.textContent = fullText.slice(0, visible);
        if (t < 1) {
          window.requestAnimationFrame(tick);
          return;
        }
        target.textContent = fullText;
        resolve();
      };
      window.requestAnimationFrame(tick);
    });

    if (token === this.typeToken) {
      this.baseAsciiText = fullText;
      this.isTyping = false;
    }
  }

  handlePointerMove(event) {
    if (this.prefersReducedMotion || this.isTyping || !this.baseAsciiText) {
      return;
    }
    const rect = this.asciiViewport.getBoundingClientRect();
    const xNorm = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const yNorm = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    this.asciiViewport.style.setProperty("--cursor-x", `${(xNorm * 100).toFixed(2)}%`);
    this.asciiViewport.style.setProperty("--cursor-y", `${(yNorm * 100).toFixed(2)}%`);

    const lines = this.baseAsciiText.split("\n");
    if (!lines.length) {
      return;
    }
    const rows = lines.length;
    const cols = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const centerRow = Math.floor((rows - 1) * yNorm);
    const centerCol = Math.floor((cols - 1) * xNorm);
    const radius = Math.max(5, Math.floor(cols / 28));
    const grid = lines.map((line) => line.split(""));

    for (let y = Math.max(0, centerRow - radius); y <= Math.min(rows - 1, centerRow + radius); y += 1) {
      for (let x = Math.max(0, centerCol - radius); x <= Math.min(cols - 1, centerCol + radius); x += 1) {
        const distance = Math.hypot(x - centerCol, y - centerRow);
        if (distance > radius) {
          continue;
        }
        if (Math.random() > 0.42 * (1 - distance / radius)) {
          continue;
        }
        const base = grid[y][x];
        if (!base || base === "." || base === ":" || base === " ") {
          continue;
        }
        grid[y][x] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
    }

    this.activeLayer.textContent = grid.map((line) => line.join("")).join("\n");
    window.clearTimeout(this.pointerResetTimer);
    this.pointerResetTimer = window.setTimeout(() => {
      this.activeLayer.textContent = this.baseAsciiText;
    }, 90);
  }

  handlePointerLeave() {
    this.asciiViewport.style.setProperty("--cursor-x", "50%");
    this.asciiViewport.style.setProperty("--cursor-y", "50%");
    window.clearTimeout(this.pointerResetTimer);
    if (!this.isTyping) {
      this.activeLayer.textContent = this.baseAsciiText;
    }
  }

  scheduleAmbientGlitch() {
    window.clearTimeout(this.glitchTimer);
    if (this.prefersReducedMotion) {
      return;
    }
    const delay = 3800 + Math.random() * 4600;
    this.glitchTimer = window.setTimeout(() => {
      if (!this.isVisible || this.isTyping || !this.baseAsciiText) {
        this.scheduleAmbientGlitch();
        return;
      }
      if (this.asciiStack) {
        this.asciiStack.classList.add("is-glitching");
      }
      const chars = this.baseAsciiText.split("");
      const editable = [];
      for (let i = 0; i < chars.length; i += 1) {
        if (chars[i] !== "\n" && chars[i] !== " " && chars[i] !== "." && chars[i] !== ":") {
          editable.push(i);
        }
      }
      const count = clamp(Math.floor(editable.length * 0.005), 8, 240);
      for (let i = 0; i < count; i += 1) {
        const index = editable[Math.floor(Math.random() * editable.length)];
        chars[index] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      this.activeLayer.textContent = chars.join("");
      window.clearTimeout(this.glitchResetTimer);
      this.glitchResetTimer = window.setTimeout(() => {
        if (this.asciiStack) {
          this.asciiStack.classList.remove("is-glitching");
        }
        if (!this.isTyping) {
          this.activeLayer.textContent = this.baseAsciiText;
        }
      }, 120);
      this.scheduleAmbientGlitch();
    }, delay);
  }

  renderBridgeWords(words) {
    if (!this.bridgeStream) {
      return;
    }
    const sourceWords = Array.isArray(words) && words.length ? words : ["FONTAINE", "HYDRO", "SALON"];
    const loop = Array.from({ length: 12 }, (_, index) => sourceWords[index % sourceWords.length]);
    this.bridgeStream.innerHTML = loop
      .map(
        (word, index) =>
          `<span class="terminal-bridge-word" style="--delay:${(-index * 1.8).toFixed(2)}s">${word}</span>`
      )
      .join("");
  }

  setMeta(status, asset) {
    if (!this.metaLine) {
      return;
    }
    const checksum = this.terminalData?.checksum ?? "UNSIGNED";
    const error = this.lastErrors.length ? this.lastErrors[0] : "NONE";
    const baseLine = `Archive: ${asset} · Scene: ${status} · Signature: ${checksum}`;
    this.metaLine.textContent =
      error === "NONE" ? baseLine : `${baseLine} · Err: ${error} · ${TERMINAL_BUILD_TAG}`;
  }

  stopRuntimeLoops() {
    window.clearInterval(this.sceneTimer);
    this.sceneTimer = 0;
    window.clearTimeout(this.glitchTimer);
    this.glitchTimer = 0;
    window.clearTimeout(this.glitchResetTimer);
    this.glitchResetTimer = 0;
    window.clearTimeout(this.pointerResetTimer);
    this.pointerResetTimer = 0;
    this.typeToken += 1;
    this.isTyping = false;
    if (this.baseAsciiText && this.activeLayer) {
      this.activeLayer.textContent = this.baseAsciiText;
    }
    if (this.asciiStack) {
      this.asciiStack.classList.remove("is-glitching");
    }
  }
}
