import type React from "react";
// Types for Custom Layout functionality
export interface SlideData {
  slide_number: number;
  screenshot_url: string;
  xml_content?: string;
  normalized_fonts?: string[];
}

export interface UploadedFont {
  fontName: string;
  fontUrl: string;
  fontPath: string;
}

export interface ProcessedSlide extends SlideData {
  html?: string;
  uploaded_fonts?: string[];
  processing?: boolean;
  processed?: boolean;
  error?: string;
  modified?: boolean; 
  convertingToReact?: boolean; // indicates HTML-to-React conversion in progress
}

export interface FontData {
  internally_supported_fonts: {
    name: string;
    google_fonts_url: string;
  }[];
  not_supported_fonts: string[];
} 

export interface EachSlideProps {
  slide: ProcessedSlide;
  index: number;
  retrySlide: (index: number) => void;
  setSlides: React.Dispatch<React.SetStateAction<ProcessedSlide[]>>;
  onSlideUpdate?: (updatedSlideData: any) => void;
  isProcessing: boolean;
}

export interface DrawingCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  slideDisplayRef: React.RefObject<HTMLDivElement>;
  strokeWidth: number;
  strokeColor: string;
  eraserMode: boolean;
  isDrawing: boolean;
  canvasDimensions: { width: number; height: number };
  onStrokeWidthChange: (width: number) => void;
  onStrokeColorChange: (color: string) => void;
  onEraserModeChange: (isEraser: boolean) => void;
  onClearCanvas: () => void;
}

export interface EditControlsProps {
  isEditMode: boolean;
  prompt: string;
  isUpdating: boolean;
  strokeWidth: number;
  strokeColor: string;
  eraserMode: boolean;
  onPromptChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStrokeWidthChange: (width: number) => void;
  onStrokeColorChange: (color: string) => void;
  onEraserModeChange: (isEraser: boolean) => void;
  onClearCanvas: () => void;
}

export interface SlideActionsProps {
  slide: ProcessedSlide;
  index: number;
  isProcessing: boolean;
  isEditMode: boolean;
  isHtmlEditMode: boolean;
  onEditClick: () => void;
  onHtmlEditClick: () => void;
  onRetry: () => void;
  onDelete: () => void;
}

export interface SlideContentDisplayProps {
  slide: ProcessedSlide;
  isEditMode: boolean;
  isHtmlEditMode: boolean;
  slideContentRef: React.RefObject<HTMLDivElement>;
  slideDisplayRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  canvasDimensions: { width: number; height: number };
  strokeWidth: number;
  strokeColor: string;
  eraserMode: boolean;
  isDrawing: boolean;
  didYourDraw: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  retrySlide: (slideNumber: number) => void;
}

export interface HtmlEditorProps {
  slide: ProcessedSlide;
  isHtmlEditMode: boolean;
  onSave: (html: string) => void;
  onCancel: () => void;
} 