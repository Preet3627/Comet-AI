import { useState, useCallback, useRef } from "react";

export const useDrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slideDisplayRef = useRef<HTMLDivElement>(null);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [eraserMode, setEraserMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 1280,
    height: 720,
  });
  const [didYourDraw, setDidYourDraw] = useState(false);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const startDrawing = useCallback(
    (pos: { x: number; y: number }) => {
      const ctx = getCanvasContext();
      if (!ctx) return;

      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);

      if (eraserMode) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = strokeWidth * 2;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    },
    [eraserMode, strokeColor, strokeWidth]
  );

  const draw = useCallback(
    (pos: { x: number; y: number }) => {
      if (!isDrawing) return;
      setDidYourDraw(true);

      const ctx = getCanvasContext();
      if (!ctx) return;

      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isDrawing]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getMousePos(e);
    startDrawing(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getMousePos(e);
    draw(pos);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    startDrawing(pos);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getTouchPos(e);
    draw(pos);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    setDidYourDraw(false);
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleEraserModeChange = (isEraser: boolean) => {
    setEraserMode(isEraser);
  };

  const handleStrokeColorChange = (color: string) => {
    setStrokeColor(color);
    setEraserMode(false);
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
  };

  return {
    canvasRef,
    slideDisplayRef,
    strokeWidth,
    strokeColor,
    eraserMode,
    isDrawing,
    canvasDimensions,
    setCanvasDimensions,
    didYourDraw,
    setDidYourDraw,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleClearCanvas,
    handleEraserModeChange,
    handleStrokeColorChange,
    handleStrokeWidthChange,
  };
}; 