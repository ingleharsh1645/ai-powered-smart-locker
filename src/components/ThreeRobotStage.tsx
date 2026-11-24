import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Bot } from 'lucide-react';

export type RobotState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Pre-allocated scratch helpers (zero GC inside animation loop)
const _scratchColor = new THREE.Color();
const _scratchMat4 = new THREE.Matrix4();
const _scratchPos = new THREE.Vector3();
const _scratchScale = new THREE.Vector3(1, 1, 1);
const _scratchQuat = new THREE.Quaternion();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.5, 'rgba(2, 6, 23, 0.28)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStudioGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function ThreeRobotStage({
  robotState = 'idle',
  variant = 'full',
  className = '',
}: {
  robotState?: RobotState;
  variant?: 'full' | 'compact';
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<RobotState>(robotState);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    stateRef.current = robotState;
  }, [robotState]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, variant === 'compact' ? 88 : 320);
    const height = Math.max(container.clientHeight, variant === 'compact' ? 88 : 320);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: variant === 'compact',
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl && variant === 'full';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const disposables: Array<{ dispose: () => void }> = [];

    if (variant === 'full') {
      scene.background = new THREE.Color(0x0b1120);
      scene.fog = new THREE.FogExp2(0x0b1120, 0.042);
      try {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const roomEnv = new RoomEnvironment();
        const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
        scene.environment = envTexture;
        disposables.push(envTexture);
        roomEnv.dispose();
        pmremGenerator.dispose();
      } catch {
        // Fallback to standard directional/hemisphere lighting if PMREM fails
      }
    }

    const camera = new THREE.PerspectiveCamera(
      variant === 'compact' ? 38 : 42,
      width / height,
      0.1,
      100
    );
    camera.position.set(0, variant === 'compact' ? 1.55 : 1.75, variant === 'compact' ? 4.1 : 5.4);

    let controls: OrbitControls | null = null;
    if (variant === 'full') {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1.35, 0);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.minDistance = 2.8;
      controls.maxDistance = 10;
      controls.maxPolarAngle = Math.PI * 0.52;
      controls.update();
    } else {
      camera.lookAt(0, 1.35, 0);
    }

    // Balanced Studio Lighting Rig (warm key + cool Hemisphere + rim)
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(4, 7, 5);
    if (variant === 'full' && !isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.3);
    rimLight.position.set(-4, 3.5, -4);
    scene.add(rimLight);

    // Studio Ground & Contact Shadow (full mode)
    const shadowTex = createRadialShadowTexture();
    disposables.push(shadowTex);
    const contactShadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    scene.add(contactShadow);
    disposables.push(contactShadowGeo, contactShadowMat);

    let particlesMesh: THREE.InstancedMesh | null = null;
    const particleCount = variant === 'full' ? 36 : 0;

    if (variant === 'full') {
      const gridTex = createStudioGridTexture(renderer.capabilities.getMaxAnisotropy());
      const floorGeo = new THREE.CircleGeometry(18, 64);
      const floorMat = new THREE.MeshStandardMaterial({
        map: gridTex,
        roughness: 0.72,
        metalness: 0.15,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      disposables.push(gridTex, floorGeo, floorMat);

      // Instanced ambient study nodes (> 20 instances)
      const nodeGeo = new THREE.OctahedronGeometry(0.06, 0);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
        roughness: 0.25,
        metalness: 0.7,
      });
      particlesMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, particleCount);
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 2.6 + (i % 4) * 1.1;
        const yPos = 0.5 + (i % 5) * 0.65;
        _scratchPos.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
        const s = 0.85 + (i % 3) * 0.15;
        _scratchScale.set(s, s, s);
        _scratchMat4.compose(_scratchPos, _scratchQuat, _scratchScale);
        particlesMesh.setMatrixAt(i, _scratchMat4);
        _scratchColor.setHex(i % 3 === 0 ? 0xf59e0b : 0x38bdf8);
        particlesMesh.setColorAt(i, _scratchColor);
      }
      particlesMesh.instanceMatrix.needsUpdate = true;
      if (particlesMesh.instanceColor) particlesMesh.instanceColor.needsUpdate = true;
      particlesMesh.computeBoundingSphere();
      scene.add(particlesMesh);
      disposables.push(nodeGeo, nodeMat);
    }

    // =========================================================================
    // COMPOSITE 10-PART PROCEDURAL 3D SIRI-STYLE AI ROBOT (THREE.Group)
    // =========================================================================
    const robotRoot = new THREE.Group(); // Pivot at bottom-center flush with ground
    scene.add(robotRoot);

    const robotBodyGroup = new THREE.Group();
    robotBodyGroup.position.y = 1.05;
    robotRoot.add(robotBodyGroup);

    // Materials with calibrated roughness/metalness contrast (>= 0.25 delta)
    const ceramicShellMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.58,
      metalness: 0.08,
    });
    const anodizedCobaltMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.22,
      metalness: 0.84,
    });
    const visorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x090f1c,
      roughness: 0.08,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.1,
    });
    const goldBeaconMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.65,
    });
    const ringCyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.22,
      metalness: 0.75,
    });
    disposables.push(
      ceramicShellMat,
      anodizedCobaltMat,
      visorGlassMat,
      eyeGlowMat,
      goldBeaconMat,
      ringCyanMat
    );

    // Part 1: LatheGeometry Pedestal Torso Hull
    const torsoPoints = [
      new THREE.Vector2(0.0, -0.55),
      new THREE.Vector2(0.32, -0.52),
      new THREE.Vector2(0.48, -0.25),
      new THREE.Vector2(0.52, 0.15),
      new THREE.Vector2(0.42, 0.42),
      new THREE.Vector2(0.24, 0.48),
      new THREE.Vector2(0.0, 0.48),
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 32);
    const torsoMesh = new THREE.Mesh(torsoGeo, ceramicShellMat);
    torsoMesh.castShadow = true;
    torsoMesh.position.y = -0.15;
    robotBodyGroup.add(torsoMesh);
    disposables.push(torsoGeo);

    // Part 2: Anodized Collar Ring
    const collarGeo = new THREE.TorusGeometry(0.32, 0.055, 16, 36);
    const collarMesh = new THREE.Mesh(collarGeo, anodizedCobaltMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 0.34;
    robotBodyGroup.add(collarMesh);
    disposables.push(collarGeo);

    // Part 3: Chest Voice Equalizer Bars (5 animated acoustic bars)
    const barGeo = new THREE.BoxGeometry(0.05, 0.14, 0.04);
    const eqBars: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(barGeo, eyeGlowMat);
      bar.position.set((i - 2) * 0.085, 0.02, 0.5);
      robotBodyGroup.add(bar);
      eqBars.push(bar);
    }
    disposables.push(barGeo);

    // Part 4: Articulated Shoulder Wing Fins (Bevelled ExtrudeGeometry)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.24, 0.18);
    finShape.lineTo(0.2, -0.22);
    finShape.lineTo(0, -0.12);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
    });
    const leftFin = new THREE.Mesh(finGeo, anodizedCobaltMat);
    leftFin.position.set(-0.56, 0.05, -0.04);
    leftFin.rotation.z = 0.22;
    leftFin.rotation.y = Math.PI;
    leftFin.castShadow = true;
    const rightFin = new THREE.Mesh(finGeo, anodizedCobaltMat);
    rightFin.position.set(0.56, 0.05, -0.04);
    rightFin.rotation.z = -0.22;
    rightFin.castShadow = true;
    robotBodyGroup.add(leftFin, rightFin);
    disposables.push(finGeo);

    // Head Sub-Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.72;
    robotBodyGroup.add(headGroup);

    // Part 5: Domed Head Shell (LatheGeometry)
    const headProfile = [
      new THREE.Vector2(0.0, -0.34),
      new THREE.Vector2(0.38, -0.32),
      new THREE.Vector2(0.54, -0.08),
      new THREE.Vector2(0.53, 0.22),
      new THREE.Vector2(0.38, 0.42),
      new THREE.Vector2(0.0, 0.46),
    ];
    const headGeo = new THREE.LatheGeometry(headProfile, 36);
    const headMesh = new THREE.Mesh(headGeo, anodizedCobaltMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);
    disposables.push(headGeo);

    // Part 6: Rounded Visor Faceplate (Bevelled ExtrudeGeometry)
    const visorShape = new THREE.Shape();
    const vw = 0.36;
    const vh = 0.2;
    const vr = 0.1;
    visorShape.moveTo(-vw + vr, -vh);
    visorShape.lineTo(vw - vr, -vh);
    visorShape.quadraticCurveTo(vw, -vh, vw, -vh + vr);
    visorShape.lineTo(vw, vh - vr);
    visorShape.quadraticCurveTo(vw, vh, vw - vr, vh);
    visorShape.lineTo(-vw + vr, vh);
    visorShape.quadraticCurveTo(-vw, vh, -vw, vh - vr);
    visorShape.lineTo(-vw, -vh + vr);
    visorShape.quadraticCurveTo(-vw, -vh, -vw + vr, -vh);
    const visorGeo = new THREE.ExtrudeGeometry(visorShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 4,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorGlassMat);
    visorMesh.position.set(0, 0.04, 0.43);
    headGroup.add(visorMesh);
    disposables.push(visorGeo);

    // Part 7: Expressive Glowing Eyes
    const eyeGeo = new THREE.CapsuleGeometry(0.055, 0.06, 8, 16);
    const leftEye = new THREE.Mesh(eyeGeo, eyeGlowMat);
    leftEye.position.set(-0.15, 0.05, 0.56);
    const rightEye = new THREE.Mesh(eyeGeo, eyeGlowMat);
    rightEye.position.set(0.15, 0.05, 0.56);
    headGroup.add(leftEye, rightEye);
    disposables.push(eyeGeo);

    // Part 8: Acoustic Ear-Pods
    const earGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 24);
    const leftEar = new THREE.Mesh(earGeo, ceramicShellMat);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-0.56, 0.05, 0);
    const rightEar = new THREE.Mesh(earGeo, ceramicShellMat);
    rightEar.rotation.z = Math.PI / 2;
    rightEar.position.set(0.56, 0.05, 0);
    headGroup.add(leftEar, rightEar);
    disposables.push(earGeo);

    // Part 9: Antenna Mast & Glowing Gold Beacon
    const mastGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.24, 16);
    const mastMesh = new THREE.Mesh(mastGeo, ceramicShellMat);
    mastMesh.position.set(0, 0.56, 0);
    const beaconGeo = new THREE.SphereGeometry(0.085, 24, 24);
    const beaconMesh = new THREE.Mesh(beaconGeo, goldBeaconMat);
    beaconMesh.position.set(0, 0.72, 0);
    headGroup.add(mastMesh, beaconMesh);
    disposables.push(mastGeo, beaconGeo);

    // Part 10: Siri-Style Tilted Orbital Energy Rings
    const ring1Geo = new THREE.TorusGeometry(0.95, 0.022, 16, 72);
    const ring1Mesh = new THREE.Mesh(ring1Geo, ringCyanMat);
    ring1Mesh.position.y = 0.25;
    ring1Mesh.rotation.set(Math.PI * 0.38, 0.25, 0);
    const ring2Geo = new THREE.TorusGeometry(1.12, 0.018, 16, 72);
    const ring2Mesh = new THREE.Mesh(ring2Geo, goldBeaconMat);
    ring2Mesh.position.y = 0.25;
    ring2Mesh.rotation.set(-Math.PI * 0.32, -0.35, 0.2);
    robotBodyGroup.add(ring1Mesh, ring2Mesh);
    disposables.push(ring1Geo, ring2Geo);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation Loop with Software-WebGL Pacing & Exponential Damping
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let ringSpeedDamped = 0.8;
    let hoverAmpDamped = 0.08;
    let glowDamped = 1.6;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.getElapsedTime();
      const mode = stateRef.current;

      const targetRingSpeed =
        mode === 'thinking' ? 3.8 : mode === 'listening' ? 2.6 : mode === 'speaking' ? 2.2 : 0.75;
      const targetHoverAmp = mode === 'speaking' ? 0.12 : mode === 'listening' ? 0.1 : 0.06;
      const targetGlow =
        mode === 'listening' ? 3.0 : mode === 'speaking' ? 2.8 : mode === 'thinking' ? 2.4 : 1.5;

      const dampAlpha = 1 - Math.exp(-6 * dt);
      ringSpeedDamped += (targetRingSpeed - ringSpeedDamped) * dampAlpha;
      hoverAmpDamped += (targetHoverAmp - hoverAmpDamped) * dampAlpha;
      glowDamped += (targetGlow - glowDamped) * dampAlpha;

      // Hover & grounded contact shadow pulse
      const hoverOffset = Math.sin(t * 2.2) * hoverAmpDamped;
      robotBodyGroup.position.y = 1.05 + hoverOffset;
      const shadowScale = 1.0 - hoverOffset * 0.8;
      contactShadow.scale.set(shadowScale, shadowScale, 1);

      // Head tilt & speaking nod
      const targetHeadRotX = mode === 'listening' ? -0.08 : mode === 'speaking' ? Math.sin(t * 9) * 0.07 : 0;
      const targetHeadRotY =
        mode === 'thinking' ? Math.sin(t * 2.5) * 0.25 : Math.sin(t * 0.9) * 0.12;
      headGroup.rotation.x += (targetHeadRotX - headGroup.rotation.x) * dampAlpha;
      headGroup.rotation.y += (targetHeadRotY - headGroup.rotation.y) * dampAlpha;

      // Periodic eye blink
      const blinkCycle = t % 4.2;
      const eyeScaleY = blinkCycle > 4.02 ? 0.15 : 1.0;
      leftEye.scale.y = eyeScaleY;
      rightEye.scale.y = eyeScaleY;

      // Chest audio waveform bars
      for (let i = 0; i < eqBars.length; i++) {
        const activeAmp =
          mode === 'speaking'
            ? 0.6 + Math.abs(Math.sin(t * 14 + i * 1.1)) * 1.5
            : mode === 'listening'
            ? 0.5 + Math.abs(Math.sin(t * 8 + i * 0.9)) * 0.9
            : 0.35 + Math.abs(Math.sin(t * 2 + i)) * 0.2;
        eqBars[i].scale.y += (activeAmp - eqBars[i].scale.y) * dampAlpha;
      }

      // Siri Orbital Rings & Emissives
      ring1Mesh.rotation.z += dt * ringSpeedDamped;
      ring2Mesh.rotation.z -= dt * ringSpeedDamped * 0.8;
      eyeGlowMat.emissiveIntensity = glowDamped;
      ringCyanMat.emissiveIntensity = glowDamped * 0.7;

      // Subtle particle orbit in full mode
      if (particlesMesh) {
        particlesMesh.rotation.y += dt * 0.12;
      }

      controls?.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, variant === 'compact' ? 88 : 320);
      const h = Math.max(container.clientHeight, variant === 'compact' ? 88 : 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls?.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  if (contextLost) {
    return (
      <div className={`flex items-center justify-center bg-slate-900 text-sky-400 ${className}`}>
        <Bot className="w-8 h-8" />
      </div>
    );
  }

  return <div ref={mountRef} className={`w-full h-full ${className}`} />;
}
