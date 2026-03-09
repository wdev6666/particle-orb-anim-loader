import React, { useRef, useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { createNoise3D } from 'simplex-noise';
import './ParticleSphere.css';

const ParticleSphere = () => {
  const canvasRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isRecording) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    const noise3D = createNoise3D();
    
    const resizeCanvas = () => {
      canvas.width = 400;
      canvas.height = 400;
    };
    resizeCanvas();
    
    const numParticles = 800; // Increased density for proper round shape
    const particles = [];
    const baseRadius = 100; // Increased size to accomodate denser particles
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
    
    for (let i = 0; i < numParticles; i++) {
        const y = 1 - (i / (numParticles - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = phi * i;
        
        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;
        
        particles.push({
            bx: x, by: y, bz: z, // base direction
            size: Math.random() * 1.2 + 0.6,
            offsetX: 0,
            offsetY: 0
        });
    }
    
    let time = 0;
    let mouseX = 0;
    let mouseY = 0;
    let isHovering = false;
    
    const handleMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left - canvas.width / 2;
        mouseY = e.clientY - rect.top - canvas.height / 2;
        isHovering = true;
    };
    
    const handleMouseLeave = () => {
        isHovering = false;
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    const draw = () => {
        time += 0.003; // Slow rotation
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const cosT = Math.cos(time);
        const sinT = Math.sin(time);
        const maxDistortion = 30; // Max radius increase on hover
        
        // Setup center
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        
        for (let i = 0; i < numParticles; i++) {
            const p = particles[i];
            
            // Rotate around Y axis
            const rx = p.bx * cosT - p.bz * sinT;
            const ry = p.by;
            const rz = p.bx * sinT + p.bz * cosT;
            
            // Perlin/Simplex noise for floating effect
            const noiseVal = noise3D(rx * 1.5, ry * 1.5, time * 2);
            let currentRadius = baseRadius + noiseVal * 2; // Minimal noise for proper round shape
            
            // Initial 2D mapping
            let px = rx * currentRadius;
            let py = ry * currentRadius;
            
            // Interaction logic (Repel particles to vacate portion under cursor)
            const repelRadius = 70; // The radius of the vacated hole
            const dxToMouse = px - mouseX;
            const dyToMouse = py - mouseY;
            const dist = Math.sqrt(dxToMouse * dxToMouse + dyToMouse * dyToMouse);
            
            let targetOffsetX = 0;
            let targetOffsetY = 0;
            
            if (isHovering && dist < repelRadius) {
                const distToUse = dist === 0 ? 1 : dist;
                const pushOutAmount = repelRadius - distToUse;
                targetOffsetX = (dxToMouse / distToUse) * pushOutAmount;
                targetOffsetY = (dyToMouse / distToUse) * pushOutAmount;
            }
            
            // Smoothly ease the movement
            p.offsetX += (targetOffsetX - p.offsetX) * 0.15;
            p.offsetY += (targetOffsetY - p.offsetY) * 0.15;
            
            px += p.offsetX;
            py += p.offsetY;
            
            // Simple depth sorting & perspective
            const zPerspective = 400 / (400 - rz * currentRadius);
            const x2d = cx + px * zPerspective;
            const y2d = cy + py * zPerspective;
            
            // Calculate size and opacity based on Z depth
            const zAlpha = Math.max(0.1, Math.min(1, (rz + 1) / 2 + 0.15));
            const baseSize = p.size * zPerspective;
            const finalSize = baseSize;
            
            ctx.beginPath();
            ctx.arc(x2d, y2d, Math.max(0.1, finalSize), 0, Math.PI * 2);
            
            // Additional glow for displaced particles
            const displacement = Math.sqrt(p.offsetX * p.offsetX + p.offsetY * p.offsetY);
            const glowStrength = Math.min(displacement / repelRadius, 1);
            
            // Set dynamic glow color
            ctx.fillStyle = `rgba(168, 218, 220, ${zAlpha})`;
            ctx.shadowBlur = 8 + (glowStrength * 10);
            ctx.shadowColor = `rgba(168, 218, 220, ${zAlpha * 0.8})`;
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
        }
        
        animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
        cancelAnimationFrame(animationFrameId);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isRecording]);

  return (
    <div 
      className="particle-sphere-container" 
      ref={containerRef}
      onClick={() => setIsRecording(prev => !prev)}
    >
      <div className={`particle-sphere-wrapper ${isRecording ? 'recording' : 'idle'}`}>
        {!isRecording ? (
          <div className="mic-button">
            <Mic size={32} strokeWidth={2.5} color="#1d3557" />
          </div>
        ) : (
          <canvas className="particle-canvas" ref={canvasRef} />
        )}
      </div>
      <p className="status-text">
        {isRecording ? "Recording... (Move cursor & Click to stop)" : "Idle (Click to Start)"}
      </p>
    </div>
  );
};

export default ParticleSphere;
