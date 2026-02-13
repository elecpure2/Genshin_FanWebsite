import { characters, DEFAULT_CHARACTER_ID } from "./character-data.js";
import { WebGLTransitionEngine } from "./webgl-transition.js";
import { TerminalAsciiExperience } from "./terminal-ascii-experience.js";

const root = document.documentElement;

const heroImage = document.getElementById("heroImage");
const heroElement = document.getElementById("heroElement");
const heroName = document.getElementById("heroName");
const heroTitle = document.getElementById("heroTitle");
const heroDescription = document.getElementById("heroDescription");
const heroStats = document.getElementById("heroStats");

const profileHeading = document.getElementById("profileHeading");
const profileText = document.getElementById("profileText");
const profilePills = document.getElementById("profilePills");
const snapshotKicker = document.getElementById("snapshotKicker");
const snapshotHeading = document.getElementById("snapshotHeading");
const snapshotSummary = document.getElementById("snapshotSummary");
const snapshotPoints = document.getElementById("snapshotPoints");
const snapshotTags = document.getElementById("snapshotTags");
const snapshotTerminalDock = document.getElementById("snapshotTerminalDock");
const terminalBridge = document.getElementById("terminalBridge");
const terminalBridgeParticles = document.getElementById("terminalBridgeParticles");
const terminalBridgeCaption = document.getElementById("terminalBridgeCaption");
const terminalBridgeStream = document.getElementById("terminalBridgeStream");
const terminalStage = document.getElementById("terminalStage");
const terminalPanelWrap = document.getElementById("terminalPanelWrap");
const terminalPanel = document.getElementById("terminalPanel");
const terminalTitle = document.getElementById("terminalTitle");
const terminalTabs = document.getElementById("terminalTabs");
const terminalAsciiViewport = document.getElementById("terminalAsciiViewport");
const terminalAsciiStack = document.getElementById("terminalAsciiStack");
const terminalAsciiPrimary = document.getElementById("terminalAsciiPrimary");
const terminalAsciiSecondary = document.getElementById("terminalAsciiSecondary");
const terminalLogStream = document.getElementById("terminalLogStream");
const terminalInfoTitle = document.getElementById("terminalInfoTitle");
const terminalInfoList = document.getElementById("terminalInfoList");
const terminalPromptLabel = document.getElementById("terminalPromptLabel");
const terminalMetaLine = document.getElementById("terminalMetaLine");

const immersiveStage = document.getElementById("immersiveStage");
const immersivePin = document.getElementById("immersivePin");
const immersiveScene = document.getElementById("immersiveScene");

const immersiveThemeTag = document.getElementById("immersiveThemeTag");
const immersiveWord = document.getElementById("immersiveWord");
const immersiveMotto = document.getElementById("immersiveMotto");
const immersiveSignature = document.getElementById("immersiveSignature");
const immersiveBackdrop = document.getElementById("immersiveBackdrop");
const immersiveTransitionCanvas = document.getElementById("immersiveTransitionCanvas");
const immersiveCaustics = document.getElementById("immersiveCaustics");
const immersiveBeams = document.getElementById("immersiveBeams");
const immersiveFx = document.getElementById("immersiveFx");
const immersiveDecor = document.getElementById("immersiveDecor");
const immersiveKeywords = document.getElementById("immersiveKeywords");
const immersiveCharacterWrap = document.getElementById("immersiveCharacterWrap");
const immersiveImage = document.getElementById("immersiveImage");
const immersiveIntroCard = document.getElementById("immersiveIntroCard");
const immersiveIntroTitle = document.getElementById("immersiveIntroTitle");
const immersiveIntroBody = document.getElementById("immersiveIntroBody");

const immersiveDetailKicker = document.getElementById("immersiveDetailKicker");
const immersiveDetailHeading = document.getElementById("immersiveDetailHeading");
const immersiveLoreText = document.getElementById("immersiveLoreText");
const immersiveStatsGrid = document.getElementById("immersiveStatsGrid");
const immersiveGalleryGrid = document.getElementById("immersiveGalleryGrid");
const particleCanvas = document.getElementById("immersiveParticles");
const charactersNavItem = document.getElementById("charactersNavItem");
const characterMenuTrigger = document.getElementById("characterMenuTrigger");
const characterMenuPanel = document.getElementById("characterMenuPanel");
const characterMenuList = document.getElementById("characterMenuList");
const characterQuickDots = document.getElementById("characterQuickDots");
const pageShell = document.querySelector(".page-shell");

const characterIds = Object.keys(characters);
const themeClassNames = characterIds.map((id) => `theme-${id}`);
const supportsHoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
const initialCharacterId = characters[DEFAULT_CHARACTER_ID] ? DEFAULT_CHARACTER_ID : characterIds[0];

let currentCharacterId = initialCharacterId ?? "furina";
let isCharacterMenuOpen = false;
const stageState = { progress: 0, tiltX: 0, tiltY: 0, scrollVelocity: 0 };
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let currentScrollFx = { beamOpacity: 0.62, causticOpacity: 0.34, beamSpread: 1 };
let lastScrollY = window.scrollY;
let lastScrollTime = performance.now();

let particleFrame = 0;
let particleCtx = null;
let particles = [];
let particleColor = [145, 219, 255];
const particlePointer = { x: 0, y: 0, active: false };
let decorMotionNodes = [];
let keywordMotionNodes = [];
let fxMotionNodes = [];
let heroSwapToken = 0;
let immersiveSwapToken = 0;
const swipeState = {
  startX: 0,
  startY: 0,
  lastX: 0,
  lastTime: 0,
  tracking: false,
  direction: 0,
  progress: 0,
  gestureProgress: 0,
  targetId: null,
  interactive: false,
  velocityX: 0,
  previewX: 0,
};
const transitionState = {
  inProgress: false,
  queued: null,
};
const imageAssetCache = new Map();
const transitionEngine = new WebGLTransitionEngine(immersiveTransitionCanvas, { intensity: 0.9 });
const isLowPowerDevice =
  (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
  (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4);
const webglTransitionEnabled = false && transitionEngine.init() && !prefersReducedMotion && !isLowPowerDevice;
const terminalExperience = new TerminalAsciiExperience({
  dock: snapshotTerminalDock,
  bridge: terminalBridge,
  bridgeParticles: terminalBridgeParticles,
  bridgeCaption: terminalBridgeCaption,
  bridgeStream: terminalBridgeStream,
  stage: terminalStage,
  panelWrap: terminalPanelWrap,
  panel: terminalPanel,
  title: terminalTitle,
  tabs: terminalTabs,
  asciiViewport: terminalAsciiViewport,
  asciiStack: terminalAsciiStack,
  asciiPrimary: terminalAsciiPrimary,
  asciiSecondary: terminalAsciiSecondary,
  logStream: terminalLogStream,
  infoTitle: terminalInfoTitle,
  infoList: terminalInfoList,
  promptLabel: terminalPromptLabel,
  metaLine: terminalMetaLine,
  prefersReducedMotion,
  imageLoader: preloadImageAsset,
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseCssRgb(value) {
  const parts = value
    .trim()
    .split(/\s+/)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
  if (parts.length === 3) {
    return parts;
  }
  return [145, 219, 255];
}

function getDirectionalOffset(direction, distance) {
  if (!direction) {
    return 0;
  }
  return direction > 0 ? distance : -distance;
}

function getCharacterById(id) {
  return characters[id] ?? null;
}

function getCharacterAssetPaths(character) {
  if (!character) {
    return [];
  }
  return [
    character.heroImage,
    character.immersiveImage,
    character.immersiveBackdrop,
    ...(character.terminal ? terminalExperience.getAssetPaths(character) : []),
  ].filter(Boolean);
}

function preloadImageAsset(src) {
  if (!src) {
    return Promise.resolve(null);
  }
  if (imageAssetCache.has(src)) {
    return imageAssetCache.get(src);
  }

  const imagePromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        if (typeof image.decode === "function") {
          await image.decode();
        }
      } catch (_error) {
        // decode 실패는 무시하고 로드된 이미지를 그대로 사용한다.
      }
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`이미지 로딩 실패: ${src}`));
    };
    image.src = src;
  }).catch((error) => {
    imageAssetCache.delete(src);
    throw error;
  });

  imageAssetCache.set(src, imagePromise);
  return imagePromise;
}

