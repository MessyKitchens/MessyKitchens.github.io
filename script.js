const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Sticky header: solid once the page scrolls, brand once the hero title is gone,
// and the link for the section currently in view highlighted.
const header = document.querySelector('.site-header');
const heroTitle = document.querySelector('.hero-title');
const nav = document.querySelector('.site-nav');
const navItems = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'))
  .map(link => {
    const target = document.querySelector(link.getAttribute('href'));
    return target ? { link, section: target.closest('section') || target } : null;
  })
  .filter(Boolean);

let activeLink = null;

const setActiveLink = link => {
  if (link === activeLink) return;
  activeLink = link;
  navItems.forEach(item => {
    const isActive = item.link === link;
    item.link.classList.toggle('is-active', isActive);
    if (isActive) item.link.setAttribute('aria-current', 'location');
    else item.link.removeAttribute('aria-current');
  });
  // On narrow screens the nav scrolls sideways; keep the active link in view.
  if (link && nav && nav.scrollWidth > nav.clientWidth) {
    const left = link.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + link.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: left - 12, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
  }
};

const updateHeader = () => {
  if (!header) return;
  const headerHeight = header.offsetHeight;
  header.classList.toggle('is-scrolled', window.scrollY > 8);
  if (heroTitle) {
    header.classList.toggle('show-brand', heroTitle.getBoundingClientRect().bottom < headerHeight);
  }

  let current = null;
  const line = headerHeight + window.innerHeight * 0.3;
  navItems.forEach(item => {
    if (item.section.getBoundingClientRect().top <= line) current = item;
  });
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atBottom && navItems.length) current = navItems[navItems.length - 1];
  setActiveLink(current ? current.link : null);
};

let headerFrame = 0;
const scheduleHeaderUpdate = () => {
  if (headerFrame) return;
  headerFrame = requestAnimationFrame(() => {
    headerFrame = 0;
    updateHeader();
  });
};
window.addEventListener('scroll', scheduleHeaderUpdate, { passive: true });
window.addEventListener('resize', scheduleHeaderUpdate);
updateHeader();

// Demo videos play only while on screen (and never with reduced motion),
// so they don't compete with the rest of the page for bandwidth.
const visibleVideos = new WeakSet();

const playIfVisible = video => {
  if (visibleVideos.has(video) && !reduceMotion.matches) {
    video.play().catch(() => {});
  }
};

const videoObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          visibleVideos.add(target);
          playIfVisible(target);
        } else {
          visibleVideos.delete(target);
          if (!target.paused) target.pause();
        }
      });
    }, { threshold: 0.35 })
  : null;

const swapImage = (image, src, alt) => {
  if (!image || !src) return;
  image.classList.add('is-loading');
  const settle = () => image.classList.remove('is-loading');
  image.addEventListener('load', settle, { once: true });
  image.addEventListener('error', settle, { once: true });
  image.src = src;
  image.alt = alt || '';
};

// Viewers: each tab swaps the photo and its video, and announces the selection
// (as a `viewer:select` event) to the 3D scene and comparison slider in the viewer.
document.querySelectorAll('[data-viewer]').forEach(viewer => {
  const image = viewer.querySelector('[data-viewer-image]');
  const video = viewer.querySelector('[data-viewer-video]');
  const tabs = Array.from(viewer.querySelectorAll('.viewer-tab'));
  if (!tabs.length) return;

  if (video) {
    if (reduceMotion.matches) video.controls = true;
    if (videoObserver) videoObserver.observe(video);
  }

  const select = tab => {
    if (tab.classList.contains('is-active')) return;
    const data = tab.dataset;

    swapImage(image, data.image, data.alt);
    if (video && data.video) {
      video.poster = data.poster || '';
      video.src = data.video;
      playIfVisible(video);
    }

    tabs.forEach(other => {
      const isActive = other === tab;
      other.classList.toggle('is-active', isActive);
      other.setAttribute('aria-pressed', String(isActive));
    });
    viewer.dispatchEvent(new CustomEvent('viewer:select', { detail: { ...data } }));
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : tabs.length - 1;
      const next = tabs[(index + step) % tabs.length];
      next.focus();
      select(next);
    });
  });
});

