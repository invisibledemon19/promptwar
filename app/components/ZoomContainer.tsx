'use client';

import React from 'react';
import { useGestureZoom } from './useGestureZoom';

interface ZoomContainerProps {
  children: React.ReactNode;
}

export const ZoomContainer: React.FC<ZoomContainerProps> = ({ children }) => {
  const { zoomLevel, isPinching, videoRef, canvasRef } = useGestureZoom();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex items-center justify-center">
      
      {/* Hidden Video Source */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="hidden" 
        style={{ display: 'none' }}
      />
      
      {/* Visual Feedback Canvas overlay */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 50 }}>
        <canvas 
          ref={canvasRef} 
          width={320} 
          height={240} 
          style={{
            width: '160px',
            height: '120px',
            borderRadius: '12px',
            border: isPinching ? '2px solid #00FFCC' : '2px solid rgba(255,255,255,0.1)',
            backgroundColor: isPinching ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            transition: 'border 0.3s, background-color 0.3s',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        />
        {isPinching && (
          <span style={{
            position: 'absolute',
            bottom: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#00FFCC',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            Pinching
          </span>
        )}
      </div>

      {/* Main Scalable Content Container */}
      <div 
        style={{ 
          transform: `scale(${zoomLevel})`,
          transition: 'transform 75ms ease-out',
          transformOrigin: 'center',
          width: '100%',
          height: '100%'
        }}
      >
        {children}
      </div>
    </div>
  );
};
