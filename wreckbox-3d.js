/* Wreckbox 3D view + keyboard-first controls.
   The original 2D game remains the simulation source; this file only changes presentation/input mode. */
(() => {
  'use strict';
  const game = document.getElementById('game');
  if (!game) return;

  const boot = () => {
    if (!window.THREE) return;
    let source;
    try { source = game.getContext('2d'); } catch (_) { return; }
    if (!source) return;

    const THREE = window.THREE;
    const overlay = document.createElement('canvas');
    overlay.id = 'wreckbox-3d-view';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      zIndex: '2', pointerEvents: 'none', display: 'block'
    });
    document.body.appendChild(overlay);

    const reticle = document.createElement('div');
    reticle.id = 'wreckbox-center-reticle';
    reticle.setAttribute('aria-hidden', 'true');
    Object.assign(reticle.style, {
      position: 'fixed', left: '50%', top: '50%', width: '18px', height: '18px',
      margin: '-9px 0 0 -9px', zIndex: '10001', pointerEvents: 'none',
      border: '1px solid rgba(255,255,255,.9)', borderRadius: '50%',
      boxShadow: '0 0 4px #000', display: 'none'
    });
    const reticleDot = document.createElement('span');
    Object.assign(reticleDot.style, {
      position: 'absolute', width: '3px', height: '3px', left: '6px', top: '6px',
      borderRadius: '50%', background: '#fff'
    });
    reticle.appendChild(reticleDot);
    document.body.appendChild(reticle);

    let renderer, scene, camera, plane, texture;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: overlay, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setClearColor(0x000000, 0);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(65, window.innerWidth / Math.max(1, window.innerHeight), 0.05, 2000);
      camera.position.set(0, 0, 48);
      texture = new THREE.CanvasTexture(game);
      if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const viewHeight = 2 * 16 * Math.tan(65 * Math.PI / 360);
      plane = new THREE.Mesh(new THREE.PlaneGeometry(viewHeight * window.innerWidth / Math.max(1, window.innerHeight), viewHeight),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      plane.position.set(0, 0, 32);
      scene.add(plane);
    } catch (err) {
      overlay.remove(); reticle.remove();
      console.warn('[Wreckbox 3D] WebGL unavailable; original game remains available.', err);
      return;
    }

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const keys = new Set();
    let yaw = 0, pitch = 0, locked = false, uiUnlocked = true;
    let lastTime = performance.now();
    const move = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');

    const interactive = 'button,input,select,textarea,a,[role="button"],[contenteditable="true"],.panel,#dock,#hudTop,#hudBottom,#menu';
    const isUI = el => !!(el && el.closest && el.closest(interactive));

    // Number keys activate existing game controls instead of requiring mouse selection.
    const activateNumber = key => {
      const n = Number(key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return false;
      const candidates = Array.from(document.querySelectorAll('button,[role="button"],[data-key], [data-hotkey]'))
        .filter(el => el !== reticle && el.getClientRects().length && !el.disabled);
      const matching = candidates.find(el =>
        el.dataset.key === key || el.dataset.hotkey === key ||
        (el.getAttribute('aria-keyshortcuts') || '').split(/[ ,]+/).includes(key));
      if (matching) { matching.click(); return true; }
      // Fallback to the nth visible game action, leaving unrelated form controls alone.
      const actions = candidates.filter(el => !el.closest('nav,[role="tablist"]'));
      if (actions[n - 1]) { actions[n - 1].click(); return true; }
      return false;
    };

    const setMode = unlocked => {
      uiUnlocked = unlocked;
      if (unlocked) {
        if (document.pointerLockElement === overlay || document.pointerLockElement === game) document.exitPointerLock?.();
        locked = false;
        reticle.style.display = 'none';
        overlay.style.cursor = 'default';
        document.body.classList.remove('wreckbox-mouselook');
      } else {
        reticle.style.display = 'block';
        overlay.style.cursor = 'none';
        document.body.classList.add('wreckbox-mouselook');
        overlay.requestPointerLock?.();
      }
    };

    const onPointerLock = () => {
      locked = document.pointerLockElement === overlay;
      if (!uiUnlocked) reticle.style.display = 'block';
    };
    const onMouseMove = e => {
      if (uiUnlocked || document.pointerLockElement !== overlay) return;
      yaw -= (e.movementX || 0) * 0.0024;
      pitch = clamp(pitch - (e.movementY || 0) * 0.0024, -Math.PI * 0.495, Math.PI * 0.495);
      euler.set(pitch, yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
    };
    const onClick = e => {
      if (uiUnlocked || isUI(e.target)) return;
      if (document.pointerLockElement !== overlay) overlay.requestPointerLock?.();
    };
    const onKeyDown = e => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setMode(!uiUnlocked);
        return;
      }
      if (uiUnlocked || isUI(e.target)) return;
      if (/^[1-9]$/.test(e.key)) {
        if (activateNumber(e.key)) { e.preventDefault(); return; }
      }
      if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        keys.add(e.code); e.preventDefault();
      }
      if (e.code === 'Escape') setMode(true);
    };
    const onKeyUp = e => keys.delete(e.code);
    const onWheel = e => {
      if (uiUnlocked) return;
      e.preventDefault();
      camera.position.addScaledVector(direction.set(0, 0, -1).applyQuaternion(camera.quaternion), clamp(e.deltaY * 0.018, -4, 4));
    };
    const resize = () => {
      const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const distance = Math.max(1, camera.position.distanceTo(plane.position));
      const vh = 2 * distance * Math.tan(camera.fov * Math.PI / 360);
      plane.geometry.dispose();
      plane.geometry = new THREE.PlaneGeometry(vh * w / h, vh);
      // Preserve the original game's world coverage when the camera returns to its start position.
    };

    document.addEventListener('pointerlockchange', onPointerLock);
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('resize', resize);
    document.addEventListener('wheel', onWheel, { passive: false, capture: true });

    // Start in normal UI mode. Press Tab to enter mouselook; Tab again returns the cursor.
    setMode(true);
    let frame = 0;
    const render = now => {
      if (!document.body.contains(overlay)) return;
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      if (!uiUnlocked) {
        const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 34 : 14) * dt;
        direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
        right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        move.set(0, 0, 0);
        if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(direction);
        if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(direction);
        if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(right);
        if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(right);
        if (keys.has('KeyE') || keys.has('Space')) move.y += 1;
        if (keys.has('KeyQ')) move.y -= 1;
        if (move.lengthSq()) camera.position.add(move.normalize().multiplyScalar(speed));
      }
      if (texture) texture.needsUpdate = true;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerlockchange', onPointerLock);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('resize', resize);
      document.removeEventListener('wheel', onWheel, true);
      texture.dispose(); plane.geometry.dispose(); plane.material.dispose(); renderer.dispose();
      overlay.remove(); reticle.remove();
    }, { once: true });
  };

  const loadThree = () => {
    if (window.THREE) { boot(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    s.onload = boot;
    s.onerror = () => console.warn('[Wreckbox 3D] Three.js failed to load; original game remains available.');
    document.head.appendChild(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadThree, { once: true });
  else loadThree();
})();