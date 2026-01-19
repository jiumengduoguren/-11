import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import HandTracker from './components/HandTracker';
import TreeParticles from './components/TreeParticles';
import { AppMode, GestureType } from './types';
import { COLORS, INSTRUCTIONS } from './constants';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [lastGesture, setLastGesture] = useState<GestureType>(GestureType.NONE);
  const [handPos, setHandPos] = useState<{ x: number, y: number } | null>(null);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  
  // Debounce/Transition State Ref
  // Prevent rapid toggling of states
  const transitionLock = useRef(false);

  const handleGesture = useCallback((gesture: GestureType) => {
    setLastGesture(gesture);

    if (transitionLock.current) return;

    if (gesture === GestureType.FIST && mode !== AppMode.TREE) {
      setMode(AppMode.TREE);
      setGrabbedIndex(null);
      lockTransition();
    } else if (gesture === GestureType.OPEN_PALM && mode !== AppMode.SCATTERED) {
      setMode(AppMode.SCATTERED);
      setGrabbedIndex(null);
      lockTransition();
    } else if (gesture === GestureType.PINCH) {
      // Logic for grabbing: simpler implementation
      // If we are in scattered mode, switch to Zoom
      if (mode === AppMode.SCATTERED) {
          setMode(AppMode.PHOTO_ZOOM);
          // Pick a random photo or the next one
          setGrabbedIndex(prev => (prev === null ? 0 : prev + 1));
          lockTransition();
      }
    }
  }, [mode]);

  const lockTransition = () => {
    transitionLock.current = true;
    setTimeout(() => {
      transitionLock.current = false;
    }, 1500);
  };

  const handleHandMove = useCallback((x: number, y: number) => {
    setHandPos({ x, y });
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setUserPhotos(prev => [...prev, url]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black">
      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 5, 25], fov: 60 }} gl={{ antialias: false }}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color={COLORS.GLOW} />
        <pointLight position={[-10, 5, -10]} intensity={0.5} color="red" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <TreeParticles 
          mode={mode} 
          userPhotos={userPhotos} 
          handPosition={handPos} 
          grabbedIndex={grabbedIndex}
        />

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} />
        
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} radius={0.5} />
        </EffectComposer>
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between pointer-events-none">
        <div>
           <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 font-serif drop-shadow-lg">
             Christmas Magic
           </h1>
           <p className="text-yellow-100/70 text-sm mt-2 max-w-md">
             Use your hands to control the magic.
           </p>
        </div>
        
        <div className="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl">
           <label className="flex items-center space-x-2 cursor-pointer hover:bg-white/10 p-2 rounded transition">
             <span className="text-2xl">📷</span>
             <span className="text-xs text-white font-semibold">Upload Photo</span>
             <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
           </label>
        </div>
      </div>

      {/* Instructions Panel */}
      <div className="absolute top-32 left-6 bg-black/40 backdrop-blur-md border border-yellow-500/30 p-4 rounded-xl max-w-xs pointer-events-none">
         <h3 className="text-yellow-400 font-bold mb-2 uppercase text-xs tracking-widest border-b border-yellow-500/30 pb-1">Gestures</h3>
         <ul className="space-y-2">
            {INSTRUCTIONS.map((inst, i) => (
               <li key={i} className="flex items-center justify-between text-xs text-gray-300">
                  <span className="font-mono text-lg mr-2">{inst.gesture.split(' ')[0]}</span>
                  <span>{inst.action}</span>
               </li>
            ))}
         </ul>
      </div>

      {/* Status Indicators */}
      <div className="absolute bottom-6 left-6 flex space-x-4 pointer-events-none">
         <div className={`px-4 py-2 rounded-full backdrop-blur text-xs font-bold transition-all duration-500 border
            ${mode === AppMode.TREE ? 'bg-green-900/60 text-green-200 border-green-500' : 'bg-gray-900/40 text-gray-500 border-gray-700'}`}>
            TREE MODE
         </div>
         <div className={`px-4 py-2 rounded-full backdrop-blur text-xs font-bold transition-all duration-500 border
            ${mode === AppMode.SCATTERED ? 'bg-blue-900/60 text-blue-200 border-blue-500' : 'bg-gray-900/40 text-gray-500 border-gray-700'}`}>
            SCATTERED
         </div>
         <div className={`px-4 py-2 rounded-full backdrop-blur text-xs font-bold transition-all duration-500 border
            ${mode === AppMode.PHOTO_ZOOM ? 'bg-yellow-900/60 text-yellow-200 border-yellow-500' : 'bg-gray-900/40 text-gray-500 border-gray-700'}`}>
            PHOTO ZOOM
         </div>
      </div>
      
      {/* Current Gesture Debug */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none">
         {lastGesture !== GestureType.NONE && (
            <div className="animate-pulse text-white/80 text-lg font-mono bg-black/50 px-3 py-1 rounded">
               Detected: {lastGesture}
            </div>
         )}
      </div>

      {/* Hand Tracker Component */}
      <HandTracker onGesture={handleGesture} onHandMove={handleHandMove} />
    </div>
  );
};

export default App;