// SAM 3D / MOD comparison slider. MOD is shown left of the divider.
// Mouse and pen drag from anywhere; touch drags sideways (vertical swipes still scroll).
document.querySelectorAll('[data-compare]').forEach(slider => {
  const before = slider.querySelector('[data-compare-before]');
  const after = slider.querySelector('[data-compare-after]');
  let position = 50;

  const setPosition = value => {
    position = Math.min(100, Math.max(0, value));
    const rounded = Math.round(position);
    slider.style.setProperty('--pos', `${position}%`);
    slider.setAttribute('aria-valuenow', String(rounded));
    slider.setAttribute('aria-valuetext', `${rounded}% MOD`);
    slider.classList.toggle('hide-left-tag', position < 12);
    slider.classList.toggle('hide-right-tag', position > 88);
  };

  const followPointer = event => {
    const rect = slider.getBoundingClientRect();
    if (rect.width) setPosition(((event.clientX - rect.left) / rect.width) * 100);
  };

  slider.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    slider.setPointerCapture(event.pointerId);
    slider.classList.add('is-dragging');
    if (event.pointerType !== 'touch') followPointer(event);
  });
  slider.addEventListener('pointermove', event => {
    if (slider.hasPointerCapture(event.pointerId)) followPointer(event);
  });
  const endDrag = event => {
    slider.classList.remove('is-dragging');
    if (slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
  };
  slider.addEventListener('pointerup', endDrag);
  slider.addEventListener('pointercancel', endDrag);

  slider.addEventListener('keydown', event => {
    const step = event.shiftKey ? 10 : 2;
    const moves = {
      ArrowLeft: position - step,
      ArrowDown: position - step,
      ArrowRight: position + step,
      ArrowUp: position + step,
      PageDown: position - 10,
      PageUp: position + 10,
      Home: 0,
      End: 100,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setPosition(moves[event.key]);
  });

  slider.closest('[data-viewer]')?.addEventListener('viewer:select', ({ detail }) => {
    swapImage(before, detail.before, detail.beforeAlt);
    swapImage(after, detail.after, detail.afterAlt);
    setPosition(50);
  });

  setPosition(50);
});

// Interactive 3D scenes: three.js r128 with its PLY loader and trackball controls,
// fetched only when a scene viewer comes near the screen.
const THREE_SCRIPTS = [
  ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu'],
  ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/PLYLoader.js', 'sha384-TRjDrMoP2Iw2zIithJ7Pm10f16V6yXxbUwTEYL5urkonr6Zr+xZ2WDOj2ONVpnSd'],
  ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TrackballControls.js', 'sha384-hf3oVtegKGVgPlVvpd9Lg2YX9MGMmV/Dn9iSbKOeIAvzwL2L3WLK4RWf7QNkNrfJ'],
];

const loadScript = ([src, integrity]) => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = src;
  script.integrity = integrity;
  script.crossOrigin = 'anonymous';
  script.onload = resolve;
  script.onerror = () => reject(new Error(`Could not load ${src}`));
  document.head.appendChild(script);
});

let threeReady = null;
const loadThree = () => {
  threeReady = threeReady || loadScript(THREE_SCRIPTS[0])
    .then(() => Promise.all(THREE_SCRIPTS.slice(1).map(loadScript)))
    .catch(error => {
      threeReady = null;
      throw error;
    });
  return threeReady;
};

const formatMegabytes = bytes => `${(bytes / 1048576).toFixed(1)} MB`;