async function preloadCharacterAssets(id) {
  const character = getCharacterById(id);
  if (!character) {
    return;
  }
  const assets = getCharacterAssetPaths(character);
  await Promise.allSettled(assets.map((src) => preloadImageAsset(src)));
}

function prewarmAdjacentCharacters(id) {
  if (characterIds.length < 2) {
    return;
  }
  const index = characterIds.indexOf(id);
  if (index < 0) {
    return;
  }
  const nextId = characterIds[(index + 1) % characterIds.length];
  const prevId = characterIds[(index - 1 + characterIds.length) % characterIds.length];

  window.setTimeout(() => {
    preloadCharacterAssets(nextId);
    preloadCharacterAssets(prevId);
  }, 0);
}

async function getTransitionImages(fromId, toId) {
  const fromCharacter = getCharacterById(fromId);
  const toCharacter = getCharacterById(toId);
  if (!fromCharacter || !toCharacter) {
    return null;
  }

  const fromImagePromise = preloadImageAsset(fromCharacter.immersiveImage);
  const toImagePromise = preloadImageAsset(toCharacter.immersiveImage);
  const [fromImage, toImage] = await Promise.all([fromImagePromise, toImagePromise]);
  if (!fromImage || !toImage) {
    return null;
  }

  return { fromImage, toImage };
}

function setSwipeBlurIntensity(value) {
  if (!immersivePin) {
    return;
  }
  const amount = clamp(value, 0, 1);
  immersivePin.style.setProperty("--scene-swipe-blur", `${(amount * 4.2).toFixed(2)}px`);
  immersivePin.style.setProperty("--scene-swipe-blur-soft", `${(amount * 2.2).toFixed(2)}px`);
  immersivePin.style.setProperty("--scene-swipe-sat-loss", `${(amount * 0.1).toFixed(3)}`);
}

function getCurvedSwipeOffset(dx) {
  const maxShift = Math.max(window.innerWidth * 0.26, 140);
  const inputRange = Math.max(window.innerWidth * 0.5, 220);
  const normalized = clamp(Math.abs(dx) / inputRange, 0, 1);
  const curved = Math.sin(normalized * Math.PI * 0.5);
  return Math.sign(dx || 1) * maxShift * curved;
}

function setScenePreview(dx, progress) {
  if (transitionState.inProgress) {
    return;
  }
  const targetPreviewX = getCurvedSwipeOffset(dx);
  const targetProgress = easeOutCubic(clamp(progress, 0, 1));
  const smoothFactor = swipeState.tracking ? 0.34 : 0.42;

  swipeState.previewX += (targetPreviewX - swipeState.previewX) * smoothFactor;
  swipeState.progress += (targetProgress - swipeState.progress) * smoothFactor;
  setSwipeBlurIntensity(swipeState.progress);
  updateStageTransform();
}

function easeOutCubic(t) {
  const p = 1 - t;
  return 1 - p * p * p;
}

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  const p = -2 * t + 2;
  return 1 - (p * p * p) / 2;
}

function animateSwipeState(targetX, targetProgress, duration, easingFn = easeInOutCubic) {
  const startX = swipeState.previewX;
  const startProgress = swipeState.progress;
  const startAt = performance.now();

  return new Promise((resolve) => {
    const tick = (now) => {
      const t = clamp((now - startAt) / duration, 0, 1);
      const eased = easingFn(t);
      swipeState.previewX = startX + (targetX - startX) * eased;
      swipeState.progress = startProgress + (targetProgress - startProgress) * eased;
      setSwipeBlurIntensity(swipeState.progress);
      updateStageTransform();

      if (t < 1) {
        window.requestAnimationFrame(tick);
        return;
      }
      resolve();
    };
    window.requestAnimationFrame(tick);
  });
}

async function resetScenePreview(animated = true) {
  if (!animated || prefersReducedMotion) {
    swipeState.previewX = 0;
    swipeState.progress = 0;
    setSwipeBlurIntensity(0);
    updateStageTransform();
    return;
  }
  await animateSwipeState(0, 0, 220, easeOutCubic);
}

async function playSceneSwipeTransition(direction, onCommit) {
  if (prefersReducedMotion) {
    onCommit?.();
    await Promise.resolve();
    return;
  }

  const outShift = getDirectionalOffset(direction, clamp(window.innerWidth * 0.24, 140, 300));
  const outDuration = 240;
  const commitAtMs = 64;
  const startAt = performance.now();
  let committed = false;

  await new Promise((resolve) => {
    const tick = (now) => {
      const elapsed = now - startAt;
      const t = clamp(elapsed / outDuration, 0, 1);
      const eased = easeInOutCubic(t);
      swipeState.previewX = outShift * eased;
      swipeState.progress = clamp(eased * 0.72, 0, 1);
      setSwipeBlurIntensity(swipeState.progress);
      updateStageTransform();

      if (!committed && elapsed >= commitAtMs) {
        committed = true;
        onCommit?.();
      }

      if (t < 1) {
        window.requestAnimationFrame(tick);
        return;
      }
      resolve();
    };
    window.requestAnimationFrame(tick);
  });

  if (!committed) {
    onCommit?.();
  }
  await animateSwipeState(0, 0, 300, easeInOutCubic);
}

function applyTypographyTokens(character) {
  const tokens = character.typography ?? {};

  root.style.setProperty("--display-fill-1", tokens.displayFill1 ?? "#f2fbff");
  root.style.setProperty("--display-fill-2", tokens.displayFill2 ?? "#a7deff");
  root.style.setProperty("--display-fill-3", tokens.displayFill3 ?? "#deefff");
  root.style.setProperty("--display-stroke", tokens.displayStroke ?? "rgba(214, 235, 255, 0.35)");
  root.style.setProperty("--display-glow", tokens.displayGlow ?? "rgba(145, 219, 255, 0.44)");
  root.style.setProperty("--motto-color", tokens.mottoColor ?? "rgba(223, 237, 255, 0.88)");
  root.style.setProperty("--signature-color", tokens.signatureColor ?? "rgba(206, 227, 255, 0.68)");
  root.style.setProperty("--keyword-tone", tokens.keywordTone ?? "rgba(212, 226, 255, 0.14)");
}

function getCharacterMenuItems() {
  return Array.from(characterMenuList?.querySelectorAll(".character-menu-item") ?? []);
}

function focusCharacterMenuItem(index) {
  const items = getCharacterMenuItems();
  if (!items.length) {
    return;
  }
  const safeIndex = ((index % items.length) + items.length) % items.length;
  items[safeIndex].focus();
}

function setCharacterMenuOpen(isOpen) {
  if (isCharacterMenuOpen === isOpen) {
    return;
  }
  isCharacterMenuOpen = isOpen;
  charactersNavItem?.classList.toggle("is-open", isOpen);
  characterMenuTrigger?.setAttribute("aria-expanded", String(isOpen));
}

function setActiveMenuCharacter(id) {
  const items = getCharacterMenuItems();
  items.forEach((item) => {
    const isActive = item.dataset.character === id;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-checked", String(isActive));
  });
}

