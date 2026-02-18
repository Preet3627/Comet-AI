import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { UploadedFont, FontData } from "../types";

export const useFontManagement = () => {
  const [UploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);
  const [fontsData, setFontsData] = useState<FontData | null>(null);

  // Load uploaded fonts dynamically
  useEffect(() => {
    UploadedFonts.forEach((font) => {
      // Check if font style already exists
      const existingStyle = document.querySelector(
        `style[data-font-url="${font.fontUrl}"]`
      );
      if (!existingStyle) {
        const style = document.createElement("style");
        style.setAttribute("data-font-url", font.fontUrl);

        // Use the actual font name for font-family
        style.textContent = `
          @font-face {
            font-family: '${font.fontName}';
            src: url('${font.fontUrl}') format('truetype');
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
    });
  }, [UploadedFonts]);

  // Load Google Fonts from fontsData
  useEffect(() => {
    if (fontsData?.internally_supported_fonts) {
      fontsData.internally_supported_fonts.forEach((font) => {
        // Check if font link already exists
        const existingFont = document.querySelector(
          `link[href="${font.google_fonts_url}"]`
        );
        // Only add if font doesn't already exist
        if (!existingFont) {
          const link = document.createElement("link");
          link.href = font.google_fonts_url;
          link.rel = "stylesheet";
          document.head.appendChild(link);
        }
      });
    }
  }, [fontsData]);

  const uploadFont = useCallback(
    async (fontName: string, file: File): Promise<string | null> => {
      // Check if font is already uploaded
      const existingFont = UploadedFonts.find((f) => f.fontName === fontName);
      if (existingFont) {
        toast.info(`Font "${fontName}" is already uploaded`);
        return existingFont.fontUrl;
      }

      // Validate file type
      const validExtensions = [".ttf", ".otf", ".woff", ".woff2", ".eot"];
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));

      if (!validExtensions.includes(fileExtension)) {
        toast.error(
          "Invalid font file type. Please upload .ttf, .otf, .woff, .woff2, or .eot files"
        );
        return null;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error("Font file size must be less than 10MB");
        return null;
      }

      try {
        const formData = new FormData();
        formData.append("font_file", file);

        const response = await fetch("/api/v1/ppt/fonts/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          const newFont: UploadedFont = {
            fontName: data.font_name || fontName,
            fontUrl: data.font_url,
            fontPath: data.font_path,
          };

          setUploadedFonts((prev) => [...prev, newFont]);
          toast.success(`Font "${fontName}" uploaded successfully`);
          return newFont.fontUrl;
        } else {
          throw new Error(data.message || "Upload failed");
        }
      } catch (error) {
        console.error("Error uploading font:", error);
        toast.error(`Failed to upload font "${fontName}"`, {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
        return null;
      }
    },
    [UploadedFonts]
  );

  const removeFont = useCallback((fontUrl: string) => {
    setUploadedFonts((prev) => prev.filter((font) => font.fontUrl !== fontUrl));

    // Remove the style element for this font
    const styleElement = document.querySelector(
      `style[data-font-url="${fontUrl}"]`
    );
    if (styleElement) {
      styleElement.remove();
    }

    toast.info("Font removed globally");
  }, []);

  const getAllUnsupportedFonts = useCallback((): string[] => {
    if (!fontsData?.not_supported_fonts) {
      return [];
    }
    return fontsData.not_supported_fonts;
  }, [fontsData]);

  return {
    UploadedFonts,
    fontsData,
    setFontsData,
    uploadFont,
    removeFont,
    getAllUnsupportedFonts,
  };
}; 