// Renderer, lights, material and camera fit follow the original PLY viewer.
const createSceneViewer = (container, ui) => {
  const canvas = container.querySelector('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xf0ede8, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.001, 1000);
  camera.position.set(0, 0.5, 3);

  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const sun = new THREE.DirectionalLight(0xfff5ee, 0.9);
  sun.position.set(22, 4, 53);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xccd5ff, 0.4);
  fill.position.set(-33, 1, -52);
  scene.add(fill);

  // Draw only when something changed, and only while the viewer is on screen.
  let needsRender = true;
  let frame = 0;

  // TrackballControls keeps spin momentum through reset(), so a fresh instance
  // is created whenever the view goes back to its starting pose.
  const makeControls = (enabled = true) => {
    const next = new THREE.TrackballControls(camera, renderer.domElement);
    next.rotateSpeed = 3.5;
    next.zoomSpeed = 1.2;
    next.panSpeed = 0.8;
    next.staticMoving = reduceMotion.matches;
    next.dynamicDampingFactor = 0.08;
    next.minDistance = 0.1;
    next.maxDistance = 50;
    next.enabled = enabled;
    next.addEventListener('change', () => { needsRender = true; });
    return next;
  };
  let controls = makeControls();
  let home = null;

  const tick = () => {
    frame = requestAnimationFrame(tick);
    controls.update();
    if (needsRender) {
      needsRender = false;
      renderer.render(scene, camera);
    }
  };
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !frame) {
      needsRender = true;
      frame = requestAnimationFrame(tick);
    } else if (!entry.isIntersecting && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }).observe(container);

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    controls.handleResize();
    needsRender = true;
  };
  resize();
  new ResizeObserver(resize).observe(container);

  const makeMesh = geometry => {
    geometry.computeBoundingBox();
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const hasColor = Boolean(geometry.attributes.color);
    return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: hasColor ? 0xffffff : 0x8f8f8f,
      vertexColors: hasColor,
      metalness: 0.05,
      roughness: 0.98,
    }));
  };

  const reset = () => {
    if (!home) return;
    const { enabled } = controls;
    controls.dispose();
    camera.position.copy(home.position);
    camera.up.set(0, 1, 0);
    controls = makeControls(enabled);
    controls.target.copy(home.target);
    controls.minDistance = home.minDistance;
    controls.maxDistance = home.maxDistance;
    controls.update();
    needsRender = true;
  };

  const fitCamera = object => {
    const box = new THREE.Box3().setFromObject(object);
    home = { position: new THREE.Vector3(0, 0.5, 3), target: new THREE.Vector3(), minDistance: 0.1, maxDistance: 50 };
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fovRad = camera.fov * Math.PI / 180;
      const dist = (maxDim / 2) / Math.tan(fovRad / 2) * 1.10;

      camera.near = Math.max(dist / 100, 0.001);
      camera.far = Math.max(dist * 100, 10);
      camera.updateProjectionMatrix();
      home = {
        position: new THREE.Vector3(0, maxDim * 0.2, dist),
        target: new THREE.Vector3(),
        minDistance: Math.max(dist * 0.05, 0.01),
        maxDistance: dist * 8,
      };
    }
    reset();
  };

  const loader = new THREE.PLYLoader();
  let current = null;
  let requested = null;

  const disposeCurrent = () => {
    if (!current) return;
    scene.remove(current);
    current.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    current = null;
    needsRender = true;
  };

  const load = url => {
    if (!url || url === requested) return;
    requested = url;
    disposeCurrent();
    ui.loading('Loading 3D scene…');

    loader.load(
      url,
      geometry => {
        if (url !== requested) {
          geometry.dispose();
          return;
        }
        current = new THREE.Group();
        current.add(makeMesh(geometry));
        scene.add(current);
        fitCamera(current);
        ui.ready();
      },
      progress => {
        if (url !== requested) return;
        ui.loading(progress.total > 0
          ? `Loading 3D scene… ${Math.round((progress.loaded / progress.total) * 100)}%`
          : `Loading 3D scene… ${formatMegabytes(progress.loaded)}`);
      },
      () => {
        if (url !== requested) return;
        requested = null; // selecting the scene again retries
        ui.error('This 3D scene could not be loaded. Select it again to retry.');
      },
    );
  };

  return {
    get controls() { return controls; },
    load,
    reset,
  };
};

