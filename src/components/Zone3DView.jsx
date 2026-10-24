import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCcw, 
  Eye, 
  Droplets, 
  Flame, 
  Sun
} from 'lucide-react';

export default function Zone3DView({ zone, onSimulateIrrigate }) {
  const mountRef = useRef(null);
  const [viewMode, setViewMode] = useState('realistic'); // 'realistic' | 'thermal'
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isDripActive, setIsDripActive] = useState(false);

  // References to keep across renders
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameId = useRef(null);
  const waterParticlesRef = useRef([]);
  const plantsGroupRef = useRef(null);
  const terrainMeshRef = useRef(null);

  const { sensorData, analysis, agronomy } = zone;
  const crop = agronomy?.crop || {};
  const cropType = zone.cropType;
  const moisture = sensorData.soilMoisture;
  const airTemp = sensorData.airTemperature;
  const health = analysis.overallHealthScore;
  const plantStatus = analysis.plantStatus;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 420;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(viewMode === 'thermal' ? 0x0a0e17 : 0xeef6fb);
    scene.fog = new THREE.FogExp2(viewMode === 'thermal' ? 0x0a0e17 : 0xeef6fb, 0.018);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(16, 12, 18);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Don't go below ground
    controls.minDistance = 6;
    controls.maxDistance = 35;
    controls.target.set(0, 1.5, 0);
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 1.0;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(
      viewMode === 'thermal' ? 0x223344 : 0xffffff, 
      viewMode === 'thermal' ? 0.8 : 0.95
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      viewMode === 'thermal' ? 0xff4422 : 0xfffaed, 
      viewMode === 'thermal' ? 1.2 : 1.6
    );
    sunLight.position.set(18, 25, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4);
    scene.add(hemisphereLight);

    // 6. Terrain / Soil Block (0.25 Acre Field Quadrant)
    const fieldWidth = 16;
    const fieldLength = 16;
    const soilDepth = 1.6;

    // Determine soil color based on moisture & viewMode
    let soilColorHex = 0x5c4033; // Default brown
    let roughnessVal = 0.9;
    let metalnessVal = 0.05;

    if (viewMode === 'thermal') {
      soilColorHex = airTemp > 33 ? 0xdd2c00 : airTemp > 28 ? 0xff6d00 : 0x0091ea;
    } else if (cropType === 'Paddy' || moisture > 65) {
      soilColorHex = 0x3d3024; // Muddy waterlogged
      roughnessVal = 0.3;
      metalnessVal = 0.2;
    } else if (moisture < 20) {
      soilColorHex = 0x967959; // Dry parched cracked earth
      roughnessVal = 0.98;
    } else if (moisture < 35) {
      soilColorHex = 0x705335; // Dry-ish loam
      roughnessVal = 0.9;
    } else {
      soilColorHex = 0x422d1c; // Rich moist fertile soil
      roughnessVal = 0.75;
    }

    const groundGeometry = new THREE.BoxGeometry(fieldWidth, soilDepth, fieldLength);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: soilColorHex,
      roughness: roughnessVal,
      metalness: metalnessVal,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.position.y = -soilDepth / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    terrainMeshRef.current = groundMesh;

    // Subsoil layer cross-section (strata)
    const subsoilGeometry = new THREE.BoxGeometry(fieldWidth * 0.99, soilDepth * 1.2, fieldLength * 0.99);
    const subsoilMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b1e15,
      roughness: 0.95
    });
    const subsoilMesh = new THREE.Mesh(subsoilGeometry, subsoilMaterial);
    subsoilMesh.position.y = -soilDepth * 1.5;
    scene.add(subsoilMesh);

    // If Paddy or high moisture: Add Water Surface Layer
    if (cropType === 'Paddy' || moisture > 65) {
      const waterGeometry = new THREE.PlaneGeometry(fieldWidth - 0.2, fieldLength - 0.2);
      const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        metalness: 0.8
      });
      const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.y = 0.05;
      scene.add(waterMesh);
    }

    // 7. Raised Agricultural Crop Beds & Furrows
    const numRows = 5;
    const rowSpacing = 2.6;
    const rowLength = 13;

    for (let i = 0; i < numRows; i++) {
      const zPos = (i - (numRows - 1) / 2) * rowSpacing;
      
      // Bed ridge
      const ridgeGeo = new THREE.CylinderGeometry(0.55, 0.75, rowLength, 12);
      ridgeGeo.rotateZ(Math.PI / 2);
      const ridgeMat = new THREE.MeshStandardMaterial({
        color: soilColorHex,
        roughness: 0.9
      });
      const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridge.position.set(0, 0.15, zPos);
      ridge.receiveShadow = true;
      scene.add(ridge);

      // Black Drip Lateral Pipe
      const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, rowLength, 8);
      pipeGeo.rotateZ(Math.PI / 2);
      const pipeMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.4
      });
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.position.set(0, 0.32, zPos + 0.3);
      scene.add(pipe);
    }

    // 8. Procedural 3D Plant Meshes matching the Crop & Live Health
    const plantsGroup = new THREE.Group();
    scene.add(plantsGroup);
    plantsGroupRef.current = plantsGroup;

    // Helper to create a crop plant
    const createCropPlant = (type, plantHealth) => {
      const plant = new THREE.Group();
      
      // Healthy color vs withered/stressed color
      let leafColor = 0x2e7d32; // Lush green
      if (viewMode === 'thermal') {
        leafColor = airTemp > 33 ? 0xff5252 : 0xffd740;
      } else if (plantHealth < 40) {
        leafColor = 0xb48b3c; // Severe yellow/brown withered
      } else if (plantHealth < 70) {
        leafColor = 0x689f38; // Mild attention yellowish-green
      }

      const stemMat = new THREE.MeshStandardMaterial({ 
        color: viewMode === 'thermal' ? 0xff7043 : 0x2e5b22, 
        roughness: 0.8 
      });
      const leafMat = new THREE.MeshStandardMaterial({ 
        color: leafColor, 
        roughness: 0.6, 
        side: THREE.DoubleSide 
      });

      if (type === 'Tomato') {
        // Main vine stem
        const stemGeo = new THREE.CylinderGeometry(0.06, 0.1, 1.6, 8);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.8;
        stem.castShadow = true;
        plant.add(stem);

        // Tomato foliage clusters (4 layers of leaves)
        for (let l = 0; l < 4; l++) {
          const y = 0.5 + l * 0.35;
          const leafScale = 1.0 - l * 0.15;
          for (let a = 0; a < 4; a++) {
            const angle = (a * Math.PI) / 2 + l * 0.6;
            const branchGeo = new THREE.ConeGeometry(0.35 * leafScale, 0.7 * leafScale, 5);
            branchGeo.rotateX(Math.PI / 2.5);
            const branch = new THREE.Mesh(branchGeo, leafMat);
            branch.position.set(
              Math.cos(angle) * 0.35, 
              y, 
              Math.sin(angle) * 0.35
            );
            branch.rotation.y = angle;
            branch.castShadow = true;
            plant.add(branch);
          }
        }

        // Hanging Tomato Fruits (Red & Green)
        const fruitMatRed = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3 });
        const fruitMatGreen = new THREE.MeshStandardMaterial({ color: 0x8bc34a, roughness: 0.4 });
        
        const fruitPositions = [
          { x: 0.28, y: 0.65, z: 0.15, mat: fruitMatRed, r: 0.13 },
          { x: -0.25, y: 0.75, z: 0.22, mat: fruitMatRed, r: 0.12 },
          { x: 0.18, y: 0.95, z: -0.26, mat: fruitMatGreen, r: 0.1 },
          { x: -0.15, y: 1.15, z: -0.18, mat: fruitMatGreen, r: 0.09 },
        ];

        fruitPositions.forEach(fp => {
          const fruitGeo = new THREE.SphereGeometry(fp.r, 12, 12);
          const fruit = new THREE.Mesh(fruitGeo, fp.mat);
          fruit.position.set(fp.x, fp.y, fp.z);
          fruit.castShadow = true;
          plant.add(fruit);
        });

      } else if (type === 'Chili') {
        // Chili upright bush
        const stemGeo = new THREE.CylinderGeometry(0.05, 0.09, 1.3, 8);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.65;
        stem.castShadow = true;
        plant.add(stem);

        // Canopy leaves
        for (let l = 0; l < 3; l++) {
          const y = 0.4 + l * 0.35;
          for (let a = 0; a < 5; a++) {
            const angle = (a * 2 * Math.PI) / 5;
            const leafGeo = new THREE.ConeGeometry(0.3, 0.6, 5);
            leafGeo.rotateX(Math.PI / 3);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(Math.cos(angle) * 0.3, y, Math.sin(angle) * 0.3);
            leaf.rotation.y = angle;
            leaf.castShadow = true;
            plant.add(leaf);
          }
        }

        // Hanging Chili Peppers (curved conical)
        const chiliMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.35 });
        const chiliPositions = [
          { x: 0.22, y: 0.55, z: 0.18 },
          { x: -0.2, y: 0.62, z: -0.15 },
          { x: 0.12, y: 0.78, z: -0.22 }
        ];

        chiliPositions.forEach(cp => {
          const chiliGeo = new THREE.ConeGeometry(0.06, 0.28, 6);
          chiliGeo.rotateX(Math.PI);
          const chili = new THREE.Mesh(chiliGeo, chiliMat);
          chili.position.set(cp.x, cp.y, cp.z);
          chili.castShadow = true;
          plant.add(chili);
        });

      } else if (type === 'Paddy') {
        // Paddy Rice: Clusters of thin tillers
        const numTillers = 14;
        for (let t = 0; t < numTillers; t++) {
          const angle = (t * 2 * Math.PI) / numTillers;
          const dist = 0.08 + Math.random() * 0.12;
          const tillerHeight = 1.1 + Math.random() * 0.3;
          
          const tillerGeo = new THREE.CylinderGeometry(0.012, 0.025, tillerHeight, 4);
          const tiller = new THREE.Mesh(tillerGeo, leafMat);
          tiller.position.set(
            Math.cos(angle) * dist,
            tillerHeight / 2,
            Math.sin(angle) * dist
          );
          tiller.rotation.x = (Math.random() - 0.5) * 0.25;
          tiller.rotation.z = (Math.random() - 0.5) * 0.25;
          tiller.castShadow = true;
          plant.add(tiller);

          // Golden rice grain panicle on top
          const panicleGeo = new THREE.CylinderGeometry(0.015, 0.03, 0.3, 4);
          const panicleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.6 });
          const panicle = new THREE.Mesh(panicleGeo, panicleMat);
          panicle.position.set(
            tiller.position.x,
            tillerHeight + 0.12,
            tiller.position.z
          );
          panicle.rotation.z = 0.3;
          plant.add(panicle);
        }

      } else {
        // Groundnut (Spreading ground cover with low leaves)
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.6, 6);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.3;
        stem.castShadow = true;
        plant.add(stem);

        for (let a = 0; a < 6; a++) {
          const angle = (a * 2 * Math.PI) / 6;
          const leafGeo = new THREE.SphereGeometry(0.25, 6, 6);
          leafGeo.scale(1.2, 0.4, 0.8);
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.set(Math.cos(angle) * 0.4, 0.3, Math.sin(angle) * 0.4);
          leaf.castShadow = true;
          plant.add(leaf);
        }
      }

      // If critical stress, rotate plant slightly to simulate wilting
      if (plantHealth < 40) {
        plant.rotation.z = 0.18;
        plant.rotation.x = 0.15;
      }

      return plant;
    };

    // Populate field rows with plants
    const plantsPerRow = 5;
    const plantSpacing = 2.4;

    for (let r = 0; r < numRows; r++) {
      const zPos = (r - (numRows - 1) / 2) * rowSpacing;
      for (let p = 0; p < plantsPerRow; p++) {
        const xPos = (p - (plantsPerRow - 1) / 2) * plantSpacing;
        
        const cropInstance = createCropPlant(cropType, health);
        cropInstance.position.set(xPos, 0.25, zPos);
        cropInstance.rotation.y = Math.random() * Math.PI * 2;
        plantsGroup.add(cropInstance);
      }
    }

    // 9. ESP32 IoT Monitoring Station Model (Tower with Solar Panel & Antenna)
    const iotStation = new THREE.Group();
    iotStation.position.set(5.5, 0, 5.5);

    // Mast pole
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.8, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 1.9;
    mast.castShadow = true;
    iotStation.add(mast);

    // Sensor Enclosure box
    const boxGeo = new THREE.BoxGeometry(0.5, 0.6, 0.35);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 2.5, 0.2);
    box.castShadow = true;
    iotStation.add(box);

    // Solar Panel on top
    const panelGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
    panelGeo.rotateX(-Math.PI / 6);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 3.8, 0);
    iotStation.add(panel);

    // LED Status Beacon
    let ledColor = plantStatus === 'Healthy' ? 0x10b981 : plantStatus === 'Attention' ? 0xf59e0b : 0xef4444;
    const ledGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 3.95, 0);
    iotStation.add(led);

    // Soil moisture probe going into ground
    const probeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
    const probeMat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
    const probe = new THREE.Mesh(probeGeo, probeMat);
    probe.position.set(0.3, -0.4, 0.3);
    iotStation.add(probe);

    scene.add(iotStation);

    // 10. Quadrant Boundary Corner Pillars (Marking 0.25 Acre)
    const corners = [
      { x: -fieldWidth / 2, z: -fieldLength / 2 },
      { x: fieldWidth / 2, z: -fieldLength / 2 },
      { x: -fieldWidth / 2, z: fieldLength / 2 },
      { x: fieldWidth / 2, z: fieldLength / 2 },
    ];

    corners.forEach(c => {
      const pillarGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.8, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(c.x, 0.9, c.z);
      pillar.castShadow = true;
      scene.add(pillar);

      const beaconGeo = new THREE.SphereGeometry(0.14, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(c.x, 1.85, c.z);
      scene.add(beacon);
    });

    // 11. Water Droplets Particle System for Drip Irrigation
    const particleCount = 60;
    const waterGeometry = new THREE.BufferGeometry();
    const waterPositions = new Float32Array(particleCount * 3);
    const waterVelocities = [];

    for (let i = 0; i < particleCount; i++) {
      const randomRow = Math.floor(Math.random() * numRows);
      const zPos = (randomRow - (numRows - 1) / 2) * rowSpacing + 0.3;
      const xPos = (Math.random() - 0.5) * (fieldWidth - 4);
      
      waterPositions[i * 3] = xPos;
      waterPositions[i * 3 + 1] = 0.4 + Math.random() * 0.4;
      waterPositions[i * 3 + 2] = zPos;

      waterVelocities.push({
        y: -0.04 - Math.random() * 0.03,
        initialY: 0.4 + Math.random() * 0.4,
        zPos
      });
    }

    waterGeometry.setAttribute('position', new THREE.BufferAttribute(waterPositions, 3));
    const waterMaterial = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.18,
      transparent: true,
      opacity: isDripActive ? 0.85 : 0.0
    });
    const waterSystem = new THREE.Points(waterGeometry, waterMaterial);
    scene.add(waterSystem);
    waterParticlesRef.current = { system: waterSystem, velocities: waterVelocities };

    // 12. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Gentle wind sway for plants
      if (plantsGroupRef.current) {
        plantsGroupRef.current.children.forEach((plant, idx) => {
          const swayOffset = idx * 0.3;
          plant.rotation.z = Math.sin(elapsedTime * 1.5 + swayOffset) * 0.035;
        });
      }

      // Animate Drip Water Particles if active
      if (waterParticlesRef.current?.system && isDripActive) {
        const positions = waterParticlesRef.current.system.geometry.attributes.position.array;
        const velocities = waterParticlesRef.current.velocities;

        for (let i = 0; i < particleCount; i++) {
          positions[i * 3 + 1] += velocities[i].y;
          if (positions[i * 3 + 1] <= 0.05) {
            positions[i * 3 + 1] = velocities[i].initialY;
          }
        }
        waterParticlesRef.current.system.geometry.attributes.position.needsUpdate = true;
      }

      // Pulse beacon LED
      led.scale.setScalar(1.0 + Math.sin(elapsedTime * 4.0) * 0.2);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 420;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [zone.zoneId, viewMode, isDripActive, moisture, airTemp, health, plantStatus, cropType]);

  // Handle Drip Irrigation Simulation trigger
  const handleToggleDrip = () => {
    const nextState = !isDripActive;
    setIsDripActive(nextState);
    if (nextState && onSimulateIrrigate) {
      onSimulateIrrigate();
    }
  };

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, 1.5, 0);
    }
  };

  const toggleAutoRotate = () => {
    const nextState = !isAutoRotating;
    setIsAutoRotating(nextState);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = nextState;
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl">
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={mountRef} 
        className="w-full h-[400px] sm:h-[480px] cursor-grab active:cursor-grabbing"
      />

      {/* Top Overlay Badge Ribbon */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <span>Live 3D Digital Twin: {zone.name}</span>
              <span className="text-emerald-400 font-extrabold">• {cropType}</span>
            </div>
            <div className="text-[10px] text-slate-300 font-medium flex items-center gap-2 mt-0.5">
              <span>{agronomy?.quadrant || 'North-West'}</span>
              <span>•</span>
              <span className="text-emerald-300">{agronomy?.acreageDisplay || '0.25 Acre (10,890 sq ft)'}</span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto flex items-center gap-1">
          <button
            onClick={() => setViewMode('realistic')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'realistic'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Realistic</span>
          </button>

          <button
            onClick={() => setViewMode('thermal')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'thermal'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Thermal ({sensorData.airTemperature.toFixed(0)}°C)</span>
          </button>
        </div>
      </div>

      {/* Floating 3D Telemetry HUD Cards (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 pointer-events-none flex flex-col gap-2 max-w-xs">
        <div className="bg-slate-900/85 backdrop-blur-md p-3 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span>Soil Moisture Condition</span>
            </span>
            <span className={`font-black ${moisture < 25 ? 'text-rose-400' : moisture < 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {moisture.toFixed(0)}%
            </span>
          </div>

          <div className="text-[11px] text-slate-300 font-medium">
            Status: <strong className="text-white">{moisture < 25 ? 'Severe Drought Stress' : moisture < 40 ? 'Moisture Deficit' : 'Optimal Hydration'}</strong>
          </div>

          <div className="text-[10px] text-slate-400">
            Soil: {crop.soilType || 'Sandy Loam'} • pH: {sensorData.soilPH.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Bottom-Right Controls Ribbon */}
      <div className="absolute bottom-4 right-4 pointer-events-auto flex items-center gap-2">
        <button
          onClick={handleToggleDrip}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg active:scale-95 border ${
            isDripActive
              ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
              : 'bg-slate-800/90 text-blue-300 hover:text-white hover:bg-blue-900/60 border-slate-700'
          }`}
          title="Toggle Drip Irrigation Emitters in 3D"
        >
          <Droplets className="w-4 h-4 text-blue-400" />
          <span>{isDripActive ? 'Drip Active (Spraying)' : 'Simulate Drip Spray'}</span>
        </button>

        <button
          onClick={toggleAutoRotate}
          className={`p-2 rounded-xl text-xs font-bold transition-all shadow-lg border ${
            isAutoRotating 
              ? 'bg-emerald-600/90 text-white border-emerald-400' 
              : 'bg-slate-800/90 text-slate-300 hover:text-white border-slate-700'
          }`}
          title={isAutoRotating ? 'Pause 360° Auto-Rotate' : 'Start 360° Auto-Rotate'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetCamera}
          className="p-2 bg-slate-800/90 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all shadow-lg border border-slate-700 hover:bg-slate-700"
          title="Reset Camera Angle"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Helper Hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none hidden sm:flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900/60 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
        <span>Drag with mouse to rotate 3D view</span>
        <span>•</span>
        <span>Scroll wheel to zoom</span>
      </div>
    </div>
  );
}
