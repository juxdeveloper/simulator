import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  HelixMetrics,
  FrenetFrame,
  Vec3,
  evaluateFrenetFrame,
} from '../math/helixMath';
import {
  Play,
  Pause,
  RotateCcw,
  Compass,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type CameraPreset = 'isometric' | 'top-xy' | 'side-xz' | 'follow-frame';

export interface LayerVisibility {
  frenetTrihedron: boolean;
  osculatingCircle: boolean;
  osculatingPlane: boolean;
  normalPlane: boolean;
  rectifyingPlane: boolean;
  boundingCylinder: boolean;
  darbouxVector: boolean;
}

interface HelixViewport3DProps {
  metrics: HelixMetrics;
  arcLengthS: number;
  maxArcLength: number;
  isPlaying: boolean;
  playbackSpeed: number;
  layers: LayerVisibility;
  cameraPreset: CameraPreset;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  onTogglePlay: () => void;
  onChangeArcLengthS: (s: number) => void;
  onResetAll: () => void;
}

interface ProjectedLabel {
  id: string;
  text: string;
  subtext?: string;
  colorClass: string;
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Right-handed coordinate mapping from Mathematical (x, y, z_up)
 * to Three.js World (X = x, Y = z_up, Z = -y).
 * Determinant = +1, preserving right-hand rule and all cross products.
 */
function mathToThree(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.z, -v.y);
}

export const HelixViewport3D: React.FC<HelixViewport3DProps> = ({
  metrics,
  arcLengthS,
  maxArcLength,
  isPlaying,
  playbackSpeed,
  layers,
  cameraPreset,
  onSelectCameraPreset,
  onTogglePlay,
  onChangeArcLengthS,
  onResetAll,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglLost, setWebglLost] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [labels, setLabels] = useState<ProjectedLabel[]>([]);

  // Mutable refs for animation loop access without re-initializing WebGL scene
  const stateRef = useRef({
    metrics,
    arcLengthS,
    maxArcLength,
    isPlaying,
    playbackSpeed,
    layers,
    cameraPreset,
  });

  useEffect(() => {
    stateRef.current = {
      metrics,
      arcLengthS,
      maxArcLength,
      isPlaying,
      playbackSpeed,
      layers,
      cameraPreset,
    };
  }, [
    metrics,
    arcLengthS,
    maxArcLength,
    isPlaying,
    playbackSpeed,
    layers,
    cameraPreset,
  ]);

  const onChangeArcLengthSRef = useRef(onChangeArcLengthS);
  useEffect(() => {
    onChangeArcLengthSRef.current = onChangeArcLengthS;
  }, [onChangeArcLengthS]);

  // Camera transition target refs
  const cameraTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const controlsTargetLookRef = useRef<THREE.Vector3 | null>(null);

  // Trigger smooth camera interpolation when cameraPreset changes
  useEffect(() => {
    const { cylinderRadius: a, pitchRate: b, omega } = metrics;
    const spanR = Math.max(2.2, Math.min(11, a * 2.2));
    const spanH = Math.max(2.5, Math.min(10, Math.abs(b) * omega * maxArcLength * 0.65));
    const dist = Math.max(6.5, Math.min(22, Math.hypot(spanR, spanH) * 1.45));

    if (cameraPreset === 'isometric') {
      cameraTargetPosRef.current = new THREE.Vector3(dist * 0.78, dist * 0.56, dist * 0.78);
      controlsTargetLookRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'top-xy') {
      cameraTargetPosRef.current = new THREE.Vector3(0.01, dist * 1.25, 0.01);
      controlsTargetLookRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'side-xz') {
      cameraTargetPosRef.current = new THREE.Vector3(0, 0, dist * 1.2);
      controlsTargetLookRef.current = new THREE.Vector3(0, 0, 0);
    } else if (cameraPreset === 'follow-frame') {
      cameraTargetPosRef.current = null;
      controlsTargetLookRef.current = null;
    }
  }, [cameraPreset, metrics.kappa, metrics.tau, maxArcLength]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B1120');
    scene.fog = new THREE.FogExp2('#0B1120', 0.018);

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    camera.position.set(7.5, 5.2, 7.5);

    // 3. Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglLost(true);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    const canvas = renderer.domElement;
    canvas.className = 'w-full h-full block touch-none outline-none cursor-grab active:cursor-grabbing';
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 48;
    controls.minDistance = 1.8;
    controls.enablePan = true;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    const handleControlsStart = () => {
      cameraTargetPosRef.current = null;
      controlsTargetLookRef.current = null;
    };
    controls.addEventListener('start', handleControlsStart);

    // 5. Three-Point Studio Lighting
    const ambientLight = new THREE.HemisphereLight('#E0F2FE', '#0F172A', 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#FFFBEB', 1.65);
    keyLight.position.set(12, 18, 14);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38BDF8', 1.15);
    rimLight.position.set(-14, -8, -12);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight('#818CF8', 0.55);
    fillLight.position.set(-10, 12, 8);
    scene.add(fillLight);

    // 6. Reference Coordinate Grid (Mathematical xy-plane = Three.js XZ plane)
    const gridHelper = new THREE.GridHelper(16, 16, '#1E293B', '#131C31');
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Central Vertical Axis (Math Z = Three.js Y)
    const axisMat = new THREE.LineBasicMaterial({
      color: '#475569',
      transparent: true,
      opacity: 0.65,
    });
    const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -12, 0),
      new THREE.Vector3(0, 12, 0),
    ]);
    const zAxisLine = new THREE.Line(zAxisGeo, axisMat);
    scene.add(zAxisLine);

    const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-8, 0, 0),
      new THREE.Vector3(8, 0, 0),
    ]);
    const yAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -8),
      new THREE.Vector3(0, 0, 8),
    ]);
    scene.add(new THREE.Line(xAxisGeo, axisMat));
    scene.add(new THREE.Line(yAxisGeo, axisMat));

    // 7. Dynamic Scene Objects Group
    const helixMaterial = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      roughness: 0.25,
      metalness: 0.35,
      emissive: '#0284C7',
      emissiveIntensity: 0.2,
    });
    const helixMesh = new THREE.Mesh(new THREE.BufferGeometry(), helixMaterial);
    scene.add(helixMesh);

    // Bounding Cylinder (radius a)
    const cylinderMaterial = new THREE.MeshPhysicalMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.08,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true);
    const cylinderMesh = new THREE.Mesh(cylinderGeo, cylinderMaterial);
    scene.add(cylinderMesh);

    // Top & bottom wireframe ring on the cylinder
    const ringGeo = new THREE.BufferGeometry();
    const ringPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const ang = (i / 64) * Math.PI * 2;
      ringPoints.push(new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang)));
    }
    ringGeo.setFromPoints(ringPoints);
    const ringMat = new THREE.LineBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.28,
    });
    const eqRingLine = new THREE.Line(ringGeo, ringMat);
    scene.add(eqRingLine);

    // Probe sphere at r(s)
    const probeGeo = new THREE.SphereGeometry(0.14, 24, 24);
    const probeMat = new THREE.MeshStandardMaterial({
      color: '#F8FAFC',
      emissive: '#F8FAFC',
      emissiveIntensity: 0.5,
      roughness: 0.1,
    });
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);
    scene.add(probeMesh);

    // Frenet-Serret Trihedron Arrows (T, N, B) + Darboux Vector ω
    const arrowLength = 1.45;
    const arrowT = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      arrowLength,
      0x10b981,
      0.28,
      0.16
    );
    const arrowN = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(),
      arrowLength,
      0x0ea5e9,
      0.28,
      0.16
    );
    const arrowB = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(),
      arrowLength,
      0xf59e0b,
      0.28,
      0.16
    );
    const arrowDarboux = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(),
      arrowLength * 1.15,
      0xa855f7,
      0.28,
      0.16
    );
    scene.add(arrowT, arrowN, arrowB, arrowDarboux);

    // Osculating, Normal, and Rectifying Planes
    const planeSize = 2.1;
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);

    const oscPlaneMat = new THREE.MeshBasicMaterial({
      color: '#F43F5E',
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const oscPlaneMesh = new THREE.Mesh(planeGeo, oscPlaneMat);
    const oscPlaneBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(planeGeo),
      new THREE.LineBasicMaterial({ color: '#F43F5E', transparent: true, opacity: 0.55 })
    );
    oscPlaneMesh.add(oscPlaneBorder);
    scene.add(oscPlaneMesh);

    const normPlaneMat = new THREE.MeshBasicMaterial({
      color: '#0EA5E9',
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const normPlaneMesh = new THREE.Mesh(planeGeo, normPlaneMat);
    const normPlaneBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(planeGeo),
      new THREE.LineBasicMaterial({ color: '#0EA5E9', transparent: true, opacity: 0.5 })
    );
    normPlaneMesh.add(normPlaneBorder);
    scene.add(normPlaneMesh);

    const rectPlaneMat = new THREE.MeshBasicMaterial({
      color: '#10B981',
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rectPlaneMesh = new THREE.Mesh(planeGeo, rectPlaneMat);
    const rectPlaneBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(planeGeo),
      new THREE.LineBasicMaterial({ color: '#10B981', transparent: true, opacity: 0.5 })
    );
    rectPlaneMesh.add(rectPlaneBorder);
    scene.add(rectPlaneMesh);

    // Osculating Circle (radius R = 1/κ)
    const oscCirclePts: THREE.Vector3[] = [];
    const oscSegments = 96;
    for (let i = 0; i <= oscSegments; i++) {
      const theta = (i / oscSegments) * Math.PI * 2;
      oscCirclePts.push(new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0));
    }
    const oscCircleGeo = new THREE.BufferGeometry().setFromPoints(oscCirclePts);
    const oscCircleMat = new THREE.LineBasicMaterial({
      color: '#F43F5E',
      transparent: true,
      opacity: 0.85,
    });
    const oscCircleLine = new THREE.Line(oscCircleGeo, oscCircleMat);
    scene.add(oscCircleLine);

    // Osculating Center Point C(s) & Spoke Line
    const oscCenterSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#F43F5E' })
    );
    scene.add(oscCenterSphere);

    const spokeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 1, 0),
    ]);
    const spokeMat = new THREE.LineDashedMaterial({
      color: '#F43F5E',
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.75,
    });
    const spokeLine = new THREE.Line(spokeGeo, spokeMat);
    scene.add(spokeLine);

    let lastGeoKey = '';

    const rebuildHelixGeometry = (m: HelixMetrics, maxS: number) => {
      const sampleCount = 240;
      const pts: THREE.Vector3[] = [];
      const halfS = maxS / 2;

      for (let i = 0; i <= sampleCount; i++) {
        const s = -halfS + (i / sampleCount) * maxS;
        const t = m.omega * s;
        const x = m.cylinderRadius * Math.cos(t);
        const y = m.cylinderRadius * Math.sin(t);
        const z = m.pitchRate * t;
        pts.push(mathToThree({ x, y, z }));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeRadius = Math.max(0.035, Math.min(0.075, m.cylinderRadius * 0.045));
      const newGeo = new THREE.TubeGeometry(curve, 220, tubeRadius, 14, false);

      helixMesh.geometry.dispose();
      helixMesh.geometry = newGeo;

      const totalHeight = Math.max(
        0.08,
        Math.abs(m.pitchRate * m.omega * maxS) + 0.6
      );
      cylinderMesh.scale.set(m.cylinderRadius, totalHeight, m.cylinderRadius);
      eqRingLine.scale.set(m.cylinderRadius, 1, m.cylinderRadius);
    };

    const projectPoint = (worldPt: THREE.Vector3, w: number, h: number) => {
      const cloned = worldPt.clone().project(camera);
      const visible = cloned.z >= -1 && cloned.z <= 1;
      const x = (cloned.x * 0.5 + 0.5) * w;
      const y = (-(cloned.y * 0.5) + 0.5) * h;
      return { x, y, visible };
    };

    let animationFrameId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const current = stateRef.current;
      const {
        metrics: m,
        maxArcLength: maxS,
        isPlaying: playing,
        playbackSpeed: speed,
        layers: vis,
        cameraPreset: preset,
      } = current;

      let s = current.arcLengthS;
      if (playing) {
        const halfS = maxS / 2;
        s += dt * speed * 3.2;
        if (s > halfS) {
          s = -halfS;
        }
        current.arcLengthS = s;
        onChangeArcLengthSRef.current(Number(s.toFixed(2)));
      }

      const geoKey = `${m.kappa.toFixed(4)}_${m.tau.toFixed(4)}_${maxS.toFixed(1)}`;
      if (geoKey !== lastGeoKey) {
        rebuildHelixGeometry(m, maxS);
        lastGeoKey = geoKey;
      }

      cylinderMesh.visible = vis.boundingCylinder;
      eqRingLine.visible = vis.boundingCylinder;

      const frame: FrenetFrame = evaluateFrenetFrame(m, s);
      const pos3 = mathToThree(frame.position);
      const T3 = mathToThree(frame.T).normalize();
      const N3 = mathToThree(frame.N).normalize();
      const B3 = mathToThree(frame.B).normalize();
      const darboux3 = mathToThree(frame.darboux);
      const oscCenter3 = mathToThree(frame.osculatingCenter);

      probeMesh.position.copy(pos3);

      arrowT.visible = vis.frenetTrihedron;
      arrowN.visible = vis.frenetTrihedron;
      arrowB.visible = vis.frenetTrihedron;

      if (vis.frenetTrihedron) {
        arrowT.position.copy(pos3);
        arrowT.setDirection(T3);
        arrowN.position.copy(pos3);
        arrowN.setDirection(N3);
        arrowB.position.copy(pos3);
        arrowB.setDirection(B3);
      }

      arrowDarboux.visible = vis.darbouxVector;
      if (vis.darbouxVector && darboux3.lengthSq() > 1e-6) {
        arrowDarboux.position.copy(pos3);
        const dLen = Math.max(0.8, Math.min(2.6, darboux3.length() * 1.8));
        arrowDarboux.setDirection(darboux3.clone().normalize());
        arrowDarboux.setLength(dLen, 0.28, 0.16);
      }

      oscPlaneMesh.visible = vis.osculatingPlane;
      if (vis.osculatingPlane) {
        const basisOsc = new THREE.Matrix4().makeBasis(T3, N3, B3);
        oscPlaneMesh.position.copy(pos3);
        oscPlaneMesh.rotation.setFromRotationMatrix(basisOsc);
      }

      normPlaneMesh.visible = vis.normalPlane;
      if (vis.normalPlane) {
        const basisNorm = new THREE.Matrix4().makeBasis(N3, B3, T3);
        normPlaneMesh.position.copy(pos3);
        normPlaneMesh.rotation.setFromRotationMatrix(basisNorm);
      }

      rectPlaneMesh.visible = vis.rectifyingPlane;
      if (vis.rectifyingPlane) {
        const basisRect = new THREE.Matrix4().makeBasis(T3, B3, N3);
        rectPlaneMesh.position.copy(pos3);
        rectPlaneMesh.rotation.setFromRotationMatrix(basisRect);
      }

      oscCircleLine.visible = vis.osculatingCircle;
      oscCenterSphere.visible = vis.osculatingCircle;
      spokeLine.visible = vis.osculatingCircle;
      if (vis.osculatingCircle) {
        const basisOsc = new THREE.Matrix4().makeBasis(T3, N3, B3);
        oscCircleLine.position.copy(oscCenter3);
        oscCircleLine.rotation.setFromRotationMatrix(basisOsc);
        oscCircleLine.scale.setScalar(m.osculatingRadius);

        oscCenterSphere.position.copy(oscCenter3);

        const spokePositions = spokeLine.geometry.attributes.position as THREE.BufferAttribute;
        spokePositions.setXYZ(0, pos3.x, pos3.y, pos3.z);
        spokePositions.setXYZ(1, oscCenter3.x, oscCenter3.y, oscCenter3.z);
        spokePositions.needsUpdate = true;
        spokeLine.computeLineDistances();
      }

      if (preset === 'follow-frame') {
        const desiredCamPos = pos3
          .clone()
          .addScaledVector(T3, -3.8)
          .addScaledVector(B3, 2.2)
          .addScaledVector(N3, -1.6);
        camera.position.lerp(desiredCamPos, 0.08);
        controls.target.lerp(pos3, 0.12);
      } else {
        if (cameraTargetPosRef.current) {
          camera.position.lerp(cameraTargetPosRef.current, 0.08);
          if (camera.position.distanceTo(cameraTargetPosRef.current) < 0.05) {
            cameraTargetPosRef.current = null;
          }
        }
        if (controlsTargetLookRef.current) {
          controls.target.lerp(controlsTargetLookRef.current, 0.08);
          if (controls.target.distanceTo(controlsTargetLookRef.current) < 0.05) {
            controlsTargetLookRef.current = null;
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);

      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const nextLabels: ProjectedLabel[] = [];

      if (vis.frenetTrihedron) {
        const ptT = projectPoint(pos3.clone().addScaledVector(T3, arrowLength + 0.22), cW, cH);
        nextLabels.push({
          id: 'T',
          text: 'T',
          subtext: 'Tangent',
          colorClass: 'text-emerald-400 border-emerald-500/40',
          ...ptT,
        });

        const ptN = projectPoint(pos3.clone().addScaledVector(N3, arrowLength + 0.22), cW, cH);
        nextLabels.push({
          id: 'N',
          text: 'N',
          subtext: 'Normal',
          colorClass: 'text-sky-400 border-sky-500/40',
          ...ptN,
        });

        const ptB = projectPoint(pos3.clone().addScaledVector(B3, arrowLength + 0.22), cW, cH);
        nextLabels.push({
          id: 'B',
          text: 'B',
          subtext: 'Binormal',
          colorClass: 'text-amber-400 border-amber-500/40',
          ...ptB,
        });
      }

      if (vis.osculatingCircle) {
        const ptC = projectPoint(oscCenter3.clone().add(new THREE.Vector3(0, 0.22, 0)), cW, cH);
        nextLabels.push({
          id: 'C',
          text: `C (R=${m.osculatingRadius.toFixed(2)})`,
          colorClass: 'text-rose-400 border-rose-500/40',
          ...ptC,
        });
      }

      if (vis.darbouxVector) {
        const dLen = Math.max(0.8, Math.min(2.6, darboux3.length() * 1.8));
        const ptD = projectPoint(
          pos3.clone().addScaledVector(darboux3.clone().normalize(), dLen + 0.24),
          cW,
          cH
        );
        nextLabels.push({
          id: 'omega',
          text: 'ω = τT + κB',
          colorClass: 'text-purple-300 border-purple-500/40',
          ...ptD,
        });
      }

      setLabels(nextLabels);
    };

    animationFrameId = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      controls.dispose();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      renderer.dispose();
    };
  }, []);

  const toggleFullscreen = () => {
    const wrapper = containerRef.current?.parentElement;
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0B1120] overflow-hidden select-none flex flex-col">
      {/* Three.js Canvas Mount Container */}
      <div ref={containerRef} className="w-full h-full flex-1 relative" />

      {/* Fallback 2D Interactive SVG Preview if WebGL is unavailable */}
      {webglLost && (
        <div className="absolute inset-0 z-20 bg-[#0B1120] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-medium text-slate-300 mb-2">
            3D WebGL Context Suspended — Rendering Orthographic Mathematical Projection
          </p>
          <p className="text-xs text-slate-400 font-mono tabular-nums">
            κ = {metrics.kappa.toFixed(2)} · τ = {metrics.tau.toFixed(2)} · a ={' '}
            {metrics.cylinderRadius.toFixed(2)} · b = {metrics.pitchRate.toFixed(2)}
          </p>
        </div>
      )}

      {/* Semantic 3D-Projected Vector Labels */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
        {labels.map(
          (lbl) =>
            lbl.visible &&
            lbl.x > 24 &&
            lbl.y > 24 && (
              <div
                key={lbl.id}
                style={{
                  transform: `translate3d(${Math.round(lbl.x)}px, ${Math.round(lbl.y)}px, 0) translate(-50%, -50%)`,
                }}
                className={`absolute left-0 top-0 px-1.5 py-0.5 rounded bg-[#0B1120]/85 backdrop-blur-xs border text-[11px] font-mono font-semibold tracking-tight whitespace-nowrap shadow-xs ${lbl.colorClass}`}
              >
                {lbl.text}
              </div>
            )
        )}
      </div>

      {/* Top-Left Floating Live Mathematical HUD */}
      <div className="pointer-events-auto absolute top-3 left-3 sm:top-4 sm:left-4 z-10 max-w-[calc(100%-24px)] sm:max-w-md bg-[#0F172A]/80 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2.5 shadow-lg">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-300">
          <span className="font-mono font-semibold text-sky-400 tabular-nums">
            {metrics.regimeLabel}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono tabular-nums text-slate-200">
            r(t) = ⟨{metrics.cylinderRadius.toFixed(2)} cos t, {metrics.cylinderRadius.toFixed(2)}{' '}
            sin t, {metrics.pitchRate.toFixed(2)} t⟩
          </span>
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-white/10 grid grid-cols-4 gap-2 sm:gap-3 text-[11px] font-mono tabular-nums">
          <div>
            <span className="text-slate-400 block">Radius a</span>
            <span className="text-slate-100 font-semibold">
              {metrics.cylinderRadius.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Rise b</span>
            <span className="text-slate-100 font-semibold">
              {metrics.pitchRate >= 0 ? '+' : ''}
              {metrics.pitchRate.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Osc. R=1/κ</span>
            <span className="text-rose-300 font-semibold">
              {metrics.osculatingRadius.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Ratio τ/κ</span>
            <span className="text-amber-300 font-semibold">
              {metrics.lancretRatio >= 0 ? '+' : ''}
              {metrics.lancretRatio.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Top-Right Camera Perspective Switcher */}
      <div className="pointer-events-auto absolute top-3 right-3 sm:top-4 sm:right-4 z-10 hidden sm:flex items-center gap-1 p-1 bg-[#0F172A]/80 backdrop-blur-md border border-white/10 rounded-lg">
        {(
          [
            { id: 'isometric', label: '3D Orbit' },
            { id: 'top-xy', label: 'Top XY (a)' },
            { id: 'side-xz', label: 'Side XZ (b)' },
            { id: 'follow-frame', label: 'Follow TNB' },
          ] as { id: CameraPreset; label: string }[]
        ).map((cam) => (
          <button
            key={cam.id}
            type="button"
            onClick={() => onSelectCameraPreset(cam.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 ${
              cameraPreset === cam.id
                ? 'bg-sky-500 text-slate-950 font-semibold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {cam.label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen Stage"
          aria-label="Toggle Fullscreen Stage"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-md transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Bottom Floating Arc-Length s Playback & Trihedron Legend Bar */}
      <div className="pointer-events-auto absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#0F172A]/85 backdrop-blur-md border border-white/10 rounded-xl px-3.5 py-2.5 shadow-lg">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause Frenet frame traversal' : 'Animate Frenet frame traversal'}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            type="button"
            onClick={onResetAll}
            title="Reset arc-length s = 0 and default parameters"
            aria-label="Reset parameters"
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
              <span className="text-slate-300 truncate">Arc-Length Position s</span>
              <span className="text-sky-300 font-semibold whitespace-nowrap">
                s = {arcLengthS >= 0 ? '+' : ''}
                {arcLengthS.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              aria-label="Arc-Length Position s"
              min={-maxArcLength / 2}
              max={maxArcLength / 2}
              step={0.05}
              value={arcLengthS}
              onChange={(e) => onChangeArcLengthS(parseFloat(e.target.value))}
              className="helix-slider text-sky-400 bg-slate-700/80"
            />
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] font-mono text-slate-300 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-white/10 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">T Tangent</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-sky-400 font-semibold">N Normal</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-amber-400 font-semibold">B Binormal</span>
            <span aria-hidden="true" className="text-slate-600 hidden md:inline">
              ·
            </span>
            <span className="text-rose-400 font-semibold hidden md:inline">R=1/κ Circle</span>
          </div>

          <button
            type="button"
            onClick={() => {
              const order: CameraPreset[] = ['isometric', 'top-xy', 'side-xz', 'follow-frame'];
              const next = order[(order.indexOf(cameraPreset) + 1) % order.length];
              onSelectCameraPreset(next);
            }}
            className="sm:hidden flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-white/10 text-[11px] font-sans font-medium text-slate-200 whitespace-nowrap"
          >
            <Compass className="w-3 h-3 text-sky-400" />
            <span>
              {cameraPreset === 'isometric'
                ? '3D Orbit'
                : cameraPreset === 'top-xy'
                  ? 'Top XY'
                  : cameraPreset === 'side-xz'
                    ? 'Side XZ'
                    : 'Follow TNB'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