function getCharacterQuickDots() {
  return Array.from(characterQuickDots?.querySelectorAll(".character-quick-dot") ?? []);
}

function setActiveQuickCharacter(id) {
  const items = getCharacterQuickDots();
  items.forEach((item) => {
    const isActive = item.dataset.character === id;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
    item.tabIndex = isActive ? 0 : -1;
  });
}

function shiftCharacter(step) {
  if (characterIds.length < 2) {
    return;
  }
  const nextId = getCharacterIdByStep(currentCharacterId, step);
  if (!nextId) {
    return;
  }
  applyCharacterTheme(nextId, { direction: step });
}

function getCharacterIdByStep(baseId, step) {
  if (characterIds.length < 2) {
    return null;
  }
  const currentIndex = characterIds.indexOf(baseId);
  if (currentIndex < 0) {
    return null;
  }
  const nextIndex = (currentIndex + step + characterIds.length) % characterIds.length;
  return characterIds[nextIndex];
}

function getSwitchDirectionTo(targetId) {
  const total = characterIds.length;
  if (total < 2) {
    return 0;
  }
  const currentIndex = characterIds.indexOf(currentCharacterId);
  const targetIndex = characterIds.indexOf(targetId);
  if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) {
    return 0;
  }

  const forward = (targetIndex - currentIndex + total) % total;
  const backward = (currentIndex - targetIndex + total) % total;
  return forward <= backward ? 1 : -1;
}

function renderCharacterMenu() {
  if (!characterMenuList) {
    return;
  }
  characterMenuList.innerHTML = "";

  characterIds.forEach((characterId) => {
    const character = characters[characterId];
    if (!character) {
      return;
    }
    const item = document.createElement("button");
    item.type = "button";
    item.className = "character-menu-item";
    item.setAttribute("role", "menuitemradio");
    item.setAttribute("aria-checked", "false");
    item.dataset.character = character.id;
    item.innerHTML = `
      <span class="character-menu-name">${character.displayName}</span>
      <span class="character-menu-meta">${character.element}</span>
      <span class="character-menu-desc">${character.title}</span>
    `;

    item.addEventListener("click", () => {
      applyCharacterTheme(character.id, { direction: getSwitchDirectionTo(character.id) });
      setCharacterMenuOpen(false);
    });
    characterMenuList.append(item);
  });
}

function renderCharacterQuickDots() {
  if (!characterQuickDots) {
    return;
  }
  characterQuickDots.innerHTML = "";

  characterIds.forEach((characterId) => {
    const character = characters[characterId];
    if (!character) {
      return;
    }
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "character-quick-dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-selected", "false");
    dot.setAttribute("aria-label", `${character.displayName} 캐릭터 보기`);
    dot.dataset.character = character.id;
    dot.addEventListener("click", () => {
      applyCharacterTheme(character.id, { direction: getSwitchDirectionTo(character.id) });
    });
    characterQuickDots.append(dot);
  });
}

function initCharacterQuickDotsInteractions() {
  if (!characterQuickDots) {
    return;
  }

  characterQuickDots.addEventListener("keydown", (event) => {
    const items = getCharacterQuickDots();
    if (!items.length) {
      return;
    }

    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();

    const currentIndex = Math.max(0, items.indexOf(document.activeElement));
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    }

    const next = items[nextIndex];
    if (!next) {
      return;
    }
    next.focus();
    if (next.dataset.character) {
      applyCharacterTheme(next.dataset.character, {
        direction: getSwitchDirectionTo(next.dataset.character),
      });
    }
  });
}

function initCharacterSwipeInteractions() {
  if (!immersivePin) {
    return;
  }

  const resetSwipeState = () => {
    swipeState.tracking = false;
    swipeState.direction = 0;
    swipeState.progress = 0;
    swipeState.gestureProgress = 0;
    swipeState.targetId = null;
    swipeState.interactive = false;
    swipeState.velocityX = 0;
    swipeState.previewX = 0;
  };

  const beginInteractiveSwipe = async (direction, targetId) => {
    if (!webglTransitionEnabled || !targetId || transitionState.inProgress) {
      return;
    }
    const images = await getTransitionImages(currentCharacterId, targetId);
    if (!swipeState.tracking || swipeState.targetId !== targetId || swipeState.direction !== direction) {
      return;
    }
    if (!images) {
      return;
    }

    const started = transitionEngine.beginInteractiveTransition({
      fromImage: images.fromImage,
      toImage: images.toImage,
      direction,
    });
    if (!started) {
      return;
    }
    swipeState.interactive = true;
    transitionState.inProgress = true;
  };

  immersivePin.addEventListener(
    "touchstart",
    (event) => {
      if (transitionState.inProgress) {
        return;
      }
      const touch = event.changedTouches?.[0];
      if (!touch) {
        return;
      }
      swipeState.startX = touch.clientX;
      swipeState.startY = touch.clientY;
      swipeState.lastX = touch.clientX;
      swipeState.lastTime = performance.now();
      swipeState.tracking = true;
      swipeState.direction = 0;
      swipeState.progress = 0;
      swipeState.gestureProgress = 0;
      swipeState.targetId = null;
      swipeState.interactive = false;
      swipeState.velocityX = 0;
      swipeState.previewX = 0;

      preloadCharacterAssets(getCharacterIdByStep(currentCharacterId, 1));
      preloadCharacterAssets(getCharacterIdByStep(currentCharacterId, -1));
    },
    { passive: true }
  );

  immersivePin.addEventListener(
    "touchmove",
    (event) => {
      if (!swipeState.tracking) {
        return;
      }
      const touch = event.changedTouches?.[0];
      if (!touch) {
        return;
      }

      const dx = touch.clientX - swipeState.startX;
      const dy = touch.clientY - swipeState.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const now = performance.now();
      const dt = Math.max(16, now - swipeState.lastTime);
      swipeState.velocityX = (touch.clientX - swipeState.lastX) / dt;
      swipeState.lastX = touch.clientX;
      swipeState.lastTime = now;

      if (!swipeState.direction) {
        const shouldLockHorizontal = absDx > 10 && absDx > absDy * 1.08;
        if (!shouldLockHorizontal) {
          return;
        }
        swipeState.direction = dx < 0 ? 1 : -1;
        swipeState.targetId = getCharacterIdByStep(currentCharacterId, swipeState.direction);
        if (!swipeState.targetId) {
          resetSwipeState();
          return;
        }
        beginInteractiveSwipe(swipeState.direction, swipeState.targetId);
      }

      if (absDx > absDy * 1.02) {
        event.preventDefault();
      }

      const gestureProgress = clamp((absDx - 8) / Math.max(window.innerWidth * 0.43, 180), 0, 1);
      swipeState.gestureProgress = gestureProgress;
      setScenePreview(dx, gestureProgress);
      if (swipeState.interactive) {
        transitionEngine.updateInteractiveProgress(gestureProgress);
      }
    },
    { passive: false }
  );

  immersivePin.addEventListener(
    "touchend",
    async (event) => {
      if (!swipeState.tracking) {
        return;
      }
      const touch = event.changedTouches?.[0];
      if (!touch) {
        resetSwipeState();
        return;
      }

      const dx = touch.clientX - swipeState.startX;
      const dy = touch.clientY - swipeState.startY;
      const isHorizontalSwipe = Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.05;
      if (!isHorizontalSwipe || !swipeState.targetId) {
        if (swipeState.interactive) {
          await transitionEngine.finishInteractiveTransition({
            commit: false,
            onComplete: () => {
              transitionState.inProgress = false;
              flushQueuedTransition();
            },
          });
        }
        await resetScenePreview(true);
        resetSwipeState();
        return;
      }

      const shouldCommit = swipeState.gestureProgress > 0.36 || Math.abs(swipeState.velocityX) > 0.38;
      const targetId = swipeState.targetId;
      const direction = swipeState.direction || (dx < 0 ? 1 : -1);

      if (swipeState.interactive) {
        await transitionEngine.finishInteractiveTransition({
          commit: shouldCommit,
          onCommit: () => {
            if (!shouldCommit) {
              return;
            }
            applyCharacterThemeImmediate(targetId, { direction, animate: false });
          },
          onComplete: (committed) => {
            transitionState.inProgress = false;
            if (committed) {
              prewarmAdjacentCharacters(targetId);
            }
            flushQueuedTransition();
          },
        });
      } else if (shouldCommit) {
        await resetScenePreview(false);
        await applyCharacterTheme(targetId, {
          direction,
          preferWebGL: false,
          animate: true,
        });
      } else {
        await resetScenePreview(true);
      }

      resetSwipeState();
    },
    { passive: true }
  );

  immersivePin.addEventListener(
    "touchcancel",
    () => {
      if (swipeState.interactive) {
        transitionEngine.finishInteractiveTransition({
          commit: false,
          onComplete: () => {
            transitionState.inProgress = false;
            flushQueuedTransition();
          },
        });
      }
      resetScenePreview(true);
      resetSwipeState();
    },
    { passive: true }
  );
}

