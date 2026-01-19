import React, { useEffect, useRef, useState } from 'react';
import { detectGesture } from '../services/gestureService';
import { GestureType } from '../types';

interface HandTrackerProps {
  onGesture: (gesture: GestureType) => void;
  onHandMove: (x: number, y: number) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onGesture, onHandMove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');

    // Track mounted state to prevent accessing deleted MediaPipe objects
    let isMounted = true;
    let hands: any = null;
    let camera: any = null;

    const onResults = (results: any) => {
      if (!isMounted || !canvasCtx) return;

      // Draw webcam overlay
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.translate(canvasElement.width, 0);
      canvasCtx.scale(-1, 1); // Mirror
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          // Draw skeleton
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
          window.drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });

          // Detect Gesture
          const gesture = detectGesture(landmarks);
          onGesture(gesture);

          // Track Hand Position (use palm center / wrist)
          // Normalize to -1...1 for 3D scene control
          // MediaPipe coords are 0...1
          const wrist = landmarks[0];
          // x is inverted due to mirror
          const x = (1.0 - wrist.x) * 2 - 1; 
          const y = -(wrist.y * 2 - 1); // Invert Y for 3D space
          onHandMove(x, y);
        }
      } else {
         onGesture(GestureType.NONE);
      }
      canvasCtx.restore();
    };

    // Initialize MediaPipe Hands
    // We assume the scripts are loaded via CDN in index.html
    const initMediaPipe = async () => {
        try {
            if (!isMounted) return;

            hands = new window.Hands({
                locateFile: (file: string) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults(onResults);

            if (typeof window.Camera === 'undefined') {
                console.error("MediaPipe Camera Utils not loaded");
                return;
            }

            camera = new window.Camera(videoElement, {
                onFrame: async () => {
                    // Check if component is still mounted before sending data
                    // This prevents "Cannot pass deleted object" error
                    if (!isMounted || !hands) return;
                    try {
                        await hands.send({ image: videoElement });
                    } catch (error) {
                        console.error("MediaPipe send error:", error);
                    }
                },
                width: 320,
                height: 240
            });

            await camera.start();
            if (isMounted) {
                setCameraActive(true);
            }
        } catch (e) {
            console.error("Failed to init MediaPipe", e);
        }
    };

    initMediaPipe();

    return () => {
        isMounted = false;
        if (camera) {
            camera.stop();
        }
        if (hands) {
            hands.close();
        }
    };
  }, [onGesture, onHandMove]);

  return (
    <div className="absolute bottom-4 right-4 z-50 overflow-hidden rounded-xl border-2 border-gold-500/50 shadow-2xl bg-black/50 backdrop-blur-sm">
      {!cameraActive && <div className="absolute inset-0 flex items-center justify-center text-xs text-gold-300">Loading Camera...</div>}
      <video ref={videoRef} className="hidden" playsInline></video>
      <canvas ref={canvasRef} width={320} height={240} className="w-48 h-36 md:w-64 md:h-48" />
      <div className="absolute bottom-1 left-2 text-[10px] text-white/70">Hand Tracking Active</div>
    </div>
  );
};

export default HandTracker;