document.querySelectorAll('[data-scene3d]').forEach(container => {
  const viewer = container.closest('[data-viewer]');
  const statusBox = container.querySelector('[data-scene3d-status]');
  const statusText = container.querySelector('[data-scene3d-status-text]');
  const hint = container.querySelector('[data-scene3d-hint]');
  const resetButton = container.querySelector('[data-scene3d-reset]');
  const activateButton = container.querySelector('[data-scene3d-activate]');
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  let sceneViewer = null;
  let currentUrl = viewer?.querySelector('.viewer-tab.is-active')?.dataset.ply || '';
  let ready = false;

  hint.textContent = coarsePointer
    ? 'Drag to rotate · Pinch to zoom'
    : 'Drag to rotate · Scroll to zoom · Right-drag to pan';

  // On touch screens a finger on the scene scrolls the page until the viewer is
  // activated, so the 3D view never traps scrolling.
  let gated = coarsePointer;
  const syncGate = () => {
    container.classList.toggle('is-gated', gated);
    activateButton.hidden = !(gated && ready);
    if (sceneViewer) sceneViewer.controls.enabled = !gated;
  };
  activateButton.addEventListener('click', () => {
    gated = false;
    syncGate();
  });
  if (coarsePointer) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !gated) {
        gated = true;
        syncGate();
      }
    }).observe(container);
  }

  const setStatus = (text, state) => {
    ready = false;
    statusText.textContent = text;
    statusBox.classList.remove('is-hidden', 'is-idle', 'is-error');
    if (state) statusBox.classList.add(state);
    resetButton.hidden = true;
    hint.hidden = true;
    syncGate();
  };
  const ui = {
    loading: text => setStatus(text),
    error: text => setStatus(text, 'is-error'),
    ready: () => {
      ready = true;
      statusBox.classList.add('is-hidden');
      resetButton.hidden = false;
      hint.hidden = false;
      syncGate();
    },
  };

  // Mouse wheel: zoom the scene, except while the page itself is scrolling past it.
  let lastPageScroll = 0;
  let engaged = false;
  window.addEventListener('scroll', () => { lastPageScroll = performance.now(); }, { passive: true });
  container.addEventListener('pointerdown', event => {
    if (event.target !== container.querySelector('canvas') || gated) return;
    engaged = true;
    container.classList.add('has-interacted');
    sceneViewer?.controls.handleResize(); // the page may have shifted since the last resize
  }, true);
  container.addEventListener('pointerleave', () => { engaged = false; });
  container.addEventListener('wheel', event => {
    if (!engaged && !event.ctrlKey && !event.metaKey && performance.now() - lastPageScroll < 400) {
      event.stopPropagation(); // keeps the event from the controls; the page scrolls on
      return;
    }
    if (ready) container.classList.add('has-interacted');
  }, { capture: true, passive: true });

  resetButton.addEventListener('click', () => sceneViewer?.reset());

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    ui.loading('Loading 3D viewer…');
    loadThree()
      .then(() => {
        sceneViewer = createSceneViewer(container, ui);
        if (!sceneViewer) {
          ui.error('3D view is not available in this browser.');
          return;
        }
        syncGate();
        sceneViewer.load(currentUrl);
      })
      .catch(() => {
        started = false;
        ui.error('The 3D viewer could not be loaded. Select a scene to retry.');
      });
  };

  if ('IntersectionObserver' in window) {
    const nearObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        nearObserver.disconnect();
        start();
      }
    }, { rootMargin: '600px 0px' });
    nearObserver.observe(container);
  } else {
    start();
  }

  viewer?.addEventListener('viewer:select', ({ detail }) => {
    if (!detail.ply) return;
    currentUrl = detail.ply;
    if (sceneViewer) sceneViewer.load(currentUrl);
    else start();
  });
});

// Copy the BibTeX entry.
document.querySelectorAll('[data-copy]').forEach(button => {
  const source = document.getElementById(button.dataset.copy);
  const label = button.querySelector('[data-copy-label]');
  if (!source || !label) return;
  let resetTimer = 0;

  button.addEventListener('click', async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(source.textContent);
      copied = true;
    } catch {
      // Fallback: select the entry so it can be copied manually if execCommand fails too.
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(source);
      selection.removeAllRanges();
      selection.addRange(range);
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      if (copied) selection.removeAllRanges();
    }

    label.textContent = copied ? 'Copied' : 'Press Ctrl/⌘+C';
    button.classList.toggle('is-copied', copied);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      label.textContent = 'Copy';
      button.classList.remove('is-copied');
    }, 2000);
  });
});
