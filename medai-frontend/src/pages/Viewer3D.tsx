import React, { useEffect, useRef, useState } from 'react';

const DIM = 'rgba(130,180,210,0.55)';
const TEXT = '#d0e4f0';

const ORGANS = [
  { id: 'heart',  label: 'Heart',    color: '#ff4466', info: 'Four-chamber muscular pump. Beats ~70 bpm at rest. Weight ~300g. Drives ~5L/min cardiac output.', system: 'Cardiovascular' },
  { id: 'brain',  label: 'Brain',    color: '#ffaa44', info: '86 billion neurons. ~1.3 kg. Consumes 20% of total body oxygen. ~100 trillion synaptic connections.', system: 'Nervous' },
  { id: 'lung',   label: 'Lungs',    color: '#44aaff', info: 'Gas exchange surface area ~70 m². Tidal volume ~500 mL. 12–20 breaths/min. ~1.3 kg per lung.', system: 'Respiratory' },
  { id: 'kidney', label: 'Kidneys',  color: '#884422', info: 'Filters ~180L of plasma daily. Regulates pH, electrolytes, and fluid balance. ~150g per kidney.', system: 'Urinary' },
  { id: 'liver',  label: 'Liver',    color: '#aa5533', info: 'Largest solid organ at ~1.5 kg. Over 500 metabolic functions including detoxification and bile production.', system: 'Digestive' },
  { id: 'eye',    label: 'Eye',      color: '#22aacc', info: '~576 megapixel equivalent. 120M rod photoreceptors. 6M cone photoreceptors. Retinal processing at ~10M ops/sec.', system: 'Visual' },
];

