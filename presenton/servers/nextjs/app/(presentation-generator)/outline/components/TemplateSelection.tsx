"use client";
import React, { useEffect } from "react";

import { templates, TemplateLayoutsWithSettings } from "@/app/presentation-templates";
import { Card } from "@/components/ui/card";
import { TemplateWithData } from "@/app/presentation-templates/utils";
import { CustomTemplates, useCustomTemplateSummaries } from "@/app/hooks/useCustomTemplates";
import { Loader2 } from "lucide-react";
import { CustomTemplateCard } from "./CustomTemplateCard";
interface TemplateSelectionProps {
  selectedTemplate: (TemplateLayoutsWithSettings | string) | null;
  onSelectTemplate: (template: TemplateLayoutsWithSettings | string) => void;
}

const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  selectedTemplate,
  onSelectTemplate
}) => {


  useEffect(() => {

    const existingScript = document.querySelector(
      'script[src*="tailwindcss.com"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }

  }, []);

  const { templates: customTemplates, loading: customLoading } = useCustomTemplateSummaries();





  return (
    <div className="space-y-8 mb-4">
      {/* In Built Templates */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">In Built Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template: TemplateLayoutsWithSettings) => {
            const previewLayouts = template.layouts.slice(0, 4);

            return (
              <Card
                key={template.id}
                className={`${typeof selectedTemplate !== 'string' && selectedTemplate?.id === template.id ? 'border-2 border-blue-500' : ''} cursor-pointer hover:shadow-lg transition-all duration-200 group overflow-hidden relative`}
                onClick={() => onSelectTemplate(template)}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {template.name}
                    </h3>

                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {previewLayouts.map((layout: TemplateWithData, index: number) => {
                      const LayoutComponent = layout.component;
                      return (
                        <div
                          key={`${template.id}-preview-${index}`}
                          className="relative bg-gray-100 border border-gray-200 overflow-hidden aspect-video rounded"
                          style={{ contain: 'layout style paint' }}
                        >
                          <div className="absolute inset-0 bg-transparent z-10" />
                          <div
                            className="transform scale-[0.2] flex justify-center items-center origin-top-left w-[500%] h-[500%]"
                            style={{ transform: 'scale(0.2) translateZ(0)', backfaceVisibility: 'hidden' }}
                          >
                            <LayoutComponent data={layout.sampleData} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {typeof selectedTemplate !== 'string' && selectedTemplate?.id === template.id && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-1 rounded-bl-lg">
                    Selected
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom AI Templates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Custom AI Templates</h3>
        </div>
        {customLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading custom templates...</span>
          </div>
        ) : customTemplates.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No custom templates yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              Custom templates you create will appear here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2  gap-6">
            {customTemplates.map((template: CustomTemplates) => (

              <CustomTemplateCard
                key={template.id}
                template={template}
                onSelectTemplate={onSelectTemplate}
                selectedTemplate={typeof selectedTemplate === 'string' ? selectedTemplate : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelection;
