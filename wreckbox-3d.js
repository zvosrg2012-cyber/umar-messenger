/* Wreckbox 3D display layer — visual-only; original 2D simulation remains authoritative. */
(() => {
  'use strict';
  const game = document.getElementById('game');
  if (!game) return;
  const boot = () => {
    if (!window.THREE || !game.getContext) return;
    let source;
    try { source = game.getContext('2d'); } catch (_) { return; }
    if (!source) return;
    const overlay = document.createElement('canvas');
    overlay.id = 'wreckbox-3d-view';
    Object.assign(overlay.style, {
      position:'fixed', inset:'0', width:'100%', height:'100%',
      zIndex:'1', pointerEvents:'none', display:'block'
    });
    document.body.appendChild(overlay);
    const THREE = window.THREE;
    let renderer, scene, camera, plane, texture;
    try {
      renderer = new THREE.WebGLRenderer({canvas:overlay, alpha:true, antialias:true, powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setClearColor(0x000000, 0);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(48, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 500);
      camera.position.set(0, 0, 48);
      texture = new THREE.CanvasTexture(game);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const aspect = Math.max(0.2, window.innerWidth / Math.max(1, window.innerHeight));
      const viewHeight = 2 * 48 * Math.tan(48 * Math.PI / 360);
      plane = new THREE.Mesh(new THREE.PlaneGeometry(viewHeight * aspect, viewHeight), new THREE.MeshBasicMaterial({
        map:texture, transparent:true, depthWrite:false, side:THREE.DoubleSide
      }));
      plane.position.z = 32;
      scene.add(plane);
    } catch (err) {
      overlay.remove();
      console.warn('[Wreckbox 3D] WebGL unavailable; keeping original 2D view.', err);
      return;
    }

    let yaw = 0, pitch = 0, zoom = 48, dragging = false, lastX = 0, lastY = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const resize = () => {
      const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = zoom;
      camera.updateProjectionMatrix();
      plane.geometry.dispose();
      const viewHeight = 2 * zoom * Math.tan(48 * Math.PI / 360);
      plane.geometry = new THREE.PlaneGeometry(viewHeight * w / h, viewHeight);
    };
    const pointerDown = e => {
      if (e.button !== 0 || e.target.closest('button, input, select, textarea, a, .panel, #dock, #hudTop, #hudBottom, #menu')) return;
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    };
    const pointerMove = e => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.006;
      pitch = clamp(pitch + (e.clientY - lastY) * 0.005, -0.75, 0.75);
      lastX = e.clientX; lastY = e.clientY;
      plane.rotation.y = yaw; plane.rotation.x = pitch;
    };
    const pointerUp = () => { dragging = false; };
    const wheel = e => {
      if (e.target !== game && e.target !== overlay) return;
      zoom = clamp(zoom + Math.sign(e.deltaY) * 2.4, 28, 76);
      camera.position.z = zoom;
      resize();
    };
    document.addEventListener('pointerdown', pointerDown, {passive:true});
    document.addEventListener('pointermove', pointerMove, {passive:true});
    document.addEventListener('pointerup', pointerUp, {passive:true});
    window.addEventListener('blur', pointerUp);
    window.addEventListener('resize', resize);
    game.addEventListener('wheel', wheel, {passive:true});
    let frame = 0;
    const render = () => {
      if (!document.body.contains(overlay)) return;
      if (texture) texture.needsUpdate = true;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    resize();
    render();
    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', pointerDown);
      document.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('resize', resize);
      game.removeEventListener('wheel', wheel);
      texture.dispose(); plane.geometry.dispose(); plane.material.dispose(); renderer.dispose();
    }, {once:true});
  };
  const loadThree = () => {
    if (window.THREE) { boot(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    s.onload = boot;
    s.onerror = () => console.warn('[Wreckbox 3D] Three.js could not load; original 2D game remains available.');
    document.head.appendChild(s);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadThree, {once:true});
  else loadThree();
})();
