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
      renderer.setClearColor(0x87cefa, 1);
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87cefa);
      // Procedural 3D sky: a real sphere for the sun and soft, layered cloud clusters.
      const sky = new THREE.Group();
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(5.5, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0xffdf70 })
      );
      sun.position.set(-48, 31, -90);
      sky.add(sun);
      const sunGlow = new THREE.Mesh(
        new THREE.SphereGeometry(7.2, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0xffedaa, transparent: true, opacity: 0.22, depthWrite: false })
      );
      sunGlow.position.copy(sun.position);
      sky.add(sunGlow);
      const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98, depthWrite: false });
      const cloudData = [
        [-65, 25, -70, 1.3], [-28, 42, -105, 1.8], [18, 29, -85, 1.5],
        [57, 43, -115, 2.0], [82, 18, -95, 1.4], [5, 52, -135, 1.7]
      ];
      for (const [cx, cy, cz, scale] of cloudData) {
        const cloud = new THREE.Group();
        for (const [dx, dy, dz, s] of [[0,0,0,1.8],[3,0.5,0,1.35],[-2.7,0.2,0.4,1.2],[0.8,1.1,-0.3,1.25]]) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(scale * s, 16, 12), cloudMat);
          puff.scale.set(1.45, 0.65, 0.85);
          puff.position.set(dx * scale, dy * scale, dz * scale);
          cloud.add(puff);
        }
        cloud.position.set(cx, cy, cz);
        sky.add(cloud);
      }
      scene.add(sky);
      scene.add(new THREE.HemisphereLight(0xc8eaff, 0x657080, 1.4));
      camera = new THREE.PerspectiveCamera(65, window.innerWidth / Math.max(1, window.innerHeight), 0.05, 2000);
      camera.position.set(0, 0, 48);
      texture = new THREE.CanvasTexture(game);
      if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const viewHeight = 2 * 16 * Math.tan(65 * Math.PI / 360);
      const imageMaterial = new THREE.MeshBasicMaterial({
        map: texture, transparent: false, side: THREE.DoubleSide
      });
      plane = new THREE.Mesh(
        new THREE.PlaneGeometry(viewHeight * window.innerWidth / Math.max(1, window.innerHeight), viewHeight),
        imageMaterial
      );
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
    let dragOrbit = false, lastX = 0, lastY = 0;
    document.addEventListener('mousedown', e => {
      if (uiUnlocked && !isUI(e.target) && e.button === 0) { dragOrbit = true; lastX = e.clientX; lastY = e.clientY; }
    }, true);
    document.addEventListener('mouseup', () => { dragOrbit = false; }, true);
    const onMouseMove = e => {
      if (!uiUnlocked && document.pointerLockElement === overlay) {
        yaw -= (e.movementX || 0) * 0.0024;
        pitch = clamp(pitch - (e.movementY || 0) * 0.0024, -Math.PI * 0.495, Math.PI * 0.495);
        euler.set(pitch, yaw, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);
      } else if (uiUnlocked && dragOrbit) {
        yaw -= (e.clientX - lastX) * 0.006;
        pitch = clamp(pitch - (e.clientY - lastY) * 0.006, -1.25, 1.25);
        lastX = e.clientX; lastY = e.clientY;
        const target = plane.position.clone();
        const radius = Math.max(8, camera.position.distanceTo(target));
        camera.position.set(
          target.x + radius * Math.sin(yaw) * Math.cos(pitch),
          target.y + radius * Math.sin(pitch),
          target.z + radius * Math.cos(yaw)
        );
        camera.lookAt(target);
      }
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
      if (isUI(e.target)) return;
      e.preventDefault();
      const target = plane.position;
      const direction = camera.position.clone().sub(target).normalize();
      const radius = clamp(camera.position.distanceTo(target) + e.deltaY * 0.06, 8, 260);
      camera.position.copy(target).addScaledVector(direction, radius);
      camera.lookAt(target);
    };
    const resize = () => {
      const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Keep the game image at a fixed size in world space. Never resize it to
      // the viewport: that was the bug making the camera feel glued to a 2D screen.
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
      // Keep the sky at a large distance around the moving camera, like a skybox.
      sky.position.copy(camera.position);
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