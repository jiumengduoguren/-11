import React, { useMemo, useRef, useState } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, TextureLoader, Color } from 'three';
import { Sparkles, Float } from '@react-three/drei';
import { ParticleData, AppMode } from '../types';
import { COLORS, CONFIG } from '../constants';

interface TreeParticlesProps {
  mode: AppMode;
  userPhotos: string[];
  handPosition: { x: number, y: number } | null; // Normalized -1 to 1
  grabbedIndex: number | null;
}

// Helper to load texture safely
const TextureImage = ({ url }: { url: string }) => {
    const texture = useLoader(TextureLoader, url);
    return <primitive attach="map" object={texture} />;
}

// --- Top Star Component ---
const TopStar = () => {
    const meshRef = useRef<any>(null);
    
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if(meshRef.current) {
            // Spin
            meshRef.current.rotation.y = t * 0.8;
            meshRef.current.rotation.z = Math.sin(t * 2) * 0.1;
            // Pulse
            const scale = 1 + Math.sin(t * 3) * 0.1;
            meshRef.current.scale.setScalar(scale);
        }
    });

    const yPos = CONFIG.TREE_HEIGHT / 2; // Top of the tree

    return (
        <group position={[0, yPos, 0]}>
             <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <mesh ref={meshRef}>
                    <octahedronGeometry args={[1.2, 0]} />
                    <meshStandardMaterial 
                        color="#FFD700"
                        emissive="#FFD700"
                        emissiveIntensity={4}
                        toneMapped={false}
                        roughness={0.1}
                        metalness={1}
                    />
                </mesh>
            </Float>
            <pointLight intensity={2} distance={20} color="#FFD700" decay={2} />
            {/* Outer Glow Halo */}
            <mesh>
                <sphereGeometry args={[1.8, 16, 16]} />
                <meshBasicMaterial color="#FFD700" transparent opacity={0.15} side={2} />
            </mesh>
        </group>
    );
};

interface PhotoMeshProps {
    data: ParticleData;
    index: number;
    mode: AppMode;
    grabbedIndex: number | null;
}

const PhotoMesh: React.FC<PhotoMeshProps> = ({ data, index, mode, grabbedIndex }) => {
     const meshRef = useRef<any>();
     const { camera } = useThree();
     
     useFrame((state) => {
        const time = state.clock.getElapsedTime();
        // Target Logic
        let target = mode === AppMode.TREE ? data.initialPos : data.scatteredPos;
        
        // NOTE: In PHOTO_ZOOM, the camera moves to the photo, the photo stays put.
        // This creates a better "zoom in" effect than bringing the photo to the screen.

        // Lerp position
        if (meshRef.current) {
            meshRef.current.position.lerp(target, 0.05);
            
            // Look at camera if scattered or zoomed
            if (mode !== AppMode.TREE) {
                meshRef.current.lookAt(camera.position);
            } else {
                // Gentle spin in tree mode
                 meshRef.current.rotation.set(0, data.id * 0.1 + time * 0.5, 0);
            }
        }
     });

     // Glow Logic
     const isGrabbed = mode === AppMode.PHOTO_ZOOM && grabbedIndex === index;
     const isGlowing = mode === AppMode.SCATTERED || mode === AppMode.PHOTO_ZOOM;
     
     // Highlight the grabbed photo specifically
     const glowColor = data.photoUrl ? (isGrabbed ? '#FFFFFF' : '#222222') : '#FF8800';
     const intensity = isGrabbed ? 1.0 : (isGlowing ? 2.0 : 0.5);

     return (
        <mesh ref={meshRef} scale={[data.scale, data.scale, 0.05]}>
           <boxGeometry />
           <meshStandardMaterial 
              color={data.photoUrl ? 'white' : '#FFDD44'} 
              emissive={data.photoUrl ? 'black' : glowColor}
              emissiveIntensity={intensity}
              roughness={0.2}
              metalness={0.8}
              toneMapped={false}
            >
             {data.photoUrl && <TextureImage url={data.photoUrl} />}
            </meshStandardMaterial>
        </mesh>
     )
}

const tempObject = new Object3D();