function initCharacterMenuInteractions() {
  if (!charactersNavItem || !characterMenuTrigger || !characterMenuPanel) {
    return;
  }

  const openMenuAndFocus = (target = "first") => {
    setCharacterMenuOpen(true);
    if (target === "last") {
      focusCharacterMenuItem(-1);
      return;
    }
    focusCharacterMenuItem(0);
  };

  if (supportsHoverMedia.matches) {
    charactersNavItem.addEventListener("mouseenter", () => setCharacterMenuOpen(true));
    charactersNavItem.addEventListener("mouseleave", () => setCharacterMenuOpen(false));
  }

  supportsHoverMedia.addEventListener?.("change", (event) => {
    if (!event.matches) {
      setCharacterMenuOpen(false);
    }
  });

  characterMenuTrigger.addEventListener("click", () => {
    setCharacterMenuOpen(!isCharacterMenuOpen);
  });

  characterMenuTrigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenuAndFocus("first");
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenuAndFocus("last");
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setCharacterMenuOpen(false);
    }
  });

  characterMenuPanel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setCharacterMenuOpen(false);
      characterMenuTrigger.focus();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const items = getCharacterMenuItems();
      if (!items.length) {
        return;
      }
      event.preventDefault();
      const currentIndex = items.indexOf(document.activeElement);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (currentIndex + direction + items.length) % items.length;
      items[nextIndex].focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusCharacterMenuItem(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusCharacterMenuItem(-1);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (!charactersNavItem.contains(event.target)) {
      setCharacterMenuOpen(false);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isCharacterMenuOpen) {
      setCharacterMenuOpen(false);
      characterMenuTrigger.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 820) {
      setCharacterMenuOpen(false);
    }
  });
}

function initSectionMoodTransition() {
  if (!pageShell) {
    return;
  }
  if (!("IntersectionObserver" in window)) {
    pageShell.classList.add("is-visible");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          pageShell.classList.add("is-visible");
          observer.disconnect();
        }
      });
    },
    {
      root: null,
      threshold: 0.2,
    }
  );
  observer.observe(pageShell);
}

function renderStats(stats) {
  heroStats.innerHTML = "";
  stats.forEach(([label, value]) => {
    const item = document.createElement("li");
    item.innerHTML = `<span class="stat-label">${label}</span><span class="stat-value">${value}</span>`;
    heroStats.append(item);
  });
}

function renderPills(pills) {
  profilePills.innerHTML = "";
  pills.forEach((pill) => {
    const node = document.createElement("span");
    node.className = "profile-pill";
    node.textContent = pill;
    profilePills.append(node);
  });
}

function renderSnapshot(character) {
  if (!snapshotKicker || !snapshotHeading || !snapshotSummary || !snapshotPoints || !snapshotTags) {
    return;
  }

  const fallbackPoints = (character.stats ?? []).map(([label, value]) => [label, value]);
  const snapshot = character.snapshot ?? {
    kicker: "Character Snapshot",
    heading: `${character.displayName} Focus`,
    summary: character.profileText ?? "",
    points: fallbackPoints.slice(0, 3),
    tags: character.pills ?? [],
  };

  snapshotKicker.textContent = snapshot.kicker ?? "Character Snapshot";
  snapshotHeading.textContent = snapshot.heading ?? `${character.displayName} Focus`;
  snapshotSummary.textContent = snapshot.summary ?? "";

  snapshotPoints.innerHTML = "";
  (snapshot.points ?? []).slice(0, 3).forEach(([label, value]) => {
    const item = document.createElement("article");
    item.className = "snapshot-point";
    item.innerHTML = `<span>${label}</span><b>${value}</b>`;
    snapshotPoints.append(item);
  });

  snapshotTags.innerHTML = "";
  (snapshot.tags ?? []).slice(0, 4).forEach((tag) => {
    const node = document.createElement("span");
    node.className = "snapshot-tag";
    node.textContent = tag;
    snapshotTags.append(node);
  });

  terminalExperience.setCharacter(character);
}

function renderGallery(images, name, target) {
  target.innerHTML = "";
  images.forEach((src, index) => {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = src;
    img.alt = `${name} gallery ${index + 1}`;
    target.append(img);
  });
}

function renderImmersiveStats(stats) {
  immersiveStatsGrid.innerHTML = "";
  stats.forEach(([label, value]) => {
    const block = document.createElement("article");
    block.className = "immersive-stat";
    block.innerHTML = `<span class="immersive-stat-label">${label}</span><div class="immersive-stat-value">${value}</div>`;
    immersiveStatsGrid.append(block);
  });
}

function getQuickIconSvg(name) {
  if (name === "headset") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 16 0"/><rect x="3.5" y="11" width="4" height="7" rx="1.5"/><rect x="16.5" y="11" width="4" height="7" rx="1.5"/><path d="M7.5 18h9"/></svg>`;
  }
  if (name === "camera") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7l1.2-2h5.6L16 7"/><circle cx="12" cy="13" r="3.2"/></svg>`;
  }
  if (name === "plus") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
  }
  if (name === "leaf") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 14c0-5 5-9 13-9-1 8-5 13-10 13-2 0-3-1.3-3-4z"/><path d="M8 16c2.2-2.2 4.6-4.1 8-6"/></svg>`;
  }
  if (name === "book") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12"/><path d="M12 8c-1.8-1.2-4.1-1.8-7-1.8v10.8c2.9 0 5.2.6 7 1.8"/><path d="M12 8c1.8-1.2 4.1-1.8 7-1.8v10.8c-2.9 0-5.2.6-7 1.8"/></svg>`;
  }
  if (name === "sprout") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20v-7"/><path d="M12 13c0-3.5-2.4-6-6.2-6.4 0 4 2.4 6.4 6.2 6.4z"/><path d="M12 13c0-3.2 2.1-5.4 5.5-5.7 0 3.5-2.1 5.7-5.5 5.7z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9z"/></svg>`;
}

