import { useState } from "react";
import { ProcessedSlide } from "../types";

export const useHtmlEdit = (
  slide: ProcessedSlide,
  index: number,
  onSlideUpdate?: (updatedSlideData: any) => void,
  setSlides?: React.Dispatch<React.SetStateAction<ProcessedSlide[]>>
) => {
  const [isHtmlEditMode, setIsHtmlEditMode] = useState(false);

  const handleHtmlEditClick = () => {
    setIsHtmlEditMode(true);
  };

  const handleHtmlEditCancel = () => {
    setIsHtmlEditMode(false);
  };

  const handleHtmlSave = (html: string) => {
    const updatedSlideData = {
      slide_number: slide.slide_number,
      html: html,
      processed: true,
      processing: false,
      error: undefined,
      modified: true,
    };

    if (onSlideUpdate) {
      onSlideUpdate(updatedSlideData);
    } else if (setSlides) {
      setSlides((prevSlides) =>
        prevSlides.map((s, i) =>
          i === index ? { ...s, ...updatedSlideData } : s
        )
      );
    }

    setIsHtmlEditMode(false);
  };

  return {
    isHtmlEditMode,
    handleHtmlEditClick,
    handleHtmlEditCancel,
    handleHtmlSave,
  };
}; 