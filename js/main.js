import * as THREE from './vendor/three.module.min.js';
import { walls, heroLayers, moods } from './data.js';

const root = document.documentElement;
const canvas = document.getElementById('scene');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wallByKey = Object.fromEntries(walls.map((w) => [w.key, w]));

/* ------------------------------------------------------------------
   Viewer: the window that opens when a piece is selected
   ------------------------------------------------------------------ */

const viewer = document.getElementById('viewer');
const stage = viewer.querySelector('.viewer-stage');
const viewerTitle = document.getElementById('viewer-title');
const viewerKind = document.getElementById('viewer-kind');
const stepButtons = [...viewer.querySelectorAll('[data-step]')];
let showing = null;

const stageTones = {
  hero: ['#5cc280', '#3a9c5c'],
  characters: ['#2b2639', '#17141f'],
  cutscenes: ['#000', '#000'],
  art: ['#fff590', '#f3e36a'],
};

function show(wall, index) {
  const count = wall.items.length;
  index = (index + count) % count;
  showing = { wall, index };
  const item = wall.items[index];

  let media;
  if (item.video) {
    media = document.createElement('video');
    media.src = item.video;
    media.poster = item.src;
    media.controls = true;
    media.loop = true;
    media.playsInline = true;
    media.autoplay = !reduceMotion;
    media.setAttribute('aria-label', item.title);
  } else {
    media = new Image();
    media.src = item.src;
    media.alt = `${item.title}. ${item.kind}.`;
    // Small pieces are shown at up to twice their size, never more.
    media.style.width = `${item.w * 2}px`;
  }
  media.width = item.w;
  media.height = item.h;

  const [a, b] = stageTones[wall.key];
  stage.style.setProperty('--a', a);
  stage.style.setProperty('--b', b);
  stage.replaceChildren(media);
  viewerTitle.textContent = item.title;
  viewerKind.textContent = item.kind;
  stepButtons.forEach((button) => { button.hidden = count < 2; });

  if (!viewer.open) {
    viewer.showModal();
    viewer.focus();
  }
}

viewer.addEventListener('click', (event) => {
  const step = event.target.closest('[data-step]');
  if (step && showing) show(showing.wall, showing.index + Number(step.dataset.step));
  else if (event.target.closest('[data-close]') || event.target === viewer) viewer.close();
});

viewer.addEventListener('keydown', (event) => {
  if (!showing || event.target.tagName === 'VIDEO') return;
  if (event.key === 'ArrowRight') show(showing.wall, showing.index + 1);
  if (event.key === 'ArrowLeft') show(showing.wall, showing.index - 1);
});

viewer.addEventListener('close', () => {
  stage.replaceChildren(); // also stops any video that was playing
  showing = null;
});

/* ------------------------------------------------------------------
   The list of pieces under each wall
   ------------------------------------------------------------------ */

for (const section of document.querySelectorAll('[data-wall]')) {
  const wall = wallByKey[section.dataset.wall];
  const list = section.querySelector('.index');
  wall.buttons = wall.items.map((item, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    const label = document.createElement('span');
    label.textContent = item.label || item.title;
    button.append(label);
    button.addEventListener('click', () => show(wall, i));
    const heat = (on) => () => { if (wall.cards) wall.cards[i].userData.hot = on; };
    button.addEventListener('pointerenter', heat(true));
    button.addEventListener('pointerleave', heat(false));
    button.addEventListener('focus', heat(true));
    button.addEventListener('blur', heat(false));
    const li = document.createElement('li');
    li.append(button);
    list.append(li);
    return button;
  });
}

// Without 3D the lists become a plain picture gallery.
function showFlatGallery() {
  root.classList.add('no-3d');
  for (const wall of walls) {
    if (!wall.buttons) continue;
    wall.buttons.forEach((button, i) => {
      const item = wall.items[i];
      const img = new Image();
      img.src = item.src;
      img.alt = '';
      img.loading = 'lazy';
      img.width = item.w;
      img.height = item.h;
      button.prepend(img);
    });
  }
}

/* ------------------------------------------------------------------
   The 3D room
   Four walls around the viewer. Scrolling turns the camera from one
   wall to the next and ends back at the first.
   ------------------------------------------------------------------ */

const ROOM = 20;      // distance from the middle of the room to each wall
const CURVE = 30;     // walls bend gently around the viewer; smaller = more bend
const FLOOR = -6.5;   // height of the floor
const GAP = 0.35;     // space between pieces on a wall
const FOV = 50;