function renderImmersiveDecor(character) {
  decorMotionNodes = [];
  keywordMotionNodes = [];
  fxMotionNodes = [];
  immersiveFx.innerHTML = "";
  immersiveDecor.innerHTML = "";
  immersiveKeywords.innerHTML = "";

  character.immersiveDecor.forEach((item, index) => {
    const node = document.createElement("article");
    node.className = `decor-card decor-card--${item.kind}`;
    node.style.setProperty("--x", item.x);
    node.style.setProperty("--y", item.y);
    node.style.setProperty("--r", item.r ?? "0deg");
    node.style.setProperty("--w", item.w ?? "220px");
    node.style.setProperty("--delay", `${(index * -0.9).toFixed(1)}s`);

    if (item.fill) {
      node.style.setProperty("--fill", item.fill);
    }

    if (item.kind === "icons") {
      const icons = (item.icons ?? ["ico-star", "ico-wave", "ico-drop", "ico-ring", "ico-star", "ico-wave"])
        .map((icon) => `<i class="${icon}"></i>`)
        .join("");
      node.innerHTML = `
        <span class="decor-label">${item.label}</span>
        <span class="decor-value">${item.value}</span>
        <div class="decor-icon-grid">${icons}</div>
      `;
    } else if (item.kind === "metric") {
      node.innerHTML = `
        <span class="decor-label">${item.label}</span>
        <span class="decor-value">${item.value}</span>
        <div class="decor-bar"><span></span></div>
      `;
    } else if (item.kind === "ring") {
      node.style.setProperty("--ringfill", item.ringFill ?? "86%");
      node.innerHTML = `
        <div class="decor-ring"><b>${item.ringValue ?? "88%"}</b></div>
        <span class="decor-label">${item.label}</span>
        <span class="decor-value">${item.value}</span>
      `;
    } else if (item.kind === "glyph") {
      node.innerHTML = `
        <span class="decor-label">${item.label}</span>
        <span class="decor-value">${item.value}</span>
        <div class="decor-glyph"><i></i><i></i><i></i><i></i></div>
      `;
    } else if (item.kind === "badge") {
      node.innerHTML = `
        <span class="decor-badge-icon">✦</span>
        <span class="decor-label">${item.label}</span>
        <span class="decor-value">${item.value}</span>
      `;
    } else if (item.kind === "quickicons") {
      const icons = (item.icons ?? ["headset", "camera", "sparkle", "plus"])
        .map(
          (icon) =>
            `<span class="quickicon-btn quickicon-${icon}" aria-hidden="true">${getQuickIconSvg(icon)}</span>`
        )
        .join("");
      node.innerHTML = `<div class="quickicon-stack">${icons}</div>`;
    } else {
      node.innerHTML = `<span class="decor-label">${item.label}</span><span class="decor-value">${item.value}</span>`;
    }

    immersiveDecor.append(node);
    decorMotionNodes.push({
      el: node,
      px: item.px ?? (index % 2 === 0 ? 18 : -14),
      py: item.py ?? (index % 2 === 0 ? 9 : -8),
      bob: item.bob ?? 8,
      speed: item.speed ?? 0.8 + index * 0.14,
      rot: item.rot ?? 2.8 + index * 0.6,
      phase: index * 1.47,
    });
  });

  character.immersiveKeywords.forEach((item, index) => {
    const node = document.createElement("span");
    node.className = `immersive-keyword immersive-keyword--${item.size}`;
    node.textContent = item.text;
    node.style.setProperty("--x", item.x);
    node.style.setProperty("--y", item.y);
    node.style.setProperty("--r", item.r ?? "0deg");
    immersiveKeywords.append(node);
    keywordMotionNodes.push({
      el: node,
      px: item.px ?? 10,
      py: item.py ?? -6,
      bob: item.bob ?? 4,
      speed: item.speed ?? 0.7 + index * 0.23,
      rot: item.rot ?? 1.4,
      phase: index * 1.09 + 0.2,
    });
  });

  (character.immersiveFx ?? []).forEach((item, index) => {
    const node = document.createElement("i");
    node.className = `fx-item fx-${item.type}`;
    node.style.setProperty("--x", item.x);
    node.style.setProperty("--y", item.y);
    node.style.setProperty("--size", item.size ?? "14px");
    node.style.setProperty("--opa", String(item.opa ?? 0.7));
    node.style.setProperty("--delay", `${(index * -0.7).toFixed(1)}s`);
    immersiveFx.append(node);
    fxMotionNodes.push({
      el: node,
      px: item.px ?? 12,
      py: item.py ?? -8,
      bob: item.bob ?? 7,
      speed: item.speed ?? 0.85 + index * 0.18,
      rot: item.rot ?? 10,
      phase: index * 1.36 + 0.6,
    });
  });
}

