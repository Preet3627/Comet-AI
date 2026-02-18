import { useState, useEffect } from "react";
import { ProcessedSlide } from "../types";

export const useCustomLayout = () => {
  const [slides, setSlides] = useState<ProcessedSlide[]>([]);
  const [isLayoutSaved, setIsLayoutSaved] = useState(false);

  // Warning before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return "You have unsaved changes. Are you sure you want to leave?";
    };
    if (slides.length > 0 && !isLayoutSaved) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [slides, isLayoutSaved]);

  // Calculate progress
  const completedSlides = slides.filter(
    (slide) => slide.processed || slide.error
  ).length;

  return {
    slides,
    setSlides,
    completedSlides,
    isLayoutSaved,
    setIsLayoutSaved,
  };
}; 