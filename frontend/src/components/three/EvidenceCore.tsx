import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  FileText,
  Globe,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  X,
  ShieldCheck,
  Play,
  Pause,
  Clock,
  Layers,
  Search,
  Quote,
} from 'lucide-react';
import { clsx } from 'clsx';

// ── Color Constants ──
const TEAL = 0x087f83;
const TEAL_LIGHT = 0x0a9ba0;
const GOLD = 0xd59a55;
const CORAL = 0xe47767;
const NAVY = 0x111c25;

export interface DocumentCardData {
  id: string;
  title: string;
  type: 'pdf' | 'web' | 'manual';
  typeLabel: string;
  category: 'verified' | 'conflict' | 'gap' | 'outdated';
  statusLabel: string;
  summary: string;
  findingTitle: string;
  findingDetail: string;
  sourceRef: string;
  verbatimQuote: string;
  position: [number, number, number];
  rotation: [number, number, number];
  accentColor: number;
}

export const SAMPLE_DOCS: DocumentCardData[] = [
  {
    id: 'doc-gap',
    title: 'Sample Scholarship Guidelines',
    type: 'pdf',
    typeLabel: 'Sample PDF Document • 24 Pages',
    category: 'gap',
    statusLabel: 'INFORMATION GAP',
    summary: 'Family income certificate renewal and grievance appeals are completely omitted.',
    findingTitle: 'Critical Information Gap Detected',
    findingDetail:
      'While general income ceilings are stated, the specific appeal mechanism for borderline income certificates is unaddressed across reviewed documents.',
    sourceRef: 'Sample Central Scholarship Guidelines (Section 1.2)',
    verbatimQuote: 'Total parental gross annual income must not exceed INR 8,00,000...',
    position: [2.8, 1.3, 0.2],
    rotation: [0, -0.22, 0.05],
    accentColor: GOLD,
  },
  {
    id: 'doc-verified',
    title: 'Sample Verification Benchmark',
    type: 'pdf',
    typeLabel: 'Sample PDF Document • 18 Pages',
    category: 'verified',
    statusLabel: 'VERIFIED EVIDENCE',
    summary: 'Merit eligibility threshold of 80th percentile verified with exact quotation.',
    findingTitle: 'Source-Supported Consensus',
    findingDetail:
      'Requirement of scoring above 80th percentile in the qualifying exam is directly verified by exact quotation.',
    sourceRef: 'Sample Central Scholarship Guidelines (Clause 1.1)',
    verbatimQuote: 'Candidates who have secured at least 80 percentile in the Higher Secondary Examination.',
    position: [-2.8, 1.4, 0.1],
    rotation: [0, 0.24, -0.04],
    accentColor: TEAL,
  },
  {
    id: 'doc-conflict',
    title: 'Sample State Education Addendum',
    type: 'web',
    typeLabel: 'Sample State Policy Addendum • Web',
    category: 'conflict',
    statusLabel: 'POSSIBLE CONFLICT',
    summary: 'Asserts INR 6,00,000 income ceiling, contradicting the 8,00,000 central limit.',
    findingTitle: 'Income Ceiling Discrepancy',
    findingDetail:
      'Direct policy divergence: State addendum sets ceiling at INR 6.0 LPA, while central guideline permits up to INR 8.0 LPA.',
    sourceRef: 'Sample State Education Addendum (Clause 1)',
    verbatimQuote: 'For candidates applying from State institutions, the family income threshold is capped at INR 6,00,000.',
    position: [-2.6, -1.4, 0.3],
    rotation: [0, 0.2, 0.03],
    accentColor: CORAL,
  },
  {
    id: 'doc-outdated',
    title: 'Illustrative Scholarship FAQ',
    type: 'manual',
    typeLabel: 'Older Advisory Archive • 2023',
    category: 'outdated',
    statusLabel: 'OUTDATED INFORMATION',
    summary: 'Recommends offline physical document submission, superseded by digital portal.',
    findingTitle: 'Outdated Submission Mode',
    findingDetail:
      'Source is dated late 2023 and advises physical submissions, which was superseded by mandatory digital-only filing.',
    sourceRef: 'Illustrative Scholarship FAQ Archive',
    verbatimQuote: 'Candidates unable to upload digital scans may submit hard-copy attested dossiers...',
    position: [2.6, -1.3, 0.3],
    rotation: [0, -0.18, -0.05],
    accentColor: GOLD,
  },
];