function updateStageTransform() {
  const time = performance.now() * 0.001;
  stageState.scrollVelocity *= 0.92;
  const momentum = clamp(stageState.scrollVelocity, -1.2, 1.2);
  const speedAbs = Math.abs(momentum);
  const swipeShiftMain = swipeState.previewX || 0;
  const swipeShiftSoft = swipeShiftMain * 0.68;
  const swipeShiftStrong = swipeShiftMain * 0.92;
  const swipeFade = clamp(1 - (swipeState.progress || 0) * 0.3, 0.62, 1);

  const baseLift = window.innerWidth >= 2560 ? -12 : 6;
  const translateY = baseLift + stageState.progress * 92 + momentum * 6;
  const scale = 1.1 - stageState.progress * 0.19 + speedAbs * 0.01;
  const rotateX = -stageState.tiltY * 6;
  const rotateY = stageState.tiltX * 8;
  const introOffset = Math.max(0, 56 - stageState.progress * 140);
  const introOpacity = clamp(0.34 + stageState.progress * 1.1, 0, 1);
  const decorOpacity = clamp(1 - stageState.progress * 0.74, 0.16, 1);
  const keywordOpacity = clamp(1 - stageState.progress * 0.84, 0.1, 1);
  const fxOpacity = clamp(1 - stageState.progress * 0.68, 0.22, 1);
  const beamOpacity = clamp(
    (currentScrollFx.beamOpacity ?? 0.62) + speedAbs * 0.24 - stageState.progress * 0.32,
    0.2,
    0.9
  );
  const causticOpacity = clamp(
    (currentScrollFx.causticOpacity ?? 0.34) + speedAbs * 0.14 - stageState.progress * 0.16,
    0.12,
    0.72
  );
  const beamSpread = currentScrollFx.beamSpread ?? 1;
  const beamShift = stageState.progress * 210 - 96 + stageState.tiltX * 34 + momentum * 72;
  const causticX = stageState.tiltX * -18 + Math.sin(time * 0.28 + stageState.progress * 1.1) * 16;
  const causticY = stageState.tiltY * -12 + stageState.progress * 44 + Math.cos(time * 0.24) * 8;

  immersiveCharacterWrap.style.transform =
    `translate3d(calc(-50% + ${swipeShiftStrong.toFixed(2)}px), ${translateY}px, 0) ` +
    `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
  immersiveWord.style.transform = `translate(calc(-50% + ${swipeShiftMain.toFixed(2)}px), -50%)`;
  immersiveWord.style.opacity = String(clamp(1 - stageState.progress * 1.2, 0.14, 1) * swipeFade);
  immersiveIntroCard.style.transform = `translate3d(${swipeShiftSoft.toFixed(2)}px, ${introOffset}px, 0)`;
  immersiveIntroCard.style.opacity = String(introOpacity * swipeFade);
  immersiveThemeTag.style.transform = `translate3d(${(swipeShiftSoft * 0.62).toFixed(2)}px, 0, 0)`;
  immersiveThemeTag.style.opacity = String(0.84 * swipeFade);
  if (characterQuickDots) {
    const shouldHideQuickDots = stageState.progress > 0.065 || speedAbs > 0.18;
    characterQuickDots.classList.toggle("is-hidden", shouldHideQuickDots);
  }
  immersiveMotto.style.transform = `translate3d(${(stageState.tiltX * -9 + swipeShiftSoft).toFixed(2)}px, ${(
    stageState.tiltY * -6 +
    Math.sin(time * 0.9) * 1.8 +
    momentum * 3
  ).toFixed(2)}px, 0)`;
  immersiveMotto.style.opacity = String(clamp(0.92 - stageState.progress * 0.76, 0.24, 0.92) * swipeFade);
  immersiveSignature.style.transform = `translate3d(${(stageState.tiltX * 8 + swipeShiftSoft).toFixed(2)}px, ${(
    stageState.tiltY * 9 +
    Math.cos(time * 0.82) * 2.6 +
    momentum * 4
  ).toFixed(2)}px, 0) rotate(${(-2 + stageState.tiltX * 2.2).toFixed(2)}deg)`;
  immersiveSignature.style.opacity = String(clamp(0.82 - stageState.progress * 0.78, 0.2, 0.82) * swipeFade);
  immersiveDecor.style.opacity = String(decorOpacity * swipeFade);
  immersiveDecor.style.transform = `translate3d(${(swipeShiftSoft * 0.74).toFixed(2)}px, 0, 0)`;
  immersiveKeywords.style.opacity = String(keywordOpacity * swipeFade);
  immersiveKeywords.style.transform = `translate3d(${(swipeShiftSoft * 0.84).toFixed(2)}px, 0, 0)`;
  immersiveFx.style.opacity = String(fxOpacity * swipeFade);
  immersiveFx.style.transform = `translate3d(${(swipeShiftSoft * 0.92).toFixed(2)}px, 0, 0)`;
  immersiveBeams.style.opacity = String(beamOpacity);
  immersiveBeams.style.setProperty("--beam-shift", `${beamShift.toFixed(2)}px`);
  immersiveBeams.style.setProperty("--beam-spread", `${beamSpread}`);
  immersiveCaustics.style.opacity = String(causticOpacity);
  immersiveCaustics.style.setProperty("--caustic-x", `${causticX.toFixed(2)}px`);
  immersiveCaustics.style.setProperty("--caustic-y", `${causticY.toFixed(2)}px`);

  decorMotionNodes.forEach((item, index) => {
    const bob = Math.sin(time * item.speed + item.phase) * item.bob;
    const tx = stageState.tiltX * item.px * (1 - stageState.progress * 0.28);
    const ty = stageState.tiltY * item.py * (1 - stageState.progress * 0.21) + bob;
    const rot = stageState.tiltX * item.rot + Math.sin(time * item.speed * 0.7 + item.phase) * 1.3;
    const sc = 1 - stageState.progress * (0.03 + index * 0.004);
    item.el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    item.el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
    item.el.style.setProperty("--rot", `${rot.toFixed(2)}deg`);
    item.el.style.setProperty("--sc", `${sc.toFixed(3)}`);
  });

  keywordMotionNodes.forEach((item, index) => {
    const bob = Math.sin(time * item.speed + item.phase) * item.bob;
    const tx = stageState.tiltX * item.px * (1 - stageState.progress * 0.36);
    const ty = stageState.tiltY * item.py * (1 - stageState.progress * 0.24) + bob;
    const rot = stageState.tiltX * item.rot + Math.cos(time * item.speed * 0.8 + item.phase) * 0.8;
    const opacity = clamp(0.92 - stageState.progress * 0.9 - index * 0.08, 0.22, 1);
    item.el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    item.el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
    item.el.style.setProperty("--rot", `${rot.toFixed(2)}deg`);
    item.el.style.opacity = String(opacity);
  });

  fxMotionNodes.forEach((item, index) => {
    const bob = Math.sin(time * item.speed + item.phase) * item.bob;
    const tx = stageState.tiltX * item.px * (1 - stageState.progress * 0.2);
    const ty = stageState.tiltY * item.py * (1 - stageState.progress * 0.2) + bob + stageState.progress * 16;
    const rot = stageState.tiltX * item.rot + Math.sin(time * item.speed * 0.92 + item.phase) * item.rot;
    const opacity = clamp(0.94 - stageState.progress * 0.72 - index * 0.04, 0.2, 1);
    item.el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    item.el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
    item.el.style.setProperty("--rot", `${rot.toFixed(2)}deg`);
    item.el.style.opacity = String(opacity);
  });
}

function handlePageScroll() {
  const now = performance.now();
  const currentY = window.scrollY;
  const dt = Math.max(16, now - lastScrollTime);
  const dy = currentY - lastScrollY;
  const velocity = clamp((dy / dt) * 0.18, -1.2, 1.2);
  stageState.scrollVelocity = stageState.scrollVelocity * 0.72 + velocity * 0.28;
  lastScrollY = currentY;
  lastScrollTime = now;

  const stageTop = immersiveStage.offsetTop;
  const maxScroll = Math.max(1, immersiveStage.offsetHeight - window.innerHeight);
  stageState.progress = clamp((currentY - stageTop) / maxScroll, 0, 1);
  updateStageTransform();
}

function handlePointerMove(event) {
  const rect = immersivePin.getBoundingClientRect();
  const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

  stageState.tiltX = clamp(nx, -1, 1);
  stageState.tiltY = clamp(ny, -1, 1);
  particlePointer.x = event.clientX - rect.left;
  particlePointer.y = event.clientY - rect.top;
  particlePointer.active = true;
  updateStageTransform();
}

function resetPointerTilt() {
  stageState.tiltX = 0;
  stageState.tiltY = 0;
  particlePointer.active = false;
  updateStageTransform();
}

function buildParticles() {
  if (!particleCanvas) {
    return;
  }
  const width = particleCanvas.width;
  const height = particleCanvas.height;
  const count = clamp(Math.round((width * height) / 28000), 48, 110);

  particles = Array.from({ length: count }).map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.34,
    vy: (Math.random() - 0.5) * 0.34,
    radius: 0.8 + Math.random() * 2.6,
    depth: 0.55 + Math.random() * 1.2,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

function resizeParticles() {
  if (!particleCanvas) {
    return;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = particleCanvas.getBoundingClientRect();
  particleCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  particleCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  particleCtx = particleCanvas.getContext("2d");
  if (particleCtx) {
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  buildParticles();
}

function animateParticles() {
  if (!particleCtx) {
    return;
  }
  updateStageTransform();
  const momentum = clamp(stageState.scrollVelocity, -1.2, 1.2);
  const speedAbs = Math.abs(momentum);
  const driftScale = 1 + speedAbs * 1.6;
  const width = particleCanvas.clientWidth;
  const height = particleCanvas.clientHeight;
  const time = performance.now() * 0.001;

  particleCtx.clearRect(0, 0, width, height);

  particles.forEach((particle) => {
    const prevX = particle.x;
    const prevY = particle.y;
    particle.x += particle.vx * particle.depth * driftScale + stageState.tiltX * 0.2 * particle.depth;
    particle.y += (particle.vy + momentum * 0.95) * particle.depth * driftScale;

    if (particlePointer.active) {
      const dx = particlePointer.x - particle.x;
      const dy = particlePointer.y - particle.y;
      particle.x += dx * 0.001 * particle.depth;
      particle.y += dy * 0.001 * particle.depth;
    }

    if (particle.x < -8) particle.x = width + 8;
    if (particle.x > width + 8) particle.x = -8;
    if (particle.y < -8) particle.y = height + 8;
    if (particle.y > height + 8) particle.y = -8;

    const alpha = (0.15 + (Math.sin(time * 1.7 + particle.twinkle) * 0.5 + 0.5) * 0.32) / 1.2;
    particleCtx.fillStyle = `rgba(${particleColor[0]}, ${particleColor[1]}, ${particleColor[2]}, ${
      alpha * particle.depth
    })`;
    particleCtx.beginPath();
    particleCtx.arc(particle.x, particle.y, particle.radius * particle.depth, 0, Math.PI * 2);
    particleCtx.fill();

    if (speedAbs > 0.3) {
      particleCtx.strokeStyle = `rgba(${particleColor[0]}, ${particleColor[1]}, ${particleColor[2]}, ${
        0.08 * particle.depth * speedAbs
      })`;
      particleCtx.lineWidth = Math.max(0.4, 0.7 * particle.depth);
      particleCtx.beginPath();
      particleCtx.moveTo(prevX, prevY);
      particleCtx.lineTo(particle.x, particle.y);
      particleCtx.stroke();
    }
  });

  particleFrame = window.requestAnimationFrame(animateParticles);
}

function startParticles() {
  if (prefersReducedMotion) {
    return;
  }
  resizeParticles();
  window.cancelAnimationFrame(particleFrame);
  particleFrame = window.requestAnimationFrame(animateParticles);
}

function renderCharacter(character, options = {}) {
  const direction = options.direction ?? 0;
  const shouldAnimate = options.animate ?? true;
  const sceneBlend = options.sceneBlend ?? false;
  const swapToken = ++heroSwapToken;
  const travelX = getDirectionalOffset(direction, sceneBlend ? 22 : 30);
  const hasExistingHero = Boolean(heroImage.getAttribute("src"));
  const useMotion = hasExistingHero && shouldAnimate && !prefersReducedMotion;
  const outDuration = sceneBlend ? 200 : 210;
  const swapDelay = sceneBlend ? 24 : 200;
  const inDuration = sceneBlend ? 360 : 420;

  if (useMotion) {
    heroImage.getAnimations().forEach((animation) => animation.cancel());
    heroImage.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        {
          opacity: 0.08,
          transform: `translate3d(${travelX}px, 0, 0) scale(0.98)`,
        },
      ],
      {
        duration: outDuration,
        easing: sceneBlend ? "cubic-bezier(0.32, 0.02, 0.21, 1)" : "cubic-bezier(0.45, 0, 0.2, 1)",
        fill: "forwards",
      }
    );
  }

  window.setTimeout(() => {
    if (swapToken !== heroSwapToken) {
      return;
    }
    heroImage.src = character.heroImage;
    heroImage.alt = `${character.displayName} hero image`;
    if (useMotion) {
      heroImage.getAnimations().forEach((animation) => animation.cancel());
      heroImage.animate(
        [
          {
            opacity: 0,
            transform: `translate3d(${-travelX * 0.68}px, 0, 0) scale(1.02)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: inDuration,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
          fill: "forwards",
        }
      );
    }
  }, useMotion ? swapDelay : 0);

  heroElement.textContent = character.element;
  heroName.textContent = character.displayName;
  heroTitle.textContent = character.title;
  heroDescription.textContent = character.description;
  profileHeading.textContent = `${character.displayName} Profile`;
  profileText.textContent = character.profileText;

  renderStats(character.stats);
  renderPills(character.pills);
  renderSnapshot(character);
}

