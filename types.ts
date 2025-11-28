import * as THREE from 'three';

export interface SimulationUniforms {
  uTime: { value: number };
  uPositions: { value: THREE.Texture | null };
  uWebcam: { value: THREE.Texture | null };
  uWebcamEnabled: { value: boolean };
}

export interface RenderUniforms {
  uPositions: { value: THREE.Texture | null };
  uTime: { value: number };
}