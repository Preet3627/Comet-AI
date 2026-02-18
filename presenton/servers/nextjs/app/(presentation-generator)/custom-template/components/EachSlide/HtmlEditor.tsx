'use client'
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save, X, Code } from "lucide-react";
import { ProcessedSlide } from "../../types";
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-jsx';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface HtmlEditorProps {
  slide: ProcessedSlide;
  isHtmlEditMode: boolean;
  onSave: (html: string) => void;
  onCancel: () => void;
}

export const HtmlEditor: React.FC<HtmlEditorProps> = ({
  slide,
  isHtmlEditMode,
  onSave,
  onCancel,
}) => {
  const [htmlContent, setHtmlContent] = useState(slide.html || "");

  useEffect(() => {
    setHtmlContent(slide.html || "");
  }, [slide.html]);

  if (!isHtmlEditMode) return null;

  const handleSave = () => {
    onSave(htmlContent);
  };

  const handleCancel = () => {
    setHtmlContent(slide.html || "");
    onCancel();
  };

  return (
    <Sheet open={isHtmlEditMode} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[860px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2 text-purple-800">
              <Code className="w-5 h-5 text-purple-600" />
              HTML Editor
            </span>
           
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-2 overflow-y-auto h-[85%]">
          <div className="container__content_area">
            <Editor
              value={htmlContent}
              onValueChange={html => setHtmlContent(html)}
              highlight={code => highlight(code, languages.jsx!, 'jsx')}
              padding={10}
              id="html-editor"
              name="html-editor"
              className="container__editor"
            />
          </div>
        </div>
         <SheetFooter className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center justify-between w-full">
           <div></div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex items-center gap-1"
              >
                <X size={14} />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                <Save size={14} />
                Save HTML
              </Button>
            </div>
          </SheetTitle>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}; 