function startRoom() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return false;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(moods[0].bg);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 500);
  camera.rotation.order = 'YXZ';

  const yawOf = (k) => -k * Math.PI / 2;
  const forward = (yaw) => new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const rightOf = (yaw) => new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  /* Floor: an endless checkerboard that fades into the wall colour ---- */

  const floorColors = { uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uFog: { value: new THREE.Color() } };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.ShaderMaterial({
      uniforms: floorColors,
      vertexShader: `
        varying vec3 vWorld;
        varying vec3 vView;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vec4 view = viewMatrix * world;
          vWorld = world.xyz;
          vView = view.xyz;
          gl_Position = projectionMatrix * view;
        }`,
      fragmentShader: `
        uniform vec3 uA;
        uniform vec3 uB;
        uniform vec3 uFog;
        varying vec3 vWorld;
        varying vec3 vView;
        void main() {
          vec2 p = vWorld.xz / 4.0;
          vec2 w = max(fwidth(p), 0.0001);
          vec2 i = 2.0 * (abs(fract((p - 0.5 * w) * 0.5) - 0.5) - abs(fract((p + 0.5 * w) * 0.5) - 0.5)) / w;
          float check = 0.5 - 0.5 * i.x * i.y;
          vec3 color = mix(uA, uB, check);
          color = mix(color, uFog, smoothstep(14.0, 95.0, length(vView)));
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR;
  scene.add(floor);

  /* Blocks drifting in the corners of the room ------------------------ */

  let seed = 7;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  scene.add(new THREE.AmbientLight(0xffffff, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(0.4, 1, 0.3);
  scene.add(sun);

  const blockMaterial = new THREE.MeshLambertMaterial();
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), blockMaterial, 44);
  const blockData = [];
  for (let i = 0; i < blocks.count; i++) {
    const corner = Math.PI / 4 + (i % 4) * Math.PI / 2;
    const angle = corner + (random() - 0.5) * 0.62;
    const radius = 25 + random() * 34;
    blockData.push({
      position: new THREE.Vector3(Math.sin(angle) * radius, FLOOR + 1.5 + random() * 17, Math.cos(angle) * radius),
      size: 0.7 + random() * 2.3,
      spin: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5),
      phase: random() * 6.28,
    });
  }
  scene.add(blocks);
  const dummy = new THREE.Object3D();

  /* Pieces on the walls ---------------------------------------------- */

  const plane = new THREE.PlaneGeometry(1, 1);
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const loader = new THREE.TextureLoader();
  const sharpness = renderer.capabilities.getMaxAnisotropy();
  const cards = [];
  const pickable = [];

  function texture(src, onLoad) {
    const map = loader.load(src, onLoad);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = sharpness;
    return map;
  }

  function newCard(wall, index) {
    const card = new THREE.Group();
    card.userData = {
      wall, index, item: wall.items[index],
      base: new THREE.Vector3(), turn: 0, phase: index * 1.7,
      hover: 0, hot: false, appear: 0, loaded: false,
      tilt: new THREE.Vector2(), tiltNow: new THREE.Vector2(),
    };
    cards.push(card);
    return card;
  }

  function face(card, src, cutout, onLoad) {
    const mesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
      map: texture(src, onLoad), transparent: cutout, toneMapped: false,
    }));
    mesh.userData.card = card;
    pickable.push(mesh);
    card.add(mesh);
    return mesh;
  }

  walls.forEach((wall, k) => {
    wall.group = new THREE.Group();
    wall.group.position.copy(forward(yawOf(k)).multiplyScalar(ROOM));
    wall.group.rotation.y = yawOf(k);
    scene.add(wall.group);

    if (wall.key === 'hero') {
      // The versus screen as a shadow box: a checkered back, the two
      // characters in the middle, a white frame, and the logo out in front.
      const card = newCard(wall, 0);
      const unit = 0.007;
      const inner = { w: 8.2, h: 4.3 };
      const rim = 0.4;
      const outer = { w: inner.w + rim * 2, h: inner.h + rim * 2 };
      const add = (material, w, h, x, y, z) => {
        const mesh = new THREE.Mesh(plane, material);
        mesh.scale.set(w, h, 1);
        mesh.position.set(x, y, z);
        mesh.userData.card = card;
        card.add(mesh);
        return mesh;
      };

      const checks = document.createElement('canvas');
      checks.width = checks.height = 2;
      const paint = checks.getContext('2d');
      paint.fillStyle = '#fff590';
      paint.fillRect(0, 0, 2, 2);
      paint.fillStyle = '#f3e36a';
      paint.fillRect(0, 0, 1, 1);
      paint.fillRect(1, 1, 1, 1);
      const checkMap = new THREE.CanvasTexture(checks);
      checkMap.colorSpace = THREE.SRGBColorSpace;
      checkMap.magFilter = THREE.NearestFilter;
      checkMap.wrapS = checkMap.wrapT = THREE.RepeatWrapping;
      checkMap.repeat.set(outer.w / 1.5, outer.h / 1.5);

      add(black, outer.w * 1.09, outer.h * 1.09, 0.28, -0.28, -0.06);
      pickable.push(add(new THREE.MeshBasicMaterial({ map: checkMap, toneMapped: false }), outer.w * 1.06, outer.h * 1.06, 0, 0, 0));
      const front = 1.0;
      add(white, outer.w, rim, 0, (inner.h + rim) / 2, front);
      add(white, outer.w, rim, 0, -(inner.h + rim) / 2, front);
      add(white, rim, inner.h, -(inner.w + rim) / 2, 0, front);
      add(white, rim, inner.h, (inner.w + rim) / 2, 0, front);

      let waiting = heroLayers.length;
      card.userData.layers = heroLayers.map((layer) => {
        const mesh = face(card, layer.src, true, () => { if (--waiting === 0) card.userData.loaded = true; });
        mesh.scale.set(layer.w * unit, layer.h * unit, 1);
        mesh.position.set(layer.x * unit, layer.y * unit, layer.z);
        mesh.userData.rest = mesh.position.clone();
        return mesh;
      });
      wall.cards = [card];
      wall.size = outer;
      wall.group.add(card);
      return;
    }

    wall.cards = wall.items.map((item, i) => {
      const card = newCard(wall, i);
      const data = card.userData;
      data.face = face(card, item.src, !!item.cutout, () => { data.loaded = true; });
      if (!item.cutout) {
        // A hard comic-book shadow, and a white frame around the screens.
        data.shadow = new THREE.Mesh(plane, black);
        card.add(data.shadow);
        if (item.video) {
          data.frame = new THREE.Mesh(plane, white);
          card.add(data.frame);
        }
      }
      if (item.preview) {
        const video = document.createElement('video');
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'none';
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.src = item.preview;
        video.addEventListener('playing', () => {
          const map = new THREE.VideoTexture(video);
          map.colorSpace = THREE.SRGBColorSpace;
          data.face.material.map = map;
          data.face.material.needsUpdate = true;
        }, { once: true });
        data.video = video;
      }
      wall.group.add(card);
      return card;
    });
  });

  // Arrange a wall's pieces in rows of equal width.
  function arrange(wall, mode) {
    if (!wall.rows) return;
    const width = mode === 'wide' ? 12 : 6;
    const rows = [];
    let next = 0;
    for (const count of wall.rows[mode]) {
      rows.push(wall.cards.slice(next, next + count));
      next += count;
    }
    const ratio = (card) => card.userData.item.w / card.userData.item.h;
    const heights = rows.map((row) => (width - GAP * (row.length - 1)) / row.reduce((sum, card) => sum + ratio(card), 0));
    const tallest = Math.max(0, ...heights.filter((_, i) => rows[i].length > 1));
    rows.forEach((row, i) => { if (row.length === 1 && tallest) heights[i] = Math.min(heights[i], tallest); });

    const total = heights.reduce((sum, h) => sum + h, 0) + GAP * (rows.length - 1);
    let y = total / 2;
    rows.forEach((row, i) => {
      const h = heights[i];
      const rowWidth = row.reduce((sum, card) => sum + ratio(card) * h, 0) + GAP * (row.length - 1);
      let x = -rowWidth / 2;
      for (const card of row) {
        const data = card.userData;
        const w = ratio(card) * h;
        const bend = (x + w / 2) / CURVE;
        data.base.set(CURVE * Math.sin(bend), y - h / 2, CURVE * (1 - Math.cos(bend)));
        data.turn = -bend;
        const edge = data.frame ? 0.1 : 0;
        data.face.scale.set(w - edge * 2, h - edge * 2, 1);
        if (data.frame) {
          data.frame.scale.set(w, h, 1);
          data.frame.position.z = -0.02;
        }
        if (data.shadow) {
          data.shadow.scale.set(w, h, 1);
          data.shadow.position.set(0.13, -0.13, -0.05);
        }
        x += w + GAP;
      }
      y -= h + GAP;
    });
    wall.size = { w: width, h: total };
  }

  /* Camera stops ------------------------------------------------------- */

  const stops = [...document.querySelectorAll('.stop')].map((section, i) => ({
    section,
    pin: section.querySelector('.pin'),
    above: section.querySelector('.stop-head'),
    below: section.querySelector('.index, .hero-text'),
    wall: walls[i % walls.length],
    yaw: yawOf(i),
    position: new THREE.Vector3(),
    top: 0,
  }));
  const navLinks = [...document.querySelectorAll('.top nav a')];
  const topBar = document.querySelector('.top');
  const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  let viewHeight = 1;

  function measure() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    viewHeight = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const mode = w / h >= 1.1 ? 'wide' : 'narrow';
    walls.forEach((wall) => arrange(wall, mode));

    const maxScroll = root.scrollHeight - innerHeight;
    for (const stop of stops) {
      stop.top = Math.min(stop.section.offsetTop, maxScroll);

      // The part of the screen left free by this stop's text.
      const margin = Math.min(28, h * 0.03);
      const top = (stop.above ? stop.above.offsetTop + stop.above.offsetHeight : topBar.offsetHeight) + margin;
      const bottom = stop.below.offsetTop - margin;
      const free = { left: 0.05, right: 0.95, top: top / h, bottom: Math.max(bottom, top + 80) / h };

      // Pull the camera back until the wall fits that free area, then
      // shift it so the wall sits in the middle of it.
      const size = stop.wall.size;
      const distance = Math.min(2 * ROOM - 5, 1.04 * Math.max(
        size.w / 2 / (halfTan * camera.aspect * (free.right - free.left)),
        size.h / 2 / (halfTan * (free.bottom - free.top)),
      ));
      const halfH = distance * halfTan;
      const centerX = free.left + free.right - 1;
      const centerY = 1 - (free.top + free.bottom);
      stop.position
        .copy(forward(stop.yaw).multiplyScalar(ROOM - distance))
        .addScaledVector(rightOf(stop.yaw), -centerX * halfH * camera.aspect);
      stop.position.y = -centerY * halfH;
    }
  }

  const smooth = (f) => f * f * (3 - 2 * f);

  // Where the camera is along the tour: 0 = first wall … 4 = back at the first wall.
  function tourPosition() {
    const y = scrollY;
    const last = stops.length - 1;
    let i = 0;
    while (i < last && y >= stops[i + 1].top) i++;
    if (i === last) return last;
    const turnStart = Math.max(stops[i].top, stops[i + 1].top - viewHeight);
    const f = THREE.MathUtils.clamp((y - turnStart) / Math.max(1, stops[i + 1].top - turnStart), 0, 1);
    return i + smooth(f);
  }

  /* Pointer ------------------------------------------------------------ */

  const pointer = new THREE.Vector2(0, 0);
  const look = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  let pointerActive = false;
  let overControl = false;
  let hovered = null;
  let position = 0;

  function cardAt(x, y) {
    const nearest = Math.round(position);
    if (Math.abs(position - nearest) > 0.2) return null;
    raycaster.setFromCamera(new THREE.Vector2((x / canvas.clientWidth) * 2 - 1, 1 - (y / canvas.clientHeight) * 2), camera);
    for (const hit of raycaster.intersectObjects(pickable, false)) {
      const card = hit.object.userData.card;
      if (card.userData.wall !== stops[nearest].wall) continue;
      card.userData.tilt.set(hit.uv.x - 0.5, hit.uv.y - 0.5);
      return card;
    }
    return null;
  }

  addEventListener('pointermove', (event) => {
    pointerActive = event.pointerType !== 'touch';
    overControl = !!event.target.closest?.('a, button, dialog');
    pointer.set(event.clientX, event.clientY);
  });
  root.addEventListener('pointerleave', () => { pointerActive = false; });

  addEventListener('click', (event) => {
    if (viewer.open || event.target.closest('a, button, dialog')) return;
    const card = cardAt(event.clientX, event.clientY);
    if (card) show(card.userData.wall, card.userData.index);
  });

  /* Every frame -------------------------------------------------------- */

  const colorA = new THREE.Color();
  const colorB = new THREE.Color();
  const moodColors = moods.map((mood) => ({ bg: new THREE.Color(mood.bg), a: new THREE.Color(mood.a), b: new THREE.Color(mood.b) }));
  const backOut = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
  const cutsceneStop = stops.findIndex((stop) => stop.wall.key === 'cutscenes');
  let previous = 0;
  let videosPlaying = false;
  let currentStop = -1;

  measure();
  position = tourPosition();

  function frame(now) {
    const time = now / 1000;
    const dt = Math.min(0.05, time - previous);
    previous = time;
    const ease = (speed) => 1 - Math.exp(-dt * speed);

    // Camera
    position += (tourPosition() - position) * ease(reduceMotion ? 60 : 7);
    const i = Math.min(stops.length - 2, Math.floor(position));
    const f = position - i;
    const from = stops[i];
    const to = stops[i + 1];
    const yaw = THREE.MathUtils.lerp(from.yaw, to.yaw, f);

    const targetX = pointerActive && !reduceMotion ? (pointer.x / canvas.clientWidth) * 2 - 1 : 0;
    const targetY = pointerActive && !reduceMotion ? 1 - (pointer.y / canvas.clientHeight) * 2 : 0;
    look.x += (targetX - look.x) * ease(4);
    look.y += (targetY - look.y) * ease(4);

    camera.position.lerpVectors(from.position, to.position, f);
    camera.position.addScaledVector(rightOf(yaw), look.x * 0.55);
    camera.position.y += look.y * 0.3;
    camera.rotation.set(look.y * 0.03, yaw - look.x * 0.05, 0);
    camera.updateMatrixWorld();

    // Wall colours
    const m0 = moodColors[i];
    const m1 = moodColors[i + 1];
    scene.background.lerpColors(m0.bg, m1.bg, f);
    floorColors.uFog.value.copy(scene.background);
    floorColors.uA.value.lerpColors(m0.a, m1.a, f);
    floorColors.uB.value.lerpColors(m0.b, m1.b, f);
    blockMaterial.color.lerpColors(m0.a, m1.a, f);

    // Blocks
    blockData.forEach((block, n) => {
      const drift = reduceMotion ? 0 : time;
      dummy.position.copy(block.position);
      dummy.position.y += Math.sin(drift * 0.4 + block.phase) * 0.6;
      dummy.rotation.set(block.spin.x * drift * 0.5 + block.phase, block.spin.y * drift * 0.5, block.spin.z * drift * 0.5);
      dummy.scale.setScalar(block.size);
      dummy.updateMatrix();
      blocks.setMatrixAt(n, dummy.matrix);
    });
    blocks.instanceMatrix.needsUpdate = true;

    // Which piece is under the pointer
    const nowHovered = pointerActive && !overControl && !viewer.open ? cardAt(pointer.x, pointer.y) : null;
    if (nowHovered !== hovered) {
      hovered = nowHovered;
      root.classList.toggle('is-pointing', !!hovered);
    }

    // Pieces
    for (const card of cards) {
      const data = card.userData;
      const lit = card === hovered || data.hot;
      data.hover += ((lit ? 1 : 0) - data.hover) * ease(12);
      if (data.loaded && data.appear < 1) data.appear = Math.min(1, data.appear + dt * 2.2);
      if (card === hovered) data.tiltNow.lerp(data.tilt, ease(10));
      else data.tiltNow.multiplyScalar(1 - ease(8));

      const wobble = reduceMotion ? 0 : time;
      card.position.set(
        data.base.x,
        data.base.y + Math.sin(wobble * 0.9 + data.phase) * 0.05,
        data.base.z + data.hover * 0.8,
      );
      card.rotation.set(-data.tiltNow.y * 0.35, data.turn + data.tiltNow.x * 0.35, Math.sin(wobble * 0.7 + data.phase) * 0.012);
      card.scale.setScalar(Math.max(0.0001, backOut(data.appear)) * (1 + data.hover * 0.08));

      if (data.layers) {
        data.layers.forEach((layer, n) => {
          layer.position.y = layer.userData.rest.y + Math.sin(wobble * 0.8 + n * 2.1) * 0.04;
        });
        const logo = data.layers[2];
        logo.rotation.z = Math.sin(wobble * 1.1) * 0.05;
        logo.position.z = logo.userData.rest.z + Math.sin(wobble * 0.6) * 0.25;
      }

      const button = data.wall.buttons?.[data.index];
      if (button) button.classList.toggle('is-hot', card === hovered);
    }

    // Cutscene previews only play while their wall is in view
    const shouldPlay = !reduceMotion && Math.abs(position - cutsceneStop) < 0.6;
    if (shouldPlay !== videosPlaying) {
      videosPlaying = shouldPlay;
      for (const card of stops[cutsceneStop].wall.cards) {
        if (shouldPlay) card.userData.video.play().catch(() => {});
        else card.userData.video.pause();
      }
    }

    // Mark the current wall in the top bar
    const nearest = Math.round(position);
    if (nearest !== currentStop) {
      currentStop = nearest;
      navLinks.forEach((link) => {
        const here = link.getAttribute('href') === `#${stops[nearest].section.id}`;
        if (here) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  requestAnimationFrame(frame);
  return true;
}

if (!startRoom()) showFlatGallery();
