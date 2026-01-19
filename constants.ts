import { Color } from 'three';

export const COLORS = {
  MATTE_GREEN: new Color('#2D5A27'),
  METALLIC_GOLD: new Color('#FFD700'),
  CHRISTMAS_RED: new Color('#C41E3A'),
  WHITE: new Color('#FFFFFF'),
  GLOW: new Color('#FFDD44')
};

export const CONFIG = {
  PARTICLE_COUNT: 150,
  TREE_HEIGHT: 12,
  TREE_RADIUS: 5,
  SCATTER_RADIUS: 15,
  CAMERA_SMOOTHING: 0.1,
  LERP_SPEED: 0.05,
};

export const INSTRUCTIONS = [
  { gesture: "✊ Fist", action: "Assemble Tree" },
  { gesture: "🖐 Open Hand", action: "Scatter / Back" },
  { gesture: "👌 Pinch", action: "Grab/Zoom Photo" },
  { gesture: "👋 Move Hand", action: "Rotate View (Scattered)" },
];