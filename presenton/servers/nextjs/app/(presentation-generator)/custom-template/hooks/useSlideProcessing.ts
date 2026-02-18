import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ApiResponseHandler } from "@/app/(presentation-generator)/services/api/api-error-handler";
import { ProcessedSlide, SlideData, FontData } from "../types";

export const useSlideProcessing = (
  selectedFile: File | null,
  slides: ProcessedSlide[],
  setSlides: React.Dispatch<React.SetStateAction<ProcessedSlide[]>>,
  
  setFontsData: React.Dispatch<React.SetStateAction<FontData | null>>
) => {
  const [isProcessingPptx, setIsProcessingPptx] = useState(false);

  // Process individual slide to HTML
  const processSlideToHtml = useCallback(
    async (slide: SlideData, index: number) => {
      console.log(
        `Starting to process slide ${slide.slide_number} at index ${index}`
      );

      // Update slide to processing state
      setSlides((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, processing: true, error: undefined } : s
        )
      );

      try {
        const htmlResponse = await fetch("/api/v1/ppt/slide-to-html/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: slide.screenshot_url,
            xml: slide.xml_content,
            fonts: slide.normalized_fonts ?? [],
          }),
        });

        const htmlData = await ApiResponseHandler.handleResponse(
          htmlResponse,
          `Failed to convert slide ${slide.slide_number} to HTML`
        );

        console.log(`Successfully processed slide ${slide.slide_number}`);
        // Update slide with success
        setSlides((prev) => {
          const newSlides = prev.map((s, i) =>
            i === index
              ? {
                  ...s,
                  processing: false,
                  processed: true,
                  html: htmlData.html,
                }
              : s
          );

          // Process next slide if available
          const nextIndex = index + 1;
          if (
            nextIndex < newSlides.length &&
            !newSlides[nextIndex].processed &&
            !newSlides[nextIndex].processing
          ) {
            console.log(
              `Scheduling next slide ${nextIndex + 1} for processing`
            );
            setTimeout(() => {
              const nextSlide = newSlides[nextIndex];
              processSlideToHtml(nextSlide, nextIndex);
            }, 1000); // 1 second delay between slides
          }

          return newSlides;
        });
      } catch (error) {
        console.error(`Error processing slide ${slide.slide_number}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to convert to HTML";

        // Update slide with error
        setSlides((prev) => {
          const newSlides = prev.map((s, i) =>
            i === index
              ? {
                  ...s,
                  processing: false,
                  processed: false,
                  error: errorMessage,
                }
              : s
          );

          // Continue with next slide even if this one failed
          const nextIndex = index + 1;
          if (
            nextIndex < newSlides.length &&
            !newSlides[nextIndex].processed &&
            !newSlides[nextIndex].processing
          ) {
            console.log(`Scheduling next slide ${nextIndex + 1} after error`);
            setTimeout(() => {
              const nextSlide = newSlides[nextIndex];
              processSlideToHtml(nextSlide, nextIndex);
            }, 1000);
          }

          return newSlides;
        });
      }
    },
    []
  );

  // Process PDF or PPTX file to extract slides
  const processFile = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF or PPTX file first");
      return;
    }

    try {
      setIsProcessingPptx(true);

      const formData = new FormData();
      const fileName = selectedFile.name.toLowerCase();
      const isPdf = fileName.endsWith(".pdf");
      const isPptx = fileName.endsWith(".pptx");

      let slidesResponseData: any = null;
      if (isPdf) {
        formData.append("pdf_file", selectedFile);
        const pdfResponse = await fetch("/api/v1/ppt/pdf-slides/process", {
          method: "POST",
          body: formData,
        });
        slidesResponseData = await ApiResponseHandler.handleResponse(
          pdfResponse,
          "Failed to process PDF file"
        );
      } else if (isPptx) {
        formData.append("pptx_file", selectedFile);
        const pptxResponse = await fetch("/api/v1/ppt/pptx-slides/process", {
          method: "POST",
          body: formData,
        });
        slidesResponseData = await ApiResponseHandler.handleResponse(
          pptxResponse,
          "Failed to process PPTX file"
        );
      } else {
        throw new Error("Unsupported file type. Please upload a PDF or PPTX file.");
      }

      if (!slidesResponseData.success || !slidesResponseData.slides?.length) {
        throw new Error("No slides found in the uploaded file");
      }

      // Extract fonts data only for PPTX where available
      if (slidesResponseData.fonts) {
        setFontsData(slidesResponseData.fonts);
      }

      // Initialize slides with skeleton state; for PDF, xml/fonts won't exist
      const initialSlides: ProcessedSlide[] = slidesResponseData.slides.map(
        (slide: any) => ({
          slide_number: slide.slide_number,
          screenshot_url: slide.screenshot_url,
          xml_content: slide.xml_content ?? "",
          normalized_fonts: slide.normalized_fonts ?? [],
          processing: false,
          processed: false,
        })
      );

      setSlides(initialSlides);

      const hasUnsupported = Array.isArray(slidesResponseData.fonts?.not_supported_fonts) && slidesResponseData.fonts.not_supported_fonts.length > 0;

      toast.success(
        `Template Processing Finished`,
        {
          description: hasUnsupported
            ? `Please Upload the not supported fonts, and click Extract Template`
            : `All fonts are supported. Starting template extraction...`
        }
      );

      // If all fonts are supported, auto-start extraction from the first slide
      if (!hasUnsupported && initialSlides.length > 0) {
        const firstSlide = initialSlides[0];
        setTimeout(() => processSlideToHtml(firstSlide, 0), 300);
      }

      
    } catch (error) {
      console.error("Error processing file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Processing failed", {
        description: errorMessage,
      });
    } finally {
      setIsProcessingPptx(false);
    }
  }, [selectedFile, processSlideToHtml, setSlides, setFontsData]);

  // Retry failed slide
  const retrySlide = useCallback(
    (index: number) => {
      const slide = slides[index];
      if (slide) {
        processSlideToHtml(slide, index);
      }
    },
    [slides, processSlideToHtml]
  );

  return {
    isProcessingPptx,
    processFile,
    processSlideToHtml,
    retrySlide,
  };
}; 