import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import QuantumEcho from './components/QuantumEcho';
import { Camera, Zap, AlertCircle } from 'lucide-react'; // Assuming lucide-react or similar icons, using SVG if not

const App: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const startExperience = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 360 },
          facingMode: 'user' 
        },
        audio: false,
      });
      setStream(mediaStream);
      setStarted(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Camera access denied or unavailable. Please enable camera permissions to experience QuantumEcho.");
    }
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: false, alpha: false, stencil: false, depth: false }} dpr={[1, 2]}>
          <color attach="background" args={['#050505']} />
          
          <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={50} />
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={5} 
            maxDistance={20} 
            autoRotate={!started}
            autoRotateSpeed={0.5}
          />

          {/* Background Ambient Stars */}
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

          {/* The Main Simulation */}
          <QuantumEcho webcamStream={stream} />
          
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-between p-8">
        
        {/* Header */}
        <header className="flex flex-col items-center gap-2 mt-4 opacity-90">
          <h1 className="text-4xl md:text-6xl font-thin tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            QUANTUM<span className="font-bold">ECHO</span>
          </h1>
          <p className="text-cyan-300/60 text-xs md:text-sm tracking-widest uppercase">
            GPGPU Particle Synthesis // Visual Cortex Interface
          </p>
        </header>

        {/* Interaction Layer (Center/Bottom) */}
        {!started && (
          <div className="pointer-events-auto flex flex-col items-center gap-6 bg-black/40 backdrop-blur-md p-8 rounded-2xl border border-cyan-500/20 shadow-[0_0_30px_rgba(8,145,178,0.2)] transition-all duration-700 hover:border-cyan-500/50">
            <div className="text-center max-w-md space-y-4">
              <div className="flex justify-center text-cyan-400 mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <p className="text-gray-300 font-light leading-relaxed">
                Experience a 65,000 particle simulation driven by your presence. 
                Webcam luminance acts as a gravitational force, pushing the quantum field in real-time.
              </p>
              
              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded text-sm text-left">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                   {error}
                </div>
              )}

              <button 
                onClick={startExperience}
                className="group relative px-8 py-3 bg-cyan-900/30 overflow-hidden rounded-full transition-all hover:bg-cyan-800/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95"
              >
                <span className="relative z-10 text-cyan-100 font-medium tracking-wider flex items-center gap-2">
                  INITIALIZE SYSTEM
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-gray-500 text-xs font-mono tracking-tighter">
          RENDER_TARGET: BUFFER_FLOAT // 65K_ENTITIES
        </footer>
      </div>
    </div>
  );
};

export default App;
