/* Wreckbox 3D presentation layer. The original canvas remains a hidden texture source;
   the duplicate flat 2D canvas is not displayed behind the 3D view. */
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
    Object.assign(reticle.style, {
      position: 'fixed', left: '50%', top: '50%', width: '18px', height: '18px',
      margin: '-9px 0 0 -9px', zIndex: '10001', pointerEvents: 'none',
      border: '1px solid rgba(255,255,255,.9)', borderRadius: '50%',
      boxShadow: '0 0 4px #000', display: 'none'
    });
    const dot = document.createElement('span');
    Object.assign(dot.style, {
      position: 'absolute', width: '3px', height: '3px', left: '6px', top: '6px',
      borderRadius: '50%', background: '#fff'
    });
    reticle.appendChild(dot);
    document.body.appendChild(reticle);

    let renderer, scene, camera, plane, texture;
    const originalVisibility = game.style.visibility;
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
      // Keep the canvas alive for CanvasTexture updates, but don't show the original 2D copy underneath.
      game.style.visibility = 'hidden';
    } catch (err) {
      overlay.remove(); reticle.remove();
      game.style.visibility = originalVisibility;
      console.warn('[Wreckbox 3D] WebGL unavailable; original game view restored.', err);
      return;
    }

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    let yaw = 0, pitch = 0, uiUnlocked = true;
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');

    const isUI = el => !!(el && el.closest && el.closest(
      'button,input,select,textarea,a,[role="button"],[contenteditable="true"],.panel,#dock,#hudTop,#hudBottom,#menu'
    ));

    const setMode = unlocked => {
      uiUnlocked = unlocked;
      if (unlocked) {
        if (document.pointerLockElement === overlay) document.exitPointerLock?.();
        reticle.style.display = 'none';
        document.body.classList.remove('wreckbox-mouselook');
      } else {
        reticle.style.display = 'block';
        document.body.classList.add('wreckbox-mouselook');
        overlay.requestPointerLock?.();
      }
    };
    const onPointerLock = () => {
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
      if (e.code !== 'Tab') return;
      e.preventDefault();
      setMode(!uiUnlocked);
    };
    const onWheel = e => {
      if (uiUnlocked || isUI(e.target)) return;
      e.preventDefault();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(forward, clamp(e.deltaY * 0.018, -4, 4));
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
    };

    document.addEventListener('pointerlockchange', onPointerLock);
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('resize', resize);
    setMode(true);

    let frame = 0;
    const render = () => {
      if (!document.body.contains(overlay)) return;
      texture.needsUpdate = true;
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
      document.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('resize', resize);
      game.style.visibility = originalVisibility;
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