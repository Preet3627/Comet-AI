import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";

interface SaveLayoutButtonProps {
  onSave: () => void;
  isSaving: boolean;
  isProcessing: boolean;
}

export const SaveLayoutButton: React.FC<SaveLayoutButtonProps> = ({
  onSave,
  isSaving,
  isProcessing,
}) => {
  
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Button
        onClick={onSave}
        disabled={isSaving || isProcessing}
        className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-10 py-3 text-lg"
        size="lg"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Saving Template...
          </>
        ) : (
          <>
            <FileText className="w-5 h-5 mr-2" />
            Save as Template
          </>
        )}
      </Button>
    </div>
  );
}; 