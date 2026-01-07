import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Only update dimensions if they changed to avoid flickering/performance hits
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationId = requestAnimationFrame(draw);

        if (isPlaying) {
          analyser.getByteFrequencyData(dataArray);
        } else {
          dataArray.fill(0);
        }

        // Background
        ctx.fillStyle = '#000000'; 
        ctx.fillRect(0, 0, width, height);

        // Grid Pattern
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<width; i+=20) { ctx.moveTo(i,0); ctx.lineTo(i, height); }
        for(let i=0; i<height; i+=20) { ctx.moveTo(0,i); ctx.lineTo(width, i); }
        ctx.stroke();

        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;

          // Solid color bars
          ctx.fillStyle = '#f472b6'; // pink-400
          
          // Draw distinct blocks
          const blockSize = 6;
          const blocks = Math.floor(barHeight / blockSize);
          
          for (let j = 0; j < blocks; j++) {
              ctx.fillRect(x, height - (j * blockSize) - (blockSize - 1), barWidth - 1, blockSize - 1);
          }
          
          x += barWidth + 1;
        }
      };
      draw();
    };

    // Initial render
    render();

    // Handle resizing
    const resizeObserver = new ResizeObserver(() => {
       // Re-trigger render logic or just let the loop handle it, 
       // but we need to ensure canvas dimensions update.
       // The draw loop checks dimensions, but let's force a check here.
       const dpr = window.devicePixelRatio || 1;
       canvas.width = container.clientWidth * dpr;
       canvas.height = container.clientHeight * dpr;
       ctx.scale(dpr, dpr);
    });
    
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [analyser, isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
        <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
        style={{ width: '100%', height: '100%' }}
        />
    </div>
  );
};

export default Visualizer;