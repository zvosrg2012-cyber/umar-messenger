/* Wreckbox: 3D voxel conversion of the original simulation grid.
   The original canvas is retained only as the game's hidden simulation/render source. */
(() => {
  'use strict';
  const game = document.getElementById('game');
  if (!game) return;

  // Determinate startup UI: report real milestones and never leave the original
  // full-screen loader blocking the page forever.
  const loader = document.getElementById('loading');
  let loadPct = 4;
  let loadDone = false;
  let loadTimer;
  const showProgress = () => {
    if (!loader || loadDone) return;
    loader.classList.remove('gone');
    loader.classList.remove('wreckbox-load-error');
    loader.innerHTML = '<div class="ld wreckbox-load-card"><div class="tape"></div><b>Wreckbox</b><span id="wreckbox-load-label">Подготовка игры…</span><div class="wreckbox-progress"><i id="wreckbox-progress-fill"></i></div><strong id="wreckbox-progress-pct">4%</strong><small id="wreckbox-load-note">Инициализация движка</small></div>';
    let css = document.getElementById('wreckbox-loader-style');
    if (!css) { css = document.createElement('style'); css.id = 'wreckbox-loader-style'; document.head.appendChild(css); }
    css.textContent = '#loading{z-index:99999!important;opacity:1!important;pointer-events:auto!important;background:#101820!important}.wreckbox-load-card{width:min(360px,84vw);padding:28px;background:#181818;border:1px solid #ffc21a;box-shadow:0 16px 50px #0008;color:#f4f7f8}.wreckbox-load-card .tape{width:100%;height:14px;background:repeating-linear-gradient(-45deg,#ffc21a 0 12px,#17140b 12px 24px);background-size:34px 34px;animation:wreckbox-tape 1s linear infinite}.wreckbox-progress i{background:repeating-linear-gradient(-45deg,#ffc21a 0 9px,#17140b 9px 18px);transition:width .18s ease}@keyframes wreckbox-tape{to{background-position:34px 0}}.wreckbox-load-card b{font-size:28px;letter-spacing:.08em}.wreckbox-load-card span,.wreckbox-load-card small{color:#c2d0d5;text-align:center}.wreckbox-progress{width:100%;height:12px;background:#34434b;border:1px solid #617780;overflow:hidden}.wreckbox-progress i{display:block;width:4%;height:100%;background:#ffc21a;transition:width .18s ease}.wreckbox-load-card strong{font:700 20px system-ui;color:#ffc21a}.wreckbox-load-card button{padding:9px 16px;background:#ffc21a;border:0;font-weight:700;cursor:pointer}.wreckbox-load-error{pointer-events:auto!important}';
    setLoadProgress(4, 'Подготовка игры…', 'Проверка игровых данных');
  };
  const setLoadProgress = (pct, label, note) => {
    loadPct = Math.max(loadPct, Math.min(99, pct));
    const fill = document.getElementById('wreckbox-progress-fill');
    const number = document.getElementById('wreckbox-progress-pct');
    const text = document.getElementById('wreckbox-load-label');
    const sub = document.getElementById('wreckbox-load-note');
    if (fill) fill.style.width = loadPct + '%';
    if (number) number.textContent = loadPct + '%';
    if (text) text.textContent = label;
    if (sub) sub.textContent = note;
  };
  const finishLoading = (message) => {
    if (loadDone) return;
    loadDone = true;
    clearTimeout(loadTimer);
    if (loader) {
      loader.classList.add('gone');
      setTimeout(() => { if (loader.isConnected) loader.style.display = 'none'; }, 450);
    }
  };
  showProgress();
  setLoadProgress(12, 'Запуск движка…', 'Загрузка 3D-движка');
  loadTimer = setTimeout(() => {
    if (loadDone) return;
    const label = document.getElementById('wreckbox-load-label');
    const note = document.getElementById('wreckbox-load-note');
    const card = loader && loader.querySelector('.ld');
    if (label) label.textContent = 'Переключаемся на исходную игру…';
    if (note) note.textContent = '3D-режим не ответил за 15 секунд. Убираем экран загрузки и пробуем показать оригинальное поле.';
    game.style.visibility = 'visible';
    const failedView = document.getElementById('wreckbox-3d-view');
    if (failedView) failedView.remove();
    if (loader) {
      loader.classList.add('gone');
      setTimeout(() => { if (loader.isConnected) loader.style.display = 'none'; }, 450);
    }
    if (card && !card.querySelector('button')) {
      const b = document.createElement('button');
      b.textContent = 'Перезагрузить';
      b.onclick = () => location.reload();
      card.appendChild(b);
    }
  }, 15000);

  const boot = () => {
    setLoadProgress(35, 'Подготовка мира…', 'Чтение состояния симуляции');
    if (!window.THREE || typeof window.__WRECKBOX3D_STATE !== 'function') {
      console.warn('[Wreckbox 3D] Simulation bridge unavailable; keeping original game view.');
      setLoadProgress(85, 'Запуск исходной игры…', '3D-режим недоступен; показываем оригинальное поле');
      finishLoading();
      return;
    }
    let state;
    try { state = window.__WRECKBOX3D_STATE(); } catch (e) { console.warn(e); return; }
    if (!state || !state.et || !state.u || !state.d) { setLoadProgress(85, 'Запуск исходной игры…', 'Не удалось прочитать карту для 3D'); finishLoading(); return; }
    setLoadProgress(45, 'Построение карты…', 'Создание объёмных блоков');

    const THREE = window.THREE;
    const overlay = document.createElement('canvas');
    overlay.id = 'wreckbox-3d-view';
    Object.assign(overlay.style, { position:'fixed', inset:'0', width:'100%', height:'100%', zIndex:'2', pointerEvents:'none', display:'block' });
    document.body.appendChild(overlay);

    let renderer, scene, camera;
    const originalVisibility = game.style.visibility;
    try {
      renderer = new THREE.WebGLRenderer({canvas:overlay, alpha:false, antialias:true, powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setClearColor(0x87cefa, 1);
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87cefa);
      scene.add(new THREE.HemisphereLight(0xdaf2ff, 0x6b6658, 2.0));
      const sunLight = new THREE.DirectionalLight(0xfff0c2, 2.2);
      sunLight.position.set(-100, 180, 100); scene.add(sunLight);

      const world = new THREE.Group(); scene.add(world);
      const sky = new THREE.Group(); scene.add(sky);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), new THREE.MeshBasicMaterial({color:0xffdf70}));
      sun.position.set(-110, 95, -180); sky.add(sun);
      const cloudMat = new THREE.MeshBasicMaterial({color:0xffffff});
      const cloudSpecs = [[-150,80,-220,1.6],[-65,120,-260,1.9],[45,90,-230,1.5],[145,115,-280,1.8],[220,70,-240,1.4]];
      for (const [x,y,z,s] of cloudSpecs) {
        const g = new THREE.Group();
        for (const [dx,dy,dz,r] of [[0,0,0,5],[7,1,0,4],[-6,1,1,3.7],[2,4,-1,4]]) {
          const p = new THREE.Mesh(new THREE.SphereGeometry(r*s, 12, 10), cloudMat);
          p.position.set(dx*s,dy*s,dz*s); g.add(p);
        }
        g.position.set(x,y,z); sky.add(g);
      }

      const palette = [0x000000,0x9d6b42,0xb96e45,0x8e969c,0x6e9cb0,0xd6d7d8,0x9a8b7a,0x5d6268,0x4c4a48,0x789b4b,0x77654c,0x4c555d,0xd4b878,0x7f8b91,0x6b4935,0x9e9e9e];
      const cells = state.et;
      const w = state.u, h = state.d;
      // Aggregate the native simulation grid into 6x6 material tiles before creating meshes.
      // The source grid is 499,200 cells; one Three.js instance per cell stalls WebGL on many devices.
      const cellCount = Math.min(cells.length, w*h);
      const tile = 6;
      const gridW = Math.ceil(w/tile), gridH = Math.ceil(h/tile);
      const cellsByMaterial = new Map();
      for(let ty=0; ty<gridH; ty++){
        for(let tx=0; tx<gridW; tx++){
          const frequency = new Map();
          for(let py=ty*tile; py<Math.min(h,(ty+1)*tile); py++){
            const row=py*w;
            for(let px=tx*tile; px<Math.min(w,(tx+1)*tile); px++){
              const id=cells[row+px]||0;
              if(id) frequency.set(id,(frequency.get(id)||0)+1);
            }
          }
          let chosen=0, most=0;
          for(const [id,n] of frequency) if(n>most){chosen=id;most=n;}
          if(chosen){
            if(!cellsByMaterial.has(chosen)) cellsByMaterial.set(chosen,[]);
            cellsByMaterial.get(chosen).push([tx,ty]);
          }
        }
      }
      const dummy = new THREE.Object3D();
      const materials = new Map();
      // Each visible tile is a solid block, five units deep; geometry count is reduced by ~36x.
      for (const [id,positions] of cellsByMaterial) {
        const meta = state.K && state.K[id];
        const base = meta && Array.isArray(meta.base) ? meta.base : null;
        const color = base ? ((Math.max(0,Math.min(255,base[0]))<<16) | (Math.max(0,Math.min(255,base[1]))<<8) | Math.max(0,Math.min(255,base[2]))) : palette[id % palette.length];
        const mat = new THREE.MeshStandardMaterial({color, roughness:0.92, metalness:0.02});
        const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(tile,tile,5), mat, positions.length);
        mesh.name = 'material-' + id;
        for(let j=0;j<positions.length;j++){
          const [gx,gy]=positions[j];
          dummy.position.set(gx*tile+tile/2-w/2, h/2-(gy*tile+tile/2), 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(j,dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate=true;
        mesh.computeBoundingSphere();
        world.add(mesh); materials.set(id,mesh);
      }

      setLoadProgress(76, 'Освещение и окружение…', 'Настройка камеры и неба');
      // Ground plane matches the native grid bounds; no original-screen texture is used.
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(w+24,h+24), new THREE.MeshStandardMaterial({color:0x8b9b70, roughness:1}));
      ground.rotation.x=-Math.PI/2;
      ground.position.set(0,-h/2-1.1,0);
      world.add(ground);

      camera = new THREE.PerspectiveCamera(65, window.innerWidth/Math.max(1,window.innerHeight), 0.1, 3000);
      const target = new THREE.Vector3(0,0,0);
      let yaw=0.45, pitch=0.48, radius=Math.max(w,h)*1.25;
      const updateCamera=()=> {
        pitch=Math.max(0.08,Math.min(1.42,pitch));
        radius=Math.max(12,Math.min(1200,radius));
        camera.position.set(target.x+radius*Math.sin(yaw)*Math.cos(pitch),target.y+radius*Math.sin(pitch),target.z+radius*Math.cos(yaw)*Math.cos(pitch));
        camera.lookAt(target);
      };
      updateCamera();
      game.style.visibility='hidden';
      setLoadProgress(92, 'Почти готово…', 'Запуск 3D-сцены');

      let drag=false, pan=false, uiMode=true, lastX=0,lastY=0;
      const uiTarget=e=>!!(e.target&&e.target.closest&&e.target.closest('button,input,select,textarea,a,[role="button"],.panel,#dock,#hudTop,#hudBottom,#menu'));
      const onDown=e=>{if(uiMode||uiTarget(e))return;if(e.button===0){drag=true;lastX=e.clientX;lastY=e.clientY;}else if(e.button===2){pan=true;lastX=e.clientX;lastY=e.clientY;}};
      const onUp=()=>{drag=false;pan=false;};
      const onMove=e=>{
        const dx=e.clientX-lastX,dy=e.clientY-lastY;
        if(drag){yaw-=dx*0.006;pitch+=dy*0.006;updateCamera();}
        if(pan){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);const scale=radius*0.0018;target.addScaledVector(right,-dx*scale);target.addScaledVector(up,dy*scale);updateCamera();}
        lastX=e.clientX;lastY=e.clientY;
      };
      const onWheel=e=>{if(uiMode||uiTarget(e))return;e.preventDefault();radius*=Math.exp(e.deltaY*0.001);updateCamera();};
      const onContext=e=>{if(!uiMode&&!uiTarget(e))e.preventDefault();};
      const panels=document.querySelectorAll('.panel,#dock,#hudTop,#hudBottom,#menu');
      const setUIMode=show=>{uiMode=show;panels.forEach(p=>p.classList.toggle('wreckbox-ui-hidden',!show));overlay.style.pointerEvents=show?'none':'auto';if(show){drag=false;pan=false;}};
      setUIMode(true);
      const onKey=e=>{const typing=e.target&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable);if(e.code==='Tab'){e.preventDefault();e.stopImmediatePropagation();setUIMode(!uiMode);return;}if(!typing){e.preventDefault();e.stopImmediatePropagation();}};
      const style=document.createElement('style');style.textContent='.wreckbox-ui-hidden{visibility:hidden!important}';document.head.appendChild(style);
      // Keep the original menus clickable while UI mode is active; Tab enables camera controls.
      overlay.addEventListener('mousedown',onDown);window.addEventListener('mouseup',onUp);window.addEventListener('mousemove',onMove);
      overlay.addEventListener('wheel',onWheel,{passive:false});overlay.addEventListener('contextmenu',onContext);window.addEventListener('keydown',onKey,true);
      const resize=()=>{renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(window.innerWidth,window.innerHeight,false);camera.aspect=window.innerWidth/Math.max(1,window.innerHeight);camera.updateProjectionMatrix();};
      window.addEventListener('resize',resize);
      let frame;
      const render=()=>{if(!document.body.contains(overlay))return;sky.position.copy(camera.position);renderer.render(scene,camera);frame=requestAnimationFrame(render);};
      frame=requestAnimationFrame(render);
      window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);overlay.remove();style.remove();game.style.visibility=originalVisibility;renderer.dispose();world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});},{once:true});
      setLoadProgress(100, 'Готово!', 'Мир загружен'); finishLoading();
      console.info('[Wreckbox 3D] Optimized voxel scene', {width:w,height:h,nativeCells:cellCount,voxelTiles:[...cellsByMaterial.values()].reduce((n,a)=>n+a.length,0)});
    } catch(err) {
      overlay.remove();game.style.visibility=originalVisibility;
      console.warn('[Wreckbox 3D] 3D conversion failed; original game view restored.',err);
      setLoadProgress(85, 'Запуск исходной игры…', '3D-режим не запустился; возвращено исходное поле'); finishLoading();
    }
  };
  const loadThree=()=>{if(window.THREE){setLoadProgress(25, 'Движок готов…', 'Подготовка 3D-сцены');boot();return;}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';s.onload=()=>{setLoadProgress(25, 'Движок готов…', 'Подготовка 3D-сцены');boot();};s.onerror=()=>{console.warn('[Wreckbox 3D] Three.js failed to load.');setLoadProgress(85, 'Запуск исходной игры…', 'Не загрузился 3D-движок; показываем оригинальную игру');finishLoading();};document.head.appendChild(s);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadThree,{once:true});else loadThree();
})();