import { GestureType } from '../types';

// Helper to calculate distance between two landmarks
const dist = (p1: any, p2: any) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const detectGesture = (landmarks: any[]): GestureType => {
  if (!landmarks || landmarks.length === 0) return GestureType.NONE;

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const thumbIp = landmarks[3]; // Thumb IP joint
  const indexPip = landmarks[6]; // Index PIP joint
  
  // Calculate distances from fingertips to wrist
  const tips = [indexTip, middleTip, ringTip, pinkyTip];
  const pips = [indexPip, landmarks[10], landmarks[14], landmarks[18]]; // Knuckles
  
  // 1. Check for Fist (Fingertips close to palm/wrist)
  let foldedFingers = 0;
  for (let i = 0; i < 4; i++) {
    // If tip is closer to wrist than the PIP joint is, it's folded
    if (dist(tips[i], wrist) < dist(pips[i], wrist)) {
      foldedFingers++;
    }
  }
  
  // Thumb is tricky, check if it crosses the palm
  const isThumbFolded = dist(thumbTip, pinkyTip) < 0.2; 
  if (foldedFingers >= 3 && isThumbFolded) {
    return GestureType.FIST;
  }

  // 2. Check for Pinch (Index and Thumb close together)
  const pinchDist = dist(thumbTip, indexTip);
  if (pinchDist < 0.05) {
    return GestureType.PINCH;
  }

  // 3. Check for Open Palm (All fingers extended)
  // If tips are far from wrist and spread out
  if (foldedFingers === 0 && pinchDist > 0.1) {
    return GestureType.OPEN_PALM;
  }

  return GestureType.NONE;
};
