import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      if (isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Decay effect when paused
        dataArray.fill(0); // Simplification, ideally we'd slowly lower values
      }

      ctx.fillStyle = 'rgba(10, 10, 10, 1)'; // Clear with dark bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2; // Scale down

        // Gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#fca5a5'); // Red/Pink top
        gradient.addColorStop(0.5, '#fcd34d'); // Yellow middle
        gradient.addColorStop(1, '#34d399'); // Green bottom

        ctx.fillStyle = gradient;
        
        // Draw standard bar
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        // Draw "peak" falling dot effect (simplified)
        // For now just the bars
        
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={80} 
      className="w-full h-full rounded bg-black/90 border border-neutral-700 shadow-inner"
    />
  );
};

export default Visualizer;