function renderImmersiveCharacter(character, options = {}) {
  const direction = options.direction ?? 0;
  const shouldAnimate = options.animate ?? true;
  const sceneBlend = options.sceneBlend ?? false;
  const swapToken = ++immersiveSwapToken;
  const travelX = getDirectionalOffset(direction, sceneBlend ? 24 : 40);
  const hasExistingImmersive =
    Boolean(immersiveImage.getAttribute("src")) || Boolean(immersiveBackdrop.getAttribute("src"));
  const useMotion = hasExistingImmersive && shouldAnimate && !prefersReducedMotion;
  const outDuration = sceneBlend ? 190 : 240;
  const swapDelay = sceneBlend ? 24 : 200;
  const inDuration = sceneBlend ? 360 : 460;

  currentScrollFx = character.scrollFx ?? { beamOpacity: 0.62, causticOpacity: 0.34, beamSpread: 1 };
  immersiveThemeTag.textContent = character.immersiveKicker;
  immersiveWord.textContent = character.immersiveWord;
  immersiveWord.setAttribute("data-text", character.immersiveWord);
  immersiveMotto.textContent = character.typography?.motto ?? "Court of Fontaine • The Stage Never Sleeps";
  immersiveSignature.textContent = character.typography?.signature ?? "Salon Solitaire";
  renderImmersiveDecor(character);
  immersiveIntroTitle.textContent = character.immersiveIntroTitle;
  immersiveIntroBody.textContent = character.immersiveIntroBody;
  immersiveDetailKicker.textContent = `${character.displayName} Dossier`;
  immersiveDetailHeading.textContent = character.immersiveDetailHeading;
  immersiveLoreText.textContent = character.immersiveLore;
  const renderSupplementalContent = () => {
    if (swapToken !== immersiveSwapToken) {
      return;
    }
    renderImmersiveStats(character.stats);
    renderGallery(character.gallery, character.displayName, immersiveGalleryGrid);
    handlePageScroll();
  };
  window.requestAnimationFrame(renderSupplementalContent);

  if (!useMotion) {
    immersiveBackdrop.src = character.immersiveBackdrop;
    immersiveBackdrop.alt = `${character.displayName} cinematic backdrop`;
    immersiveImage.src = character.immersiveImage;
    immersiveImage.alt = `${character.displayName} immersive image`;
    return;
  }

  immersiveImage.getAnimations().forEach((animation) => animation.cancel());
  immersiveBackdrop.getAnimations().forEach((animation) => animation.cancel());

  if (!sceneBlend) {
    immersiveImage.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        {
          opacity: 0.06,
          transform: `translate3d(${travelX}px, 0, 0) scale(0.97)`,
        },
      ],
      {
        duration: outDuration,
        easing: "cubic-bezier(0.45, 0, 0.2, 1)",
        fill: "forwards",
      }
    );

    immersiveBackdrop.animate(
      [
        { opacity: 0.36, transform: "translate3d(0, 0, 0) scale(1.03)" },
        {
          opacity: 0.12,
          transform: `translate3d(${travelX * 0.24}px, 0, 0) scale(1.06)`,
        },
      ],
      {
        duration: outDuration,
        easing: "cubic-bezier(0.45, 0, 0.2, 1)",
        fill: "forwards",
      }
    );

    window.setTimeout(() => {
      if (swapToken !== immersiveSwapToken) {
        return;
      }

      immersiveBackdrop.src = character.immersiveBackdrop;
      immersiveBackdrop.alt = `${character.displayName} cinematic backdrop`;
      immersiveImage.src = character.immersiveImage;
      immersiveImage.alt = `${character.displayName} immersive image`;

      immersiveImage.getAnimations().forEach((animation) => animation.cancel());
      immersiveBackdrop.getAnimations().forEach((animation) => animation.cancel());

      immersiveImage.animate(
        [
          {
            opacity: 0,
            transform: `translate3d(${-travelX * 0.66}px, 0, 0) scale(1.02)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: inDuration,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
          fill: "forwards",
        }
      );

      immersiveBackdrop.animate(
        [
          {
            opacity: 0.14,
            transform: `translate3d(${-travelX * 0.22}px, 0, 0) scale(1.06)`,
          },
          { opacity: 0.36, transform: "translate3d(0, 0, 0) scale(1.03)" },
        ],
        {
          duration: inDuration,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
          fill: "forwards",
        }
      );
    }, swapDelay);
    return;
  }

  const imageClone = immersiveImage.cloneNode(true);
  imageClone.removeAttribute("id");
  imageClone.setAttribute("aria-hidden", "true");
  imageClone.style.position = "absolute";
  imageClone.style.inset = "0";
  imageClone.style.width = "100%";
  imageClone.style.maxHeight = "85vh";
  imageClone.style.objectFit = "contain";
  imageClone.style.pointerEvents = "none";
  imageClone.style.willChange = "transform, opacity";
  imageClone.style.opacity = "0.12";
  imageClone.style.transform = `translate3d(${-travelX * 0.54}px, 0, 0) scale(1.02)`;
  imageClone.src = character.immersiveImage;
  imageClone.alt = `${character.displayName} immersive image`;

  const backdropClone = immersiveBackdrop.cloneNode(true);
  backdropClone.removeAttribute("id");
  backdropClone.setAttribute("aria-hidden", "true");
  backdropClone.style.pointerEvents = "none";
  backdropClone.style.willChange = "transform, opacity";
  backdropClone.style.opacity = "0.16";
  backdropClone.style.transform = `translate3d(${-travelX * 0.2}px, 0, 0) scale(1.06)`;
  backdropClone.src = character.immersiveBackdrop;
  backdropClone.alt = `${character.displayName} cinematic backdrop`;

  immersiveCharacterWrap.append(imageClone);
  immersiveBackdrop.parentElement?.append(backdropClone);

  const oldImageOut = immersiveImage.animate(
    [
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0 },
      {
        opacity: 0.42,
        transform: `translate3d(${travelX * 0.58}px, 0, 0) scale(0.985)`,
        offset: 0.62,
      },
      {
        opacity: 0.02,
        transform: `translate3d(${travelX}px, 0, 0) scale(0.96)`,
        offset: 1,
      },
    ],
    {
      duration: outDuration,
      easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      fill: "forwards",
    }
  );

  const oldBackdropOut = immersiveBackdrop.animate(
    [
      { opacity: 0.36, transform: "translate3d(0, 0, 0) scale(1.03)", offset: 0 },
      {
        opacity: 0.18,
        transform: `translate3d(${travelX * 0.16}px, 0, 0) scale(1.045)`,
        offset: 0.58,
      },
      {
        opacity: 0.08,
        transform: `translate3d(${travelX * 0.24}px, 0, 0) scale(1.06)`,
        offset: 1,
      },
    ],
    {
      duration: outDuration,
      easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      fill: "forwards",
    }
  );

  const newImageIn = imageClone.animate(
    [
      {
        opacity: 0,
        transform: `translate3d(${-travelX * 0.82}px, 0, 0) scale(1.03)`,
        offset: 0,
      },
      {
        opacity: 0.58,
        transform: `translate3d(${-travelX * 0.36}px, 0, 0) scale(1.012)`,
        offset: 0.52,
      },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 1 },
    ],
    {
      duration: inDuration,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      fill: "forwards",
    }
  );

  const newBackdropIn = backdropClone.animate(
    [
      {
        opacity: 0.08,
        transform: `translate3d(${-travelX * 0.28}px, 0, 0) scale(1.08)`,
        offset: 0,
      },
      {
        opacity: 0.26,
        transform: `translate3d(${-travelX * 0.12}px, 0, 0) scale(1.05)`,
        offset: 0.5,
      },
      { opacity: 0.36, transform: "translate3d(0, 0, 0) scale(1.03)", offset: 1 },
    ],
    {
      duration: inDuration,
      easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      fill: "forwards",
    }
  );

  Promise.allSettled([
    oldImageOut.finished,
    oldBackdropOut.finished,
    newImageIn.finished,
    newBackdropIn.finished,
  ]).then(() => {
    imageClone.remove();
    backdropClone.remove();
    immersiveImage.getAnimations().forEach((animation) => animation.cancel());
    immersiveBackdrop.getAnimations().forEach((animation) => animation.cancel());
    immersiveImage.style.opacity = "1";
    immersiveImage.style.transform = "";
    immersiveBackdrop.style.opacity = "";
    immersiveBackdrop.style.transform = "";

    if (swapToken !== immersiveSwapToken) {
      return;
    }

    immersiveBackdrop.src = character.immersiveBackdrop;
    immersiveBackdrop.alt = `${character.displayName} cinematic backdrop`;
    immersiveImage.src = character.immersiveImage;
    immersiveImage.alt = `${character.displayName} immersive image`;
  });
}

function applyCharacterThemeImmediate(id, options = {}) {
  const character = getCharacterById(id);
  if (!character) {
    return;
  }
  const direction = options.direction ?? 0;
  const animate = options.animate ?? true;
  const sceneBlend = options.sceneBlend ?? false;

  currentCharacterId = id;
  root.classList.remove(...themeClassNames);
  root.classList.add(`theme-${id}`);
  applyTypographyTokens(character);

  renderCharacter(character, { direction, animate, sceneBlend });
  renderImmersiveCharacter(character, { direction, animate, sceneBlend });
  setActiveMenuCharacter(id);
  setActiveQuickCharacter(id);

  const rgbFromTheme = parseCssRgb(
    window.getComputedStyle(root).getPropertyValue("--particle-rgb")
  );
  particleColor = rgbFromTheme;
}

function flushQueuedTransition() {
  if (transitionState.inProgress || !transitionState.queued) {
    return;
  }
  const queued = transitionState.queued;
  transitionState.queued = null;
  applyCharacterTheme(queued.id, queued.options);
}

async function applyCharacterTheme(id, options = {}) {
  const character = getCharacterById(id);
  if (!character) {
    return;
  }
  const direction = options.direction ?? getSwitchDirectionTo(id) ?? 0;

  if (id === currentCharacterId && root.classList.contains(`theme-${id}`)) {
    setActiveMenuCharacter(id);
    setActiveQuickCharacter(id);
    return;
  }

  if (transitionState.inProgress) {
    transitionState.queued = { id, options: { ...options, direction } };
    return;
  }

  transitionState.inProgress = true;
  try {
    await preloadCharacterAssets(id);
    const shouldUseSceneTransition =
      options.sceneTransition !== false &&
      options.animate !== false &&
      !prefersReducedMotion &&
      Boolean(immersiveScene);

    const shouldUseWebGL =
      webglTransitionEnabled &&
      !shouldUseSceneTransition &&
      options.preferWebGL !== false &&
      options.animate !== false &&
      !prefersReducedMotion;

    if (shouldUseSceneTransition) {
      await playSceneSwipeTransition(direction, () => {
        applyCharacterThemeImmediate(id, { direction, animate: true, sceneBlend: true });
      });
    } else if (shouldUseWebGL && getCharacterById(currentCharacterId)) {
      const transitionImages = await getTransitionImages(currentCharacterId, id);
      if (transitionImages) {
        await transitionEngine.playTransition({
          fromImage: transitionImages.fromImage,
          toImage: transitionImages.toImage,
          direction,
          duration: options.duration ?? 760,
          onCommit: () => {
            applyCharacterThemeImmediate(id, { direction, animate: false });
          },
        });
      } else {
        applyCharacterThemeImmediate(id, { direction, animate: true });
      }
    } else {
      applyCharacterThemeImmediate(id, { direction, animate: options.animate ?? true });
    }

    prewarmAdjacentCharacters(id);
  } finally {
    transitionState.inProgress = false;
    flushQueuedTransition();
  }
}

renderCharacterMenu();
renderCharacterQuickDots();
initCharacterMenuInteractions();
initCharacterQuickDotsInteractions();
initCharacterSwipeInteractions();
initSectionMoodTransition();
terminalExperience.init();

immersivePin.addEventListener("mousemove", handlePointerMove);
immersivePin.addEventListener("mouseleave", resetPointerTilt);
window.addEventListener("scroll", handlePageScroll, { passive: true });
window.addEventListener("resize", () => {
  resizeParticles();
  handlePageScroll();
  terminalExperience.handleResize();
});

applyCharacterThemeImmediate(currentCharacterId, { animate: false });
preloadCharacterAssets(currentCharacterId);
prewarmAdjacentCharacters(currentCharacterId);
updateStageTransform();
startParticles();
