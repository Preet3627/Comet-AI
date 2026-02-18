'use client'

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Eraser, RotateCcw, SendHorizontal, X } from "lucide-react";
import { EditControlsProps } from "../../types";

export const EditControls: React.FC<EditControlsProps> = ({
  isEditMode,
  prompt,
  isUpdating,
  strokeWidth,
  strokeColor,
  eraserMode,
  onPromptChange,
  onSave,
  onCancel,
  onStrokeWidthChange,
  onStrokeColorChange,
  onEraserModeChange,
  onClearCanvas,
}) => {
  const colors = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
  ];

  const strokeWidths = [1, 3, 5, 8, 12];

  if (!isEditMode) return null;

  return (
    <div className="border-2 max-w-[1280px] mx-auto border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
      {/* Drawing Tools */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Drawing Tools */}
          <div className="flex items-center gap-2">
            <Button
              variant={!eraserMode ? "default" : "outline"}
              size="sm"
              onClick={() => onEraserModeChange(false)}
              className="flex items-center gap-1"
            >
              <Pencil size={14} />
              Draw
            </Button>

            <Button
              variant={eraserMode ? "default" : "outline"}
              size="sm"
              onClick={() => onEraserModeChange(true)}
              className="flex items-center gap-1"
            >
              <Eraser size={14} />
              Erase
            </Button>
          </div>

          {/* Color Picker */}
          {!eraserMode && (
            <div className="flex items-center gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className={`w-5 h-5 rounded-full border-2 ${
                    strokeColor === color
                      ? "border-gray-800"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onStrokeColorChange(color)}
                />
              ))}
            </div>
          )}

          {/* Stroke Width */}
          <div className="flex items-center gap-1">
            {strokeWidths.map((width) => (
              <button
                key={width}
                className={`w-7 h-7 rounded border flex items-center justify-center ${
                  strokeWidth === width
                    ? "bg-blue-100 border-blue-500"
                    : "border-gray-300"
                }`}
                onClick={() => onStrokeWidthChange(width)}
              >
                <div
                  className="rounded-full bg-gray-800"
                  style={{
                    width: `${width + 1}px`,
                    height: `${width + 1}px`,
                  }}
                />
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onClearCanvas}
            className="flex items-center gap-1"
          >
            <RotateCcw size={14} />
            Clear
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex items-center gap-1"
        >
          <X size={14} />
          Cancel
        </Button>
      </div>

      {/* Prompt Section */}
      <div className="space-y-2 mt-2">
        <label
          htmlFor="edit-prompt"
          className="text-sm font-medium font-inter text-gray-700"
        >
          Describe the changes you want to make:
        </label>
        <div className="flex gap-2">
          <Textarea
            id="edit-prompt"
            placeholder="Enter your prompt here... (e.g., 'Change the title color to blue', 'Add a border to the image', etc.)"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="flex-1 font-inter duration-300 h-[70px] border-blue-200 border-2 rounded-lg outline-none focus:border-blue-500 focus:ring-0 max-h-[70px] resize-none"
            disabled={isUpdating}
          />
          <div>
            <Button
              onClick={onSave}
              disabled={isUpdating || !prompt.trim()}
              className="flex flex-col w-28 font-inter font-semibold items-center gap-1 h-full bg-green-600 hover:bg-green-700 px-4"
            >
              {isUpdating ? (
                "Updating..."
              ) : (
                <>
                  <SendHorizontal size={14} />
                  Update
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 