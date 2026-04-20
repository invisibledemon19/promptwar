import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export const useGestureZoom = () => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const smoothedDistanceRef = useRef<number | null>(null);
  const EMA_ALPHA = 0.15;

  useEffect(() => {
    let handLandmarker: HandLandmarker;
    let animationFrameId: number;
    let stream: MediaStream;

    const initializeMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });

      startCamera();
    };

    const startCamera = async () => {
      if (!videoRef.current) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
      } catch (err) {
        console.error("Camera access denied or unavailable", err);
      }
    };

    let lastVideoTime = -1;
    const predictWebcam = async () => {
      if (!videoRef.current || !canvasRef.current || !handLandmarker) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        const results = handLandmarker.detectForVideo(video, performance.now());
        
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];

            const dx = thumbTip.x - indexTip.x;
            const dy = thumbTip.y - indexTip.y;
            const rawDistance = Math.sqrt(dx * dx + dy * dy);

            if (smoothedDistanceRef.current === null) {
              smoothedDistanceRef.current = rawDistance;
            } else {
              smoothedDistanceRef.current = 
                (EMA_ALPHA * rawDistance) + ((1 - EMA_ALPHA) * smoothedDistanceRef.current);
            }
            const smoothedDist = smoothedDistanceRef.current;

            const PINCH_THRESHOLD = 0.08;
            const MAX_DISTANCE = 0.25;
            
            const currentlyPinching = smoothedDist < PINCH_THRESHOLD;
            setIsPinching(currentlyPinching);

            let newZoom = 1.0;
            if (!currentlyPinching) {
              const normalized = Math.max(0, Math.min(1, (smoothedDist - PINCH_THRESHOLD) / (MAX_DISTANCE - PINCH_THRESHOLD)));
              newZoom = 1.0 + (normalized * 2.0); 
            }
            setZoomLevel(newZoom);

            if (currentlyPinching) {
              ctx.beginPath();
              ctx.moveTo(thumbTip.x * canvas.width, thumbTip.y * canvas.height);
              ctx.lineTo(indexTip.x * canvas.width, indexTip.y * canvas.height);
              ctx.strokeStyle = "#00FFCC";
              ctx.lineWidth = 4;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(thumbTip.x * canvas.width, thumbTip.y * canvas.height, 6, 0, 2 * Math.PI);
              ctx.arc(indexTip.x * canvas.width, indexTip.y * canvas.height, 6, 0, 2 * Math.PI);
              ctx.fillStyle = "#FF4500";
              ctx.fill();
            }
          } else {
            setIsPinching(false);
          }
        }
      }
      animationFrameId = window.requestAnimationFrame(predictWebcam);
    };

    initializeMediaPipe();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (handLandmarker) handLandmarker.close();
    };
  }, []);

  return { zoomLevel, isPinching, videoRef, canvasRef };
};