// Helper to generate realistic textures for 3D document cards with visible gap notch and highlighted lines
function createDocumentTexture(doc: DocumentCardData): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext('2d')!;

  // 1. Background Paper Card
  ctx.fillStyle = '#142531';
  ctx.fillRect(0, 0, 512, 680);

  // 2. Border
  ctx.lineWidth = 8;
  ctx.strokeStyle =
    doc.category === 'gap'
      ? '#D59A55'
      : doc.category === 'verified'
      ? '#087F83'
      : doc.category === 'conflict'
      ? '#E47767'
      : '#D59A55';
  ctx.strokeRect(4, 4, 504, 672);

  // 3. Top Header Bar
  ctx.fillStyle = '#0E1A23';
  ctx.fillRect(8, 8, 496, 90);

  // 4. Folded Corner Accent (Top Right)
  ctx.fillStyle = '#213A4B';
  ctx.beginPath();
  ctx.moveTo(430, 8);
  ctx.lineTo(504, 82);
  ctx.lineTo(430, 82);
  ctx.closePath();
  ctx.fill();

  // 5. Document Type Pill
  ctx.fillStyle =
    doc.category === 'gap'
      ? 'rgba(213,154,85,0.25)'
      : doc.category === 'verified'
      ? 'rgba(8,127,131,0.25)'
      : 'rgba(228,119,103,0.25)';
  ctx.fillRect(24, 28, 260, 44);
  ctx.fillStyle =
    doc.category === 'gap'
      ? '#D59A55'
      : doc.category === 'verified'
      ? '#0A9BA0'
      : doc.category === 'conflict'
      ? '#E47767'
      : '#D59A55';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(doc.typeLabel.toUpperCase(), 36, 56);

  // 6. Document Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  const words = doc.title.split(' ');
  let line = '';
  let y = 145;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > 440 && n > 0) {
      ctx.fillText(line, 28, y);
      line = words[n] + ' ';
      y += 32;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 28, y);

  // 7. Body Lines with Highlights
  y += 28;
  ctx.fillStyle = '#2C495B';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(28, y + i * 20, 440 - (i % 2 === 0 ? 0 : 70), 8);
  }

  // Highlighted Line representing AI text extraction
  y += 70;
  ctx.fillStyle = 'rgba(8, 127, 131, 0.4)';
  ctx.fillRect(24, y - 6, 460, 24);
  ctx.fillStyle = '#0A9BA0';
  ctx.fillRect(28, y, 440, 10);

  // 8. Visual Finding Area
  if (doc.category === 'gap') {
    y += 45;
    // Visible Missing Section / Notch cutout representation
    ctx.setLineDash([10, 6]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#D59A55';
    ctx.strokeRect(32, y, 448, 160);

    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(213, 154, 85, 0.12)';
    ctx.fillRect(32, y, 448, 160);

    ctx.fillStyle = '#D59A55';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('⚡ INFORMATION GAP (NOTCH)', 52, y + 55);
    ctx.fillStyle = '#BAC7CF';
    ctx.font = '18px sans-serif';
    ctx.fillText('Unaddressed renewal criteria omitted', 52, y + 90);
    ctx.fillText('across all reviewed sources.', 52, y + 120);
  } else if (doc.category === 'verified') {
    y += 45;
    ctx.fillStyle = 'rgba(8, 127, 131, 0.2)';
    ctx.fillRect(32, y, 448, 160);
    ctx.strokeStyle = '#087F83';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, y, 448, 160);

    ctx.fillStyle = '#0A9BA0';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('✓ SOURCE-VERIFIED CLAIM', 52, y + 55);
    ctx.fillStyle = '#BAC7CF';
    ctx.font = '18px sans-serif';
    ctx.fillText('Verbatim text quotation verified:', 52, y + 90);
    ctx.fillText('80th percentile merit criteria.', 52, y + 120);
  } else if (doc.category === 'conflict') {
    y += 45;
    ctx.fillStyle = 'rgba(228, 119, 103, 0.18)';
    ctx.fillRect(32, y, 448, 160);
    ctx.strokeStyle = '#E47767';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, y, 448, 160);

    ctx.fillStyle = '#E47767';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('⚠️ POSSIBLE CONFLICT', 52, y + 55);
    ctx.fillStyle = '#BAC7CF';
    ctx.font = '18px sans-serif';
    ctx.fillText('State sets 6.0 LPA threshold', 52, y + 90);
    ctx.fillText('vs Central guideline 8.0 LPA.', 52, y + 120);
  } else {
    y += 45;
    ctx.fillStyle = 'rgba(213, 154, 85, 0.18)';
    ctx.fillRect(32, y, 448, 160);
    ctx.strokeStyle = '#D59A55';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, y, 448, 160);

    ctx.fillStyle = '#D59A55';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('⏱️ OUTDATED INFORMATION', 52, y + 55);
    ctx.fillStyle = '#BAC7CF';
    ctx.font = '18px sans-serif';
    ctx.fillText('Advises physical paper filing,', 52, y + 90);
    ctx.fillText('superseded by digital NSP portal.', 52, y + 120);
  }

  // 9. Footer Status Badge
  ctx.fillStyle = '#0E1A23';
  ctx.fillRect(8, 620, 496, 52);
  ctx.fillStyle =
    doc.category === 'verified'
      ? '#087F83'
      : doc.category === 'conflict'
      ? '#E47767'
      : '#D59A55';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(doc.statusLabel, 28, 652);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export const EvidenceCore = ({ className }: { className?: string }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentCardData | null>(null);
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(9.8);
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3 | 4>(1);

  // References for animation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const centralLensRef = useRef<THREE.Group | null>(null);
  const docMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Mouse drag & lerp tracking
  const pointerState = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotX: 0,
    rotY: 0,
    targetRotX: 0,
    targetRotY: 0,
  });

  // Action: Focus Detected Gap
  const handleFocusGap = useCallback(() => {
    const gapDoc = SAMPLE_DOCS.find((d) => d.category === 'gap');
    if (gapDoc) {
      setSelectedDoc(gapDoc);
      setZoomLevel(6.8);
      setAutoRotate(false);
      pointerState.current.targetRotY = -0.35;
      pointerState.current.targetRotX = 0.15;
    }
  }, []);

  // Action: Reset View
  const handleResetCamera = useCallback(() => {
    setSelectedDoc(null);
    setZoomLevel(9.8);
    setAutoRotate(true);
    pointerState.current.targetRotX = 0;
    pointerState.current.targetRotY = 0;
  }, []);

  // Action: Zoom In / Out
  const handleZoom = useCallback((delta: number) => {
    setZoomLevel((prev) => Math.min(13, Math.max(5.5, prev + delta)));
  }, []);

  // 4-Phase Storyboard Timeline Interval (repeating 14-second loop: 3.5s per phase)
  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setCurrentPhase((prev) => (prev === 4 ? 1 : ((prev + 1) as any)));
    }, 3500);
    return () => clearInterval(phaseTimer);
  }, []);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setAutoRotate(false);
    }
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') pointerState.current.targetRotY -= 0.15;
      if (e.key === 'ArrowRight') pointerState.current.targetRotY += 0.15;
      if (e.key === 'ArrowUp') pointerState.current.targetRotX -= 0.15;
      if (e.key === 'ArrowDown') pointerState.current.targetRotX += 0.15;
      if (e.key === '+' || e.key === '=') handleZoom(-1.2);
      if (e.key === '-' || e.key === '_') handleZoom(1.2);
      if (e.key.toLowerCase() === 'g') handleFocusGap();
      if (e.key.toLowerCase() === 'r') handleResetCamera();
      if (e.key.toLowerCase() === ' ') {
        e.preventDefault();
        setAutoRotate((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFocusGap, handleResetCamera, handleZoom]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 560;

    // 1. Scene, Camera, Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(NAVY, 0.05);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(0, 0, zoomLevel);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 3. Atmospheric Lighting
    const ambientLight = new THREE.AmbientLight(0x13222d, 2.5);
    scene.add(ambientLight);

    const tealLight = new THREE.PointLight(TEAL, 5.5, 20);
    tealLight.position.set(-6, 4, 7);
    scene.add(tealLight);

    const goldLight = new THREE.PointLight(GOLD, 4.8, 18);
    goldLight.position.set(6, -3, 6);
    scene.add(goldLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rimLight.position.set(0, 8, 4);
    scene.add(rimLight);

    // 4. Central Magnifying Lens with Handle
    const centralGroup = new THREE.Group();
    centralLensRef.current = centralGroup;
    scene.add(centralGroup);

    // Bezel Torus
    const bezelGeo = new THREE.TorusGeometry(1.5, 0.09, 16, 64);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x075b60,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x087f83,
      emissiveIntensity: 0.35,
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    centralGroup.add(bezelMesh);

    // Glass Disk with physical transmission
    const glassGeo = new THREE.CylinderGeometry(1.43, 1.43, 0.1, 48);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a9ba0,
      emissive: 0x087f83,
      emissiveIntensity: 0.25,
      transmission: 0.85,
      opacity: 0.85,
      transparent: true,
      roughness: 0.08,
      ior: 1.52,
      thickness: 1.2,
      specularIntensity: 1.5,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.rotation.x = Math.PI / 2;
    centralGroup.add(glassMesh);

    // Recognizable Magnifying Lens Handle
    const handleGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.5, 24);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x075b60,
      metalness: 0.85,
      roughness: 0.3,
    });
    const handleMesh = new THREE.Mesh(handleGeo, handleMat);
    handleMesh.position.set(1.4, -1.4, 0);
    handleMesh.rotation.z = Math.PI / 4;
    centralGroup.add(handleMesh);

    // Brass/Gold Connector Ring on the handle
    const ringGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.18, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(1.0, -1.0, 0);
    ringMesh.rotation.z = Math.PI / 4;
    centralGroup.add(ringMesh);

    // Reticle & Crosshair
    const reticleGeo = new THREE.RingGeometry(0.7, 0.72, 36);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    centralGroup.add(reticleMesh);

    // 5. Document Cards (3D Meshes)
    const cardGeometry = new THREE.PlaneGeometry(2.1, 2.8);
    const docMeshes = docMeshesRef.current;
    docMeshes.clear();

    const beamMaterials: THREE.LineBasicMaterial[] = [];

    SAMPLE_DOCS.forEach((doc) => {
      const texture = createDocumentTexture(doc);
      const cardMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.15,
      });

      const mesh = new THREE.Mesh(cardGeometry, cardMaterial);
      mesh.position.set(...doc.position);
      mesh.rotation.set(...doc.rotation);
      mesh.userData = { docId: doc.id, doc };

      scene.add(mesh);
      docMeshes.set(doc.id, mesh);

      // Connecting Beams to Lens Center
      const curve = new THREE.QuadraticBezierCurve3(
        mesh.position,
        new THREE.Vector3(doc.position[0] * 0.4, doc.position[1] * 0.4, doc.position[2] + 0.6),
        new THREE.Vector3(0, 0, 0)
      );

      const points = curve.getPoints(24);
      const beamGeo = new THREE.BufferGeometry().setFromPoints(points);
      const beamMat = new THREE.LineBasicMaterial({
        color: doc.accentColor,
        transparent: true,
        opacity: doc.category === 'gap' ? 0.85 : 0.45,
        linewidth: 2,
        blending: THREE.AdditiveBlending,
      });
      beamMaterials.push(beamMat);

      const beamLine = new THREE.Line(beamGeo, beamMat);
      scene.add(beamLine);
    });

    // 6. Raycasting & Interaction
    const raycaster = new THREE.Raycaster();
    const mouseCoord = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseCoord.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoord.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (pointerState.current.isDragging) {
        const deltaX = e.clientX - pointerState.current.prevX;
        const deltaY = e.clientY - pointerState.current.prevY;
        pointerState.current.targetRotY += deltaX * 0.006;
        pointerState.current.targetRotX += deltaY * 0.006;
        pointerState.current.prevX = e.clientX;
        pointerState.current.prevY = e.clientY;
      }

      raycaster.setFromCamera(mouseCoord, camera);
      const intersects = raycaster.intersectObjects(Array.from(docMeshes.values()));

      if (intersects.length > 0) {
        const hitDocId = intersects[0].object.userData.docId;
        setHoveredDocId(hitDocId);
        container.style.cursor = 'pointer';
      } else {
        setHoveredDocId(null);
        container.style.cursor = pointerState.current.isDragging ? 'grabbing' : 'grab';
      }
    };

    const handlePointerDown = (e: MouseEvent) => {
      pointerState.current.isDragging = true;
      pointerState.current.prevX = e.clientX;
      pointerState.current.prevY = e.clientY;
    };

    const handlePointerUp = (e: MouseEvent) => {
      pointerState.current.isDragging = false;
      const rect = container.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const clickY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(new THREE.Vector2(clickX, clickY), camera);
      const intersects = raycaster.intersectObjects(Array.from(docMeshes.values()));
      if (intersects.length > 0) {
        const clickedDoc = intersects[0].object.userData.doc as DocumentCardData;
        setSelectedDoc(clickedDoc);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY * 0.005);
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('mousedown', handlePointerDown);
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mouseup', handlePointerUp);

    // Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop: Speed target is 1 rotation every 5–7 seconds (~0.017 rad/frame at 60 FPS)
    const clock = new THREE.Clock();
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Controlled rotation speed: 0.017 rad/frame yields ~6 seconds per 360-degree rotation
      if (autoRotate && !pointerState.current.isDragging) {
        pointerState.current.targetRotY += 0.017;
      }

      pointerState.current.rotX +=
        (pointerState.current.targetRotX - pointerState.current.rotX) * 0.05;
      pointerState.current.rotY +=
        (pointerState.current.targetRotY - pointerState.current.rotY) * 0.05;

      if (centralGroup) {
        centralGroup.rotation.z = elapsed * 0.35;
        centralGroup.rotation.y =
          pointerState.current.rotY * 0.4 + Math.sin(elapsed * 1.2) * 0.08;
        centralGroup.rotation.x =
          pointerState.current.rotX * 0.4 + Math.cos(elapsed * 1.0) * 0.06;
      }

      docMeshes.forEach((mesh, id) => {
        const initial = SAMPLE_DOCS.find((d) => d.id === id)!;
        const isHovered = hoveredDocId === id;
        const isSelected = selectedDoc?.id === id;

        const targetScale = isSelected ? 1.08 : isHovered ? 1.04 : 1.0;
        mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        mesh.position.y =
          initial.position[1] + Math.sin(elapsed * 2.0 + initial.position[0]) * 0.08;
        mesh.position.z = initial.position[2] + (isSelected ? 0.6 : isHovered ? 0.3 : 0);
        mesh.rotation.y = initial.rotation[1] + pointerState.current.rotY * 0.2;
      });

      if (cameraRef.current) {
        if (selectedDoc) {
          const targetCamPos = new THREE.Vector3(
            selectedDoc.position[0] * 0.4,
            selectedDoc.position[1] * 0.4,
            zoomLevel
          );
          cameraRef.current.position.lerp(targetCamPos, 0.06);
        } else {
          const defaultPos = new THREE.Vector3(0, 0, zoomLevel);
          cameraRef.current.position.lerp(defaultPos, 0.06);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('mousedown', handlePointerDown);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handlePointerUp);

      bezelGeo.dispose();
      bezelMat.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      handleGeo.dispose();
      handleMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      reticleGeo.dispose();
      reticleMat.dispose();
      cardGeometry.dispose();

      beamMaterials.forEach((m) => m.dispose());
      docMeshes.forEach((m) => {
        if (m.material instanceof THREE.MeshStandardMaterial && m.material.map) {
          m.material.map.dispose();
          m.material.dispose();
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [autoRotate, hoveredDocId, selectedDoc, zoomLevel, handleZoom]);

  return (
    <div
      className={clsx(
        'relative w-full h-[600px] sm:h-[680px] select-none flex flex-col justify-between bg-navy/95 rounded-3xl border border-teal/30 shadow-2xl overflow-hidden',
        className
      )}
    >
      {/* ── Top Stage Bar ── */}
      <div className="p-3 sm:p-3.5 z-20 pointer-events-auto border-b border-white/10 bg-navy/85 backdrop-blur-md">
        {/* 4 Stage Timeline Tabs */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[
            { phase: 1, label: '1. Sources', desc: 'Documents Reviewed' },
            { phase: 2, label: '2. AI Analysis', desc: 'Information Compared' },
            { phase: 3, label: '3. Findings', desc: 'Missing Information Found' },
            { phase: 4, label: '4. Evidence', desc: 'Evidence Linked' },
          ].map((step) => {
            const isActive = currentPhase === step.phase;
            return (
              <button
                key={step.phase}
                type="button"
                onClick={() => setCurrentPhase(step.phase as any)}
                className={`py-2 px-2.5 rounded-xl text-left transition-all border ${
                  isActive
                    ? 'bg-teal/20 border-teal text-white shadow-teal-sm'
                    : 'bg-white/5 border-white/5 text-white/50 hover:text-white/80'
                }`}
              >
                <span className="text-xs font-bold block">{step.label}</span>
                <span className="text-[10px] hidden sm:block opacity-70 mt-0.5">{step.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stage 3 & 4 Real-Time Floating Result Indicators ── */}
      {currentPhase === 3 && (
        <div className="absolute top-20 sm:top-22 left-4 right-4 z-20 flex flex-wrap items-center justify-center gap-2 pointer-events-none animate-fade-in">
          <span className="px-3 py-1.5 rounded-xl bg-gold/90 text-navy font-bold text-xs shadow-lg flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-navy" />
            Information Gap: Omitted Renewal Criteria
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-coral text-white font-bold text-xs shadow-lg flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-white" />
            Possible Conflict: 6.0 vs 8.0 LPA
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-navy font-bold text-xs shadow-lg flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-navy" />
            Outdated Information: Stale 2023 Rule
          </span>
        </div>
      )}

      {currentPhase === 4 && (
        <div className="absolute top-20 sm:top-22 left-4 right-4 z-20 max-w-lg mx-auto bg-navy/95 border border-teal/40 rounded-2xl p-3.5 shadow-2xl text-left pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-1.5 text-teal text-xs font-bold uppercase tracking-wider mb-1">
            <Quote className="w-4 h-4" />
            <span>Connected Verbatim Source Quotation</span>
          </div>
          <p className="text-xs text-white/90 font-medium italic">
            "Total parental gross annual income must not exceed INR 8,00,000 from all sources for the financial year ending March 31, 2025."
          </p>
          <span className="text-[10px] font-mono text-white/50 block mt-1">
            Reference: Sample Central Scholarship Guidelines (Clause 1.2)
          </span>
        </div>
      )}

      {/* ── 3D WebGL Canvas ── */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* ── Detail Callout Drawer (When Card is Clicked) ── */}
      {selectedDoc && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 pointer-events-auto bg-navy/95 backdrop-blur-xl border border-teal/40 rounded-3xl p-5 shadow-2xl animate-scale-in">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs',
                  selectedDoc.category === 'gap'
                    ? 'bg-gold text-navy'
                    : selectedDoc.category === 'verified'
                    ? 'bg-teal text-white'
                    : selectedDoc.category === 'conflict'
                    ? 'bg-coral text-white'
                    : 'bg-gold text-navy'
                )}
              >
                {selectedDoc.category === 'gap' ? '?' : selectedDoc.category === 'verified' ? '✓' : '!'}
              </span>
              <div>
                <span className="text-[9px] font-bold tracking-wider uppercase text-white/50">
                  {selectedDoc.statusLabel}
                </span>
                <h4 className="text-xs font-bold text-white leading-tight">
                  {selectedDoc.findingTitle}
                </h4>
              </div>
            </div>

            <button
              onClick={() => setSelectedDoc(null)}
              className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-white/80 mt-2.5 leading-relaxed font-light">
            {selectedDoc.findingDetail}
          </p>

          <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal block">
              Exact Source Quotation
            </span>
            <p className="text-white/90 italic">"{selectedDoc.verbatimQuote}"</p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
            <span className="truncate pr-2 font-mono text-[10px] text-teal">
              {selectedDoc.sourceRef}
            </span>
            <button
              onClick={() => setSelectedDoc(null)}
              className="text-gold font-semibold text-xs hover:underline shrink-0"
            >
              Dismiss →
            </button>
          </div>
        </div>
      )}

      {/* ── Compact Interactive Controls Bar ── */}
      <div className="p-2.5 sm:p-3 bg-navy/90 backdrop-blur-md border-t border-white/10 z-20 pointer-events-auto flex items-center justify-end gap-2 text-xs">
        {/* Compact Auto-Rotate Toggle */}
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={clsx(
            'px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all',
            autoRotate
              ? 'bg-teal/20 text-teal border-teal/40'
              : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
          )}
          title="Toggle Auto-Rotation"
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{autoRotate ? 'Pause' : 'Play'}</span>
        </button>

        {/* Focus Detected Gap */}
        <button
          type="button"
          onClick={handleFocusGap}
          className="px-3 py-1.5 rounded-xl bg-gold hover:bg-gold-light text-navy text-xs font-semibold transition-all shadow-gold flex items-center gap-1.5"
          title="Focus on Information Gap"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Focus Gap</span>
        </button>

        {/* Reset View */}
        <button
          type="button"
          onClick={handleResetCamera}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-colors"
          title="Reset View"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Zoom In/Out Buttons */}
        <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => handleZoom(-1.2)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.2)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
