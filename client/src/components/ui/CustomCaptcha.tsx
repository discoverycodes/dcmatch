import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Shield, Calculator } from 'lucide-react';

interface CaptchaData {
  id: string;
  expression: string;
  timestamp: number;
}

interface CustomCaptchaProps {
  onCaptchaChange: (captchaId: string, answer: string) => void;
  error?: string;
}

export const CustomCaptcha: React.FC<CustomCaptchaProps> = ({ onCaptchaChange, error }) => {
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Human behavior detection
  const [mouseEvents, setMouseEvents] = useState<Array<{x: number, y: number, time: number}>>([]);
  const [keystrokes, setKeystrokes] = useState<Array<{key: string, time: number}>>([]);
  const [timeToSolve, setTimeToSolve] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateCaptcha = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/captcha/generate');
      const data = await response.json();
      setCaptcha(data);
      setAnswer('');
      setAttempts(prev => prev + 1);
      setStartTime(Date.now());
      setMouseEvents([]);
      setKeystrokes([]);
      onCaptchaChange('', '');
      
      // Draw captcha on canvas after state update
      setTimeout(() => drawCaptcha(data.expression), 100);
    } catch (error) {
      console.error('Failed to generate CAPTCHA:', error);
    } finally {
      setLoading(false);
    }
  };

  const drawCaptcha = (expression: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 280;
    canvas.height = 60;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1e40af');
    gradient.addColorStop(0.5, '#3730a3');
    gradient.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise pattern
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    // Parse numbers from backend expression (comma-separated)
    const numbers = expression.split(',').map(num => parseInt(num, 10));
    
    // Define positions in sequential order from left to right
    const positions = [
      { x: 30, y: 35 },   // Position 1
      { x: 70, y: 30 },   // Position 2  
      { x: 110, y: 40 },  // Position 3
      { x: 150, y: 25 },  // Position 4
      { x: 190, y: 35 },  // Position 5
      { x: 230, y: 30 }   // Position 6
    ];
    
    // Add diagonal lines for complexity
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, 0);
      ctx.lineTo(Math.random() * canvas.width, canvas.height);
      ctx.stroke();
    }

    // Draw scattered numbers
    numbers.forEach((num, index) => {
      const pos = positions[index];
      
      ctx.save();
      
      // Move to position
      ctx.translate(pos.x, pos.y);
      
      // Keep numbers parallel - no rotation
      
      // Vary font size for each number (even smaller)
      const fontSize = 18 + Math.random() * 4;
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add text shadow effect
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Add slight random offset for more scatter
      const offsetX = (Math.random() - 0.5) * 8;
      const offsetY = (Math.random() - 0.5) * 8;
      
      ctx.fillText(num.toString(), offsetX, offsetY);
      
      ctx.restore();
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Add decorative elements
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(20, 20, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(canvas.width - 20, canvas.height - 20, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Add border
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  };

  // Human behavior verification
  const verifyHumanBehavior = (): boolean => {
    const solvingTime = Date.now() - startTime;
    
    // Too fast (likely bot) - under 3 seconds
    if (solvingTime < 3000) return false;
    
    // Too slow (likely automated) - over 2 minutes
    if (solvingTime > 120000) return false;
    
    // Must have mouse movement
    if (mouseEvents.length < 3) return false;
    
    // Must have natural typing pattern
    if (keystrokes.length < 1) return false;
    
    // Check for natural mouse movement patterns
    const mouseVariance = mouseEvents.reduce((acc, event, index) => {
      if (index === 0) return acc;
      const prev = mouseEvents[index - 1];
      const distance = Math.sqrt(Math.pow(event.x - prev.x, 2) + Math.pow(event.y - prev.y, 2));
      return acc + distance;
    }, 0) / mouseEvents.length;
    
    // Natural mouse movement should have some variance
    if (mouseVariance < 5) return false;
    
    return true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMouseEvents(prev => [...prev, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        time: Date.now()
      }].slice(-20)); // Keep last 20 movements
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setKeystrokes(prev => [...prev, {
      key: e.key,
      time: Date.now()
    }].slice(-10)); // Keep last 10 keystrokes
  };

  const handleAnswerChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '');
    setAnswer(numericValue);
    
    if (captcha && numericValue) {
      onCaptchaChange(captcha.id, numericValue);
    } else {
      onCaptchaChange('', '');
    }
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="bg-white rounded-lg p-4 border-2 border-blue-300 shadow-inner"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Digite os números:</span>
        </div>
        <button
          onClick={generateCaptcha}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Novo
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative flex justify-center">
          <canvas
            ref={canvasRef}
            width={280}
            height={60}
            className="rounded-md border border-blue-200 bg-gradient-to-br from-blue-600 to-purple-700"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-md">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <input
            type="text"
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="123456"
            className={`w-40 px-4 py-3 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error 
                ? 'border-red-300 bg-red-50 text-red-900 focus:ring-red-500' 
                : 'border-blue-300 bg-white text-blue-900'
            }`}
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-md">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default CustomCaptcha;