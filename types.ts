import { Vector3 } from 'three';

export enum AppMode {
  TREE = 'TREE',       // Closed cone state
  SCATTERED = 'SCATTERED', // Floating in space
  PHOTO_ZOOM = 'PHOTO_ZOOM' // Viewing a specific photo
}

export enum GestureType {
  NONE = 'NONE',
  FIST = 'FIST',         // Trigger Tree
  OPEN_PALM = 'OPEN_PALM', // Trigger Scatter
  PINCH = 'PINCH',       // Trigger Zoom/Grab
  POINTING = 'POINTING'  // For rotation (optional)
}

export interface ParticleData {
  id: number;
  initialPos: Vector3; // Tree position
  scatteredPos: Vector3; // Random position
  type: 'SPHERE' | 'CUBE' | 'CANDY' | 'PHOTO';
  color: string;
  scale: number;
  rotationSpeed: Vector3;
  photoUrl?: string;
}

// MediaPipe global types (loaded via CDN)
declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}