const TreeParticles: React.FC<TreeParticlesProps> = ({ mode, userPhotos, handPosition, grabbedIndex }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const { camera } = useThree();

  // Generate particles data once
  const particles = useMemo(() => {
    const data: ParticleData[] = [];
    const geometryTypes: ('SPHERE' | 'CUBE' | 'CANDY' | 'PHOTO')[] = ['SPHERE', 'CUBE', 'CANDY'];
    
    // Add User Photos first
    const photoParticles: ParticleData[] = userPhotos.map((url, i) => ({
      id: i,
      initialPos: new Vector3(), // Calculated below
      scatteredPos: new Vector3(
        (Math.random() - 0.5) * CONFIG.SCATTER_RADIUS,
        (Math.random() - 0.5) * CONFIG.SCATTER_RADIUS,
        (Math.random() - 0.5) * CONFIG.SCATTER_RADIUS
      ),
      type: 'PHOTO',
      color: '#FFFFFF',
      scale: 1.5,
      rotationSpeed: new Vector3(Math.random() * 0.02, Math.random() * 0.02, 0),
      photoUrl: url
    }));

    // Generate Ornaments
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      const isGold = Math.random() > 0.6;
      const isRed = !isGold && Math.random() > 0.5;
      
      let color = COLORS.MATTE_GREEN.getHexString(); // Default green
      if (isGold) color = COLORS.METALLIC_GOLD.getHexString();
      if (isRed) color = COLORS.CHRISTMAS_RED.getHexString();

      const type = geometryTypes[Math.floor(Math.random() * geometryTypes.length)];
      
      data.push({
        id: i + photoParticles.length,
        initialPos: new Vector3(), 
        scatteredPos: new Vector3(
          (Math.random() - 0.5) * CONFIG.SCATTER_RADIUS * 2,
          (Math.random() - 0.5) * CONFIG.SCATTER_RADIUS * 2,
          (Math.random() - 0.5) * CONFIG.SCATTER_RADIUS * 2
        ),
        type: type,
        color: `#${color}`,
        scale: Math.random() * 0.5 + 0.3, // Slightly larger ornaments
        rotationSpeed: new Vector3(Math.random() * 0.02, Math.random() * 0.02, Math.random() * 0.02),
      });
    }

    // Assign Tree Positions (Spiral Cone with Variation)
    const allParticles = [...photoParticles, ...data];
    const total = allParticles.length;
    
    for (let i = 0; i < total; i++) {
      const p = allParticles[i];
      // Normalized height 0 (top) to 1 (bottom)
      const t = i / total; 
      
      // Calculate Spiral
      const angle = t * Math.PI * 25; // More turns
      
      // Add randomness to radius for volume/fluffy tree look
      const radiusBase = t * CONFIG.TREE_RADIUS;
      const radiusVariation = Math.random() * 1.5; 
      const radius = radiusBase + radiusVariation * (1-t); // More messy at bottom

      const y = (1 - t) * CONFIG.TREE_HEIGHT - CONFIG.TREE_HEIGHT / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      p.initialPos.set(x, y, z);
    }

    return allParticles;
  }, [userPhotos]);

  // Separate Logic for Standard Ornaments
  const ornaments = useMemo(() => particles.filter(p => p.type !== 'PHOTO'), [particles]);
  // Logic for Photos
  const photoData = useMemo(() => particles.filter(p => p.type === 'PHOTO'), [particles]);

  // Animation Loop
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // 1. Update Ornaments (Instanced Mesh)
    if (meshRef.current) {
       // Camera Interaction
       if (mode === AppMode.SCATTERED && handPosition) {
          const targetX = handPosition.x * 5;
          const targetY = handPosition.y * 5;
          camera.position.x += (targetX - camera.position.x) * CONFIG.CAMERA_SMOOTHING;
          camera.position.y += (targetY - camera.position.y) * CONFIG.CAMERA_SMOOTHING;
          camera.lookAt(0, 0, 0);
       } else if (mode === AppMode.TREE) {
          // Auto rotate tree
          const x = Math.sin(time * 0.15) * 20;
          const z = Math.cos(time * 0.15) * 20;
          camera.position.lerp(new Vector3(x, 2, z), 0.02);
          camera.lookAt(0, 0, 0);
       } else if (mode === AppMode.PHOTO_ZOOM && grabbedIndex !== null) {
          const targetPhoto = photoData[grabbedIndex % photoData.length];
          if(targetPhoto) {
              const tPos = targetPhoto.scatteredPos;
              
              // Cinematic Zoom Logic:
              // Calculate direction from photo to current camera to maintain the angle
              const direction = new Vector3().subVectors(camera.position, tPos).normalize();
              
              // Handle edge case where camera is exactly on top
              if (direction.lengthSq() < 0.001) direction.set(0, 0, 1);
              
              // Target: 2.5 units away from photo along the vector
              const targetCamPos = tPos.clone().add(direction.multiplyScalar(2.5));

              // Smooth lerp (slower for cinematic effect)
              camera.position.lerp(targetCamPos, 0.05);
              
              // Always look at the photo center
              camera.lookAt(tPos);
          }
       }

      ornaments.forEach((p, i) => {
        let pos = mode === AppMode.TREE ? p.initialPos : p.scatteredPos;
        
        // Add floating/breathing effect
        const breath = Math.sin(time * 2 + p.id) * 0.1;
        
        if (mode === AppMode.SCATTERED) {
            pos = pos.clone().add(new Vector3(0, Math.sin(time + p.id) * 0.5, 0));
        } else {
             // In tree mode, slight wobble
             pos = pos.clone().add(new Vector3(0, breath, 0));
        }

        tempObject.position.copy(pos);
        tempObject.rotation.set(
            time * p.rotationSpeed.x + breath, 
            time * p.rotationSpeed.y, 
            time * p.rotationSpeed.z
        );
        tempObject.scale.setScalar(p.scale);
        
        // Set Color
        meshRef.current!.setColorAt(i, new Color(p.color));
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  const isGlowing = mode === AppMode.SCATTERED || mode === AppMode.PHOTO_ZOOM;

  return (
    <group>
       <TopStar />
       
       {/* Magic Particles / Sparkles */}
       <Sparkles 
         count={300}
         scale={mode === AppMode.TREE ? [12, 16, 12] : [30, 30, 30]}
         size={6}
         speed={0.5}
         opacity={0.6}
         color={mode === AppMode.TREE ? "#FFD700" : "#FFFFFF"}
       />

       {/* Ornaments */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, ornaments.length]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
            roughness={0.15} 
            metalness={0.9} 
            emissive={isGlowing ? "#ffaa00" : "#330000"} 
            emissiveIntensity={isGlowing ? 2.0 : 0.3} 
            toneMapped={false}
        />
      </instancedMesh>
      
      {/* Photos */}
      {photoData.map((p, i) => (
          <PhotoMesh key={p.id} data={p} index={i} mode={mode} grabbedIndex={grabbedIndex} />
      ))}
    </group>
  );
};

export default TreeParticles;