/* Wreckbox: 3D voxel conversion of the original simulation grid.
   The original canvas is retained only as the game's hidden simulation/render source. */
(() => {
  'use strict';
  const game = document.getElementById('game');
  if (!game) return;

  const boot = () => {
    if (!window.THREE || typeof window.__WRECKBOX3D_STATE !== 'function') {
      console.warn('[Wreckbox 3D] Original simulation grid is not available; keeping the original game view.');
      return;
    }
    let state;
    try { state = window.__WRECKBOX3D_STATE(); } catch (e) { console.warn(e); return; }
    if (!state || !state.et || !state.u || !state.d) return;

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
      const counts = new Map();
      const cells = state.et;
      const w = state.u, h = state.d;
      for (let i=0;i<Math.min(cells.length,w*h);i++) {
        const id = cells[i] || 0;
        if (id) counts.set(id,(counts.get(id)||0)+1);
      }
      const dummy = new THREE.Object3D();
      const materials = new Map();
      const unit = 1;
      // The game's native 6px material grid is mapped directly: every occupied cell
      // becomes a volumetric block, extruded five block units along depth.
      for (const [id,count] of counts) {
        const meta = state.K && state.K[id];
        const color = (meta && (meta.color || meta.col)) || palette[id % palette.length] || 0x999999;
        const mat = new THREE.MeshStandardMaterial({color: typeof color === 'number' ? color : palette[id % palette.length], roughness:0.92, metalness:0.02});
        const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(unit,unit,5), mat, count);
        mesh.name = 'material-' + id;
        let j=0;
        for (let i=0;i<Math.min(cells.length,w*h);i++) {
          if ((cells[i]||0)!==id) continue;
          const gx=i%w, gy=Math.floor(i/w);
          dummy.position.set(gx-w/2, (h-1-gy)-h/2, 0);
          dummy.updateMatrix(); mesh.setMatrixAt(j++,dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate=true;
        mesh.computeBoundingSphere();
        world.add(mesh); materials.set(id,mesh);
      }

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

      let drag=false, pan=false, lastX=0,lastY=0;
      const uiTarget=e=>!!(e.target&&e.target.closest&&e.target.closest('button,input,select,textarea,a,[role="button"],.panel,#dock,#hudTop,#hudBottom,#menu'));
      const onDown=e=>{if(uiTarget(e))return;if(e.button===0){drag=true;lastX=e.clientX;lastY=e.clientY;}else if(e.button===2){pan=true;lastX=e.clientX;lastY=e.clientY;}};
      const onUp=()=>{drag=false;pan=false;};
      const onMove=e=>{
        const dx=e.clientX-lastX,dy=e.clientY-lastY;
        if(drag){yaw-=dx*0.006;pitch+=dy*0.006;updateCamera();}
        if(pan){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);const scale=radius*0.0018;target.addScaledVector(right,-dx*scale);target.addScaledVector(up,dy*scale);updateCamera();}
        lastX=e.clientX;lastY=e.clientY;
      };
      const onWheel=e=>{if(uiTarget(e))return;e.preventDefault();radius*=Math.exp(e.deltaY*0.001);updateCamera();};
      const onContext=e=>{if(!uiTarget(e))e.preventDefault();};
      const onKey=e=>{const typing=e.target&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable);if(e.code==='Tab'){e.preventDefault();e.stopImmediatePropagation();const panels=document.querySelectorAll('.panel,#dock,#hudTop,#hudBottom,#menu');panels.forEach(p=>p.classList.toggle('wreckbox-ui-hidden'));return;}if(!typing){e.preventDefault();e.stopImmediatePropagation();}};
      const style=document.createElement('style');style.textContent='.wreckbox-ui-hidden{visibility:hidden!important}';document.head.appendChild(style);
      overlay.style.pointerEvents='auto';
      overlay.addEventListener('mousedown',onDown);window.addEventListener('mouseup',onUp);window.addEventListener('mousemove',onMove);
      overlay.addEventListener('wheel',onWheel,{passive:false});overlay.addEventListener('contextmenu',onContext);window.addEventListener('keydown',onKey,true);
      const resize=()=>{renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(window.innerWidth,window.innerHeight,false);camera.aspect=window.innerWidth/Math.max(1,window.innerHeight);camera.updateProjectionMatrix();};
      window.addEventListener('resize',resize);
      let frame;
      const render=()=>{if(!document.body.contains(overlay))return;sky.position.copy(camera.position);renderer.render(scene,camera);frame=requestAnimationFrame(render);};
      frame=requestAnimationFrame(render);
      window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);overlay.remove();style.remove();game.style.visibility=originalVisibility;renderer.dispose();world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});},{once:true});
      console.info('[Wreckbox 3D] Built voxel scene from native simulation grid', {width:w,height:h,occupiedCells:cells.filter(Boolean).length});
    } catch(err) {
      overlay.remove();game.style.visibility=originalVisibility;
      console.warn('[Wreckbox 3D] 3D conversion failed; original game view restored.',err);
    }
  };
  const loadThree=()=>{if(window.THREE){boot();return;}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';s.onload=boot;s.onerror=()=>console.warn('[Wreckbox 3D] Three.js failed to load.');document.head.appendChild(s);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadThree,{once:true});else loadThree();
})();