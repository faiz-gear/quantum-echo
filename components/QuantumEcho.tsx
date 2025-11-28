import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree, createPortal, extend } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { simulationVertexShader, simulationFragmentShader } from './SimulationShader';
import { renderVertexShader, renderFragmentShader } from './RenderShader';

// --- Configuration ---
// Texture size determines particle count. 
// 128x128 = 16,384 particles. 
// 256x256 = 65,536 particles.
const SIZE = 256; 

interface QuantumEchoProps {
  webcamStream: MediaStream | null;
}

const QuantumEcho: React.FC<QuantumEchoProps> = ({ webcamStream }) => {
  const { gl, camera: mainCamera, size } = useThree();

  // 1. Setup GPGPU Scenes and Camera
  // We need a separate scene and camera for the simulation pass
  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1), []);
  
  // 2. Setup FBOs (Ping-Pong buffers)
  // We use FloatType for high precision position data
  const options = {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType, // Important: Float textures for position data
  };
  
  const currentRenderTarget = useFBO(SIZE, SIZE, options);
  const targetRenderTarget = useFBO(SIZE, SIZE, options);

  // 3. Initial Data Generation
  // Fill the texture with grid positions
  const initialDataTexture = useMemo(() => {
    const data = new Float32Array(SIZE * SIZE * 4);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        const index = (i * SIZE + j) * 4;
        // X, Y map to -5 to 5 roughly
        data[index] = (i / SIZE - 0.5) * 10; 
        data[index + 1] = (j / SIZE - 0.5) * 8; 
        data[index + 2] = 0; // Z starts at 0
        data[index + 3] = 1; // Alpha
      }
    }
    const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // 4. Webcam Texture
  const videoTexture = useMemo(() => {
    if (!webcamStream) return null;
    const video = document.createElement('video');
    video.srcObject = webcamStream;
    video.playsInline = true;
    video.muted = true;
    video.play();
    const tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [webcamStream]);

  // 5. Simulation Material
  const simulationMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: initialDataTexture },
        uWebcam: { value: null },
        uWebcamEnabled: { value: false },
        uTime: { value: 0 },
      },
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
    });
  }, [initialDataTexture]);

  // 6. Geometry for Rendering
  // Just points with a "reference" attribute that points to UV on the FBO
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(SIZE * SIZE * 3);
    const references = new Float32Array(SIZE * SIZE * 2);

    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        const index = i * SIZE + j;
        // Actual vertices don't matter much as shader overrides them, 
        // but useful for frustum culling to keep them loosely bounding box
        vertices[index * 3] = 0;
        vertices[index * 3 + 1] = 0;
        vertices[index * 3 + 2] = 0;

        // The UV coordinate in the FBO texture
        references[index * 2] = i / SIZE;
        references[index * 2 + 1] = j / SIZE;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('reference', new THREE.BufferAttribute(references, 2));
    return geometry;
  }, []);

  // 7. Render Material
  const renderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: null },
        uTime: { value: 0 },
      },
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // 8. Simulation Loop
  // To properly handle Ping-Pong in Fiber w/o mutable variables chaos:
  // We use a Ref to hold the buffers and swap them manually.
  const buffers = useRef({ read: currentRenderTarget, write: targetRenderTarget });

  useFrame((state) => {
    const { gl, clock } = state;
    
    // 1. Simulation Pass
    // Read from 'read' buffer
    simulationMaterial.uniforms.uPositions.value = buffers.current.read.texture;
    simulationMaterial.uniforms.uTime.value = clock.elapsedTime;
    if (videoTexture) {
        simulationMaterial.uniforms.uWebcam.value = videoTexture;
        simulationMaterial.uniforms.uWebcamEnabled.value = true;
    }

    // Render to 'write' buffer
    gl.setRenderTarget(buffers.current.write);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    // 2. Render Pass
    // Display the result from 'write' buffer
    renderMaterial.uniforms.uPositions.value = buffers.current.write.texture;

    // 3. Swap buffers for next frame
    const temp = buffers.current.read;
    buffers.current.read = buffers.current.write;
    buffers.current.write = temp;
  });

  return (
    <>
      {/* Simulation Scene (Off-screen) */}
      {createPortal(
        <mesh material={simulationMaterial}>
          <planeGeometry args={[2, 2]} />
        </mesh>,
        scene
      )}

      {/* Actual Rendered Particles */}
      <points geometry={particlesGeometry} material={renderMaterial} />
    </>
  );
};

export default QuantumEcho;