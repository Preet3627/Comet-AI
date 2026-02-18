import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { ProcessedSlide } from "../types";

export const useSlideEdit = (
  slide: ProcessedSlide,
  index: number,
  onSlideUpdate?: (updatedSlideData: any) => void,
  setSlides?: React.Dispatch<React.SetStateAction<ProcessedSlide[]>>
) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [slideHtml, setSlideHtml] = useState("");
  const slideContentRef = useRef<HTMLDivElement>(null);



  // Set up canvas when entering edit mode
  useEffect(() => {
    if (isEditMode && slideContentRef.current && slide.html) {
      const rect = slideContentRef.current.getBoundingClientRect();
      setSlideHtml(slide.html);
    }
  }, [isEditMode, slide.html]);

  // Apply optimizations once after slide content is rendered in edit mode
  useEffect(() => {
    if (isEditMode && slideContentRef.current && slideHtml) {
      const slideContent = slideContentRef.current;

      slideContent.style.pointerEvents = "none";
      slideContent.style.userSelect = "none";
      slideContent.style.transform = "translateZ(0)";
      slideContent.style.willChange = "auto";
      slideContent.style.backfaceVisibility = "hidden";

      const interactiveElements = slideContent.querySelectorAll(
        "img, video, iframe, a, button, input, textarea, select"
      );

      interactiveElements.forEach((element) => {
        const el = element as HTMLElement;
        el.style.pointerEvents = "none";
        el.style.userSelect = "none";
        (el.style as any).webkitUserSelect = "none";
        (el.style as any).webkitTouchCallout = "none";
        (el.style as any).webkitUserDrag = "none";
        el.style.transform = "translateZ(0)";
        el.style.backfaceVisibility = "hidden";

        if (element.tagName === "IMG") {
          (element as HTMLImageElement).draggable = false;
        }

        el.onclick = null;
        el.onmousedown = null;
        el.onmouseup = null;
        el.onmousemove = null;
      });
    }
  }, [isEditMode, slideHtml]);

  // Convert data URL to blob for form data
  const dataURLToBlob = (dataURL: string): Blob => {
    const parts = dataURL.split(",");
    const contentType = parts[0].match(/:(.*?);/)?.[1] || "image/png";
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  };

  const handleSave = async (
    slideDisplayRef: React.RefObject<HTMLDivElement>,
    didYourDraw: boolean
  ) => {
    if (
      !slideContentRef.current ||
      !slideDisplayRef.current ||
      !slide.html
    )
      return;

    if (!prompt.trim()) {
      alert("Please enter a prompt before saving.");
      return;
    }

    setIsUpdating(true);

    try {
      // Take screenshot of the slide display area (slide only)
      const slideOnly = await html2canvas(slideDisplayRef.current, {
        backgroundColor: "#ffffff",
        scale: 1,
        logging: false,
        useCORS: true,
        ignoreElements: (element) => {
          return element.tagName === "CANVAS";
        },
      });
      let slideWithCanvas;
      if (didYourDraw) {
        // Take screenshot of the entire slide display area including canvas
        slideWithCanvas = await html2canvas(slideDisplayRef.current, {
          backgroundColor: "#ffffff",
          scale: 1,
          logging: false,
          useCORS: true,
        });
      }

      const currentHtml = slide.html;

      const currentUiImageBlob = dataURLToBlob(
        slideOnly.toDataURL("image/png")
      );
      let sketchImageBlob;
      if (didYourDraw && slideWithCanvas) {
        sketchImageBlob = dataURLToBlob(slideWithCanvas.toDataURL("image/png"));
      }

      const formData = new FormData();
      formData.append(
        "current_ui_image",
        currentUiImageBlob,
        `slide-${slide.slide_number}-current.png`
      );
      if (didYourDraw && slideWithCanvas && sketchImageBlob) {
        formData.append(
          "sketch_image",
          sketchImageBlob,
          `slide-${slide.slide_number}-sketch.png`
        );
      }
      formData.append("html", currentHtml);
      formData.append("prompt", prompt);

      const response = await fetch("/api/v1/ppt/html-edit/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const data = await response.json();

      const updatedSlideData = {
        slide_number: slide.slide_number,
        html: data.edited_html || currentHtml,
        processed: true,
        processing: false,
        error: undefined,
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

      // Exit edit mode
      setIsEditMode(false);
      setPrompt("");
    } catch (error) {
      console.error("Error updating slide:", error);
      alert(
        `Error updating slide: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setPrompt("");
  };

  return {
    isEditMode,
    isUpdating,
    prompt,
    slideContentRef,
    slideHtml,
    setPrompt,
    handleSave,
    handleEditClick,
    handleCancelEdit,
  };
}; 