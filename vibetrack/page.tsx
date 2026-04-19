"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import { supabase } from './lib/supabase';
import * as THREE from 'three';
import 'mapbox-gl/dist/mapbox-gl.css';

// Interfaces for VibeTrack Data
export interface VibeNode {
  node_id: string;
  lat: number;
  lng: number;
  density: number;
  vibe_score: number; // 0 (Frustrated) to 100 (High Energy)
  emotion_tag: 'High Energy' | 'Frustrated' | 'Neutral';
  x: number;
  z: number;
}

// 3D Heat-Sphere Component representing a stadium zone
const HeatSphere = ({ node }: { node: VibeNode }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Dynamic color logic based on emotion tag
  const sphereColor = useMemo(() => {
    if (node.emotion_tag === 'High Energy') return new THREE.Color(0x8A2BE2); // Neon Violet
    if (node.emotion_tag === 'Frustrated') return new THREE.Color(0xFF4500); // Orange Red
    return new THREE.Color(0x00FFCC); // Cyan for neutral
  }, [node.emotion_tag]);

  // Pulse animation based on density and vibe
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();
      const scale = 1 + (node.density / 100) * 0.5 * Math.sin(time * (node.vibe_score / 20));
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[node.x, node.density * 0.1, node.z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color={sphereColor} 
          emissive={sphereColor} 
          emissiveIntensity={node.vibe_score > 80 ? 1.5 : 0.5} 
          transparent 
          opacity={0.8} 
        />
      </mesh>
      {/* Node Label */}
      <Text position={[0, 2, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
        {node.emotion_tag}
      </Text>
    </group>
  );
};

export default function VibeTrackDigitalTwin() {
  const [nodes, setNodes] = useState<VibeNode[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: any = null;

    // 1. Initialize Mapbox GL JS dynamically to avoid Next.js SSR window errors
    if (mapContainerRef.current && typeof window !== 'undefined') {
      import('mapbox-gl').then((mapboxglModule) => {
        const mapboxgl = mapboxglModule.default || mapboxglModule;
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
        map = new mapboxgl.Map({
          container: mapContainerRef.current as HTMLDivElement,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [-74.006, 40.7128], // Default to generic stadium coordinates
          zoom: 16,
          pitch: 60,
          bearing: -20,
          antialias: true
        });
      }).catch(console.error);
    }

    // 2. Fetch Initial State from Supabase
    const fetchInitialData = async () => {
      const { data, error } = await supabase.from('stadium_nodes').select('*');
      if (!error && data) {
        // Map GPS to local 3D coordinates for Three.js
        const mappedNodes = data.map((d: any) => ({
          ...d,
          x: (d.lng - -74.006) * 10000, 
          z: (d.lat - 40.7128) * 10000
        }));
        setNodes(mappedNodes);
      }
    };
    fetchInitialData();

    // 3. Subscribe to Real-time Updates via WebSockets
    const channel = supabase
      .channel('vibe_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stadium_nodes' }, (payload: any) => {
        const updatedNode = payload.new as VibeNode;
        setNodes(currentNodes => 
          currentNodes.map(n => n.node_id === updatedNode.node_id ? {
            ...n,
            ...updatedNode,
            x: (updatedNode.lng - -74.006) * 10000,
            z: (updatedNode.lat - 40.7128) * 10000
          } : n)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (map) {
        map.remove();
      }
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 2D Spatial Map Layer */}
      <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
      
      {/* 3D Digital Twin Layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
        <Canvas camera={{ position: [0, 20, 30], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <group>
            {nodes.map(node => (
              <HeatSphere key={node.node_id} node={node} />
            ))}
          </group>
          <OrbitControls makeDefault enableZoom={true} enablePan={true} maxPolarAngle={Math.PI / 2} />
        </Canvas>
      </div>
      
      {/* UI Overlay Dashboard */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 2, background: 'rgba(0,0,0,0.7)', padding: '20px', borderRadius: '12px', color: 'white', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', background: '-webkit-linear-gradient(45deg, #8A2BE2, #00FFCC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>VibeTrack Engine</h1>
        <p style={{ margin: '10px 0 0', opacity: 0.8 }}>Live Spatial & Emotion Telemetry</p>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#8A2BE2', boxShadow: '0 0 10px #8A2BE2' }}></div>
          <span style={{ fontSize: '14px' }}>High Energy (Cheering)</span>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#FF4500', boxShadow: '0 0 10px #FF4500' }}></div>
          <span style={{ fontSize: '14px' }}>Frustration Spike (Queue/Bottleneck)</span>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#00FFCC', boxShadow: '0 0 10px #00FFCC' }}></div>
          <span style={{ fontSize: '14px' }}>Neutral / Fluid Movement</span>
        </div>
      </div>
    </div>
  );
}