const Viewer3D: React.FC = () => {
  const mountRef  = useRef<HTMLDivElement>(null);
  const sceneRef  = useRef<any>(null);
  const animRef   = useRef<number>(0);
  const [active, setActive] = useState(ORGANS[0]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).THREE) { setLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!loaded || !mountRef.current) return;
    const THREE = (window as any).THREE;
    const el = mountRef.current;
    cancelAnimationFrame(animRef.current);
    if (sceneRef.current?.renderer) { sceneRef.current.renderer.dispose(); el.innerHTML = ''; }

    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(0x040c18);
    const camera   = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 3.8);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const d = new THREE.DirectionalLight(0xffffff, 1); d.position.set(5,5,5); scene.add(d);
    const r = new THREE.PointLight(new THREE.Color(active.color), 2, 10); r.position.set(-3,-2,-2); scene.add(r);
    const f = new THREE.PointLight(new THREE.Color(active.color), 1, 8); f.position.set(0,0,3); scene.add(f);

    const mat = new THREE.MeshPhongMaterial({ color: new THREE.Color(active.color), shininess: 80, specular: new THREE.Color(0x999999) });
    const group = new THREE.Group();
    const id = active.id;

    if (id === 'heart') {
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.7,32,32), mat); s1.position.set(-0.33,0.22,0);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.7,32,32), mat); s2.position.set(0.33,0.22,0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.72,1.2,32), mat); cone.position.set(0,-0.48,0); cone.rotation.z = Math.PI;
      group.add(s1,s2,cone); group.scale.setScalar(0.88);
    } else if (id === 'brain') {
      const geo = new THREE.SphereGeometry(1,48,48);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
        const n = 0.12*(Math.sin(x*5)*Math.cos(y*4)+Math.sin(z*4)*Math.cos(x*3));
        pos.setXYZ(i,x+n*x,y+n*y,z+n*z);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo,mat); m.scale.set(1,0.82,0.9);
      const div = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,2.1,8), new THREE.MeshBasicMaterial({color:0x111111}));
      group.add(m,div);
    } else if (id === 'lung') {
      const lm = new THREE.Mesh(new THREE.SphereGeometry(0.7,24,24),mat); lm.scale.set(0.72,1.3,0.68); lm.position.set(-0.58,0,0);
      const rm = new THREE.Mesh(new THREE.SphereGeometry(0.7,24,24),mat); rm.scale.set(0.62,1.2,0.65); rm.position.set(0.52,0,0);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.9,12), new THREE.MeshPhongMaterial({color:0xdddddd})); tr.position.set(0,0.92,0);
      group.add(lm,rm,tr);
    } else if (id === 'kidney') {
      const geo = new THREE.SphereGeometry(0.95,32,32);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x=pos.getX(i); if(x<-0.15){const ind=Math.max(0,-x-0.15)*0.65; pos.setX(i,x+ind);}
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo,mat); m.scale.set(0.72,1.12,0.58); group.add(m);
    } else if (id === 'liver') {
      const geo = new THREE.SphereGeometry(1,32,32);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
        const n=0.08*(Math.sin(x*3+z*2)+Math.cos(y*2));
        pos.setXYZ(i,x+n,y+n*0.4,z);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo,mat); m.scale.set(1.35,0.68,0.82); group.add(m);
    } else if (id === 'eye') {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.92,32,32),mat);
      const iris = new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.05,32), new THREE.MeshPhongMaterial({color:0x1a7799}));
      iris.position.set(0,0,0.9); iris.rotation.x=Math.PI/2;
      const pupil = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.06,32), new THREE.MeshBasicMaterial({color:0x050505}));
      pupil.position.set(0,0,0.92); pupil.rotation.x=Math.PI/2;
      group.add(ball,iris,pupil);
    }

    scene.add(group);
    const wmat = new THREE.MeshBasicMaterial({color:new THREE.Color(active.color),wireframe:true,opacity:0.05,transparent:true});
    const shell = group.clone();
    shell.traverse((c:any)=>{if(c.isMesh)c.material=wmat;});
    shell.scale.setScalar(1.04);
    scene.add(shell);

    let drag=false,px=0,py=0;
    renderer.domElement.addEventListener('mousedown',(e:MouseEvent)=>{drag=true;px=e.clientX;py=e.clientY;});
    window.addEventListener('mouseup',()=>{drag=false;});
    window.addEventListener('mousemove',(e:MouseEvent)=>{
      if(!drag)return;
      group.rotation.y+=(e.clientX-px)*0.008; group.rotation.x+=(e.clientY-py)*0.008;
      shell.rotation.copy(group.rotation); px=e.clientX; py=e.clientY;
    });

    sceneRef.current={renderer};
    let t=0;
    const animate=()=>{
      animRef.current=requestAnimationFrame(animate); t+=0.016;
      group.rotation.y+=0.004; shell.rotation.y=group.rotation.y;
      group.position.y=Math.sin(t*0.7)*0.06; shell.position.y=group.position.y;
      renderer.render(scene,camera);
    };
    animate();

    const onResize=()=>{camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};
    window.addEventListener('resize',onResize);
    return ()=>{cancelAnimationFrame(animRef.current);window.removeEventListener('resize',onResize);renderer.dispose();};
  }, [loaded, active]);

  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '3rem 2.5rem' }}>

      <div className="fade-in" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 18,
          background: 'rgba(180,123,255,0.06)', border: '1px solid rgba(180,123,255,0.22)',
          borderRadius: 100, padding: '6px 18px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#b47bff', display: 'inline-block' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#b47bff', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Three.js · WebGL · Interactive 3D</span>
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.6rem', fontWeight: 800, letterSpacing: -1.5, color: TEXT, marginBottom: 10 }}>3D Anatomy Viewer</h1>
        <p style={{ color: DIM, fontSize: 16, fontWeight: 300 }}>Real-time 3D organ models rendered in WebGL. Drag to rotate. Click an organ to switch models.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div ref={mountRef} style={{ height: 480, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,229,255,0.08)', cursor: 'grab', position: 'relative' as const }}
            onMouseDown={e=>(e.currentTarget.style.cursor='grabbing')} onMouseUp={e=>(e.currentTarget.style.cursor='grab')}>
            {!loaded && (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040c18' }}>
                <p style={{ color: DIM, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>Loading WebGL renderer...</p>
              </div>
            )}
          </div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(100,140,170,0.35)', textAlign: 'center' }}>
            Drag to rotate · Auto-rotates · Wireframe overlay enabled
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="mono-label" style={{ marginBottom: 8 }}>Select Organ Model</div>
          {ORGANS.map(o => (
            <button key={o.id} onClick={() => setActive(o)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 10,
                background: active.id===o.id ? `${o.color}10` : 'rgba(0,8,20,0.5)',
                border: `1px solid ${active.id===o.id ? o.color+'45' : 'rgba(0,229,255,0.08)'}`,
                cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' as const }}>
              <div style={{ width: 3, height: 24, borderRadius: 2, background: active.id===o.id ? o.color : 'transparent', flexShrink: 0, boxShadow: active.id===o.id ? `0 0 8px ${o.color}` : 'none' }} />
              <div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14, color: active.id===o.id ? TEXT : DIM, marginBottom: 2 }}>{o.label}</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: active.id===o.id ? o.color : 'rgba(100,140,170,0.35)' }}>{o.system} System</p>
              </div>
              {active.id===o.id && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:o.color, boxShadow:`0 0 8px ${o.color}` }} />}
            </button>
          ))}

          <div className="glass" style={{ borderRadius: 12, padding: '16px 18px', marginTop: 6 }}>
            <div className="mono-label" style={{ marginBottom: 10 }}>Clinical Data</div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 15, color: active.color, marginBottom: 8 }}>{active.label}</p>
            <p style={{ fontSize: 13, color: DIM, lineHeight: 1.75 }}>{active.info}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Viewer3D;
