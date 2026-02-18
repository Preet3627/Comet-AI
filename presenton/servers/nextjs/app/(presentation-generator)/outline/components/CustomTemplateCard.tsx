"use client";
import React, { memo } from "react";
import { Card } from "@/components/ui/card";
import { CustomTemplates, useCustomTemplatePreview } from "@/app/hooks/useCustomTemplates";
import { Loader2 } from "lucide-react";
import { CompiledLayout } from "@/app/hooks/compileLayout";

// Memoized preview component to prevent re-renders during scroll
export const LayoutPreview = memo(({ layout, templateId, index }: { layout: CompiledLayout, templateId: string, index: number }) => {
    const LayoutComponent = layout.component;
    return (
        <div
            key={`${templateId}-preview-${index}`}
            className="relative bg-gray-100 border border-gray-200 overflow-hidden aspect-video rounded"
            style={{ contain: 'layout style paint', willChange: 'auto' }}
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
});
LayoutPreview.displayName = 'LayoutPreview';

export const CustomTemplateCard = memo(({ template, onSelectTemplate, selectedTemplate }: { template: CustomTemplates, onSelectTemplate: (template: string) => void, selectedTemplate: string | null }) => {

    const { previewLayouts, loading: customLoading } = useCustomTemplatePreview(template.id);
    const isSelected = selectedTemplate === template.id;

    return (
        <Card
            className={`${isSelected ? 'border-2 border-blue-500' : ''} cursor-pointer hover:shadow-lg transition-all duration-200 group overflow-hidden relative`}
            style={{ contain: 'layout style paint' }}
            onClick={() => {
                onSelectTemplate(template.id);
            }}
        >
            <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                        {template.name}
                    </h3>

                </div>



                {/* Layout previews */}
                <div className="grid grid-cols-2 gap-2">
                    {customLoading ? (
                        // Loading placeholders
                        [...Array(Math.min(4, template.layoutCount))].map((_, index) => (
                            <div
                                key={`${template.id}-loading-${index}`}
                                className="relative bg-gradient-to-br from-purple-50 to-blue-50 border border-gray-200 overflow-hidden aspect-video rounded flex items-center justify-center"
                            >
                                <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
                            </div>
                        ))
                    ) : previewLayouts && previewLayouts?.length > 0 ? (
                        // Actual layout previews - using memoized component
                        previewLayouts?.slice(0, 4).map((layout: CompiledLayout, index: number) => (
                            <LayoutPreview
                                key={`${template.id}-preview-${index}`}
                                layout={layout}
                                templateId={template.id}
                                index={index}
                            />
                        ))
                    ) : (
                        // Empty state placeholders
                        [...Array(Math.min(4, template.layoutCount))].map((_, index) => (
                            <div
                                key={`${template.id}-empty-${index}`}
                                className="relative bg-gray-100 border border-gray-200 overflow-hidden aspect-video rounded flex items-center justify-center"
                            >
                                <span className="text-xs text-gray-400">No preview</span>
                            </div>
                        ))
                    )}
                </div>


            </div>
            {isSelected && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-1 rounded-bl-lg">
                    Selected
                </div>
            )}
        </Card>
    );
});
CustomTemplateCard.displayName = 'CustomTemplateCard';

