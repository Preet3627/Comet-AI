"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ExternalLink, Loader2, Plus } from "lucide-react";

import { templates } from "@/app/presentation-templates";
import type { TemplateLayoutsWithSettings } from "@/app/presentation-templates";
import { TemplateWithData } from "@/app/presentation-templates/utils";
import {
  useCustomTemplateSummaries,
  useCustomTemplatePreview,
  CustomTemplates,
} from "@/app/hooks/useCustomTemplates";
import { CompiledLayout } from "@/app/hooks/compileLayout";
import Header from "../dashboard/components/Header";

// Component for rendering custom template card with lazy-loaded previews
const CustomTemplateCard = ({ template }: { template: CustomTemplates }) => {
  const router = useRouter();
  const { previewLayouts, loading, totalLayouts } = useCustomTemplatePreview(template.id);

  const handleNavigate = () => {
    if (template.id.startsWith('custom-')) {
      router.push(`/template-preview/${template.id}`);
    } else {
      router.push(`/template-preview/custom-${template.id}`);
    }
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 group overflow-hidden"
      onClick={handleNavigate}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900">
            {template.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {totalLayouts}
            </span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
        </div>



        {/* Layout previews */}
        <div className="grid grid-cols-2 gap-2">
          {loading ? (
            // Loading placeholders
            [...Array(Math.min(4, template.layoutCount))].map((_, index) => (
              <div
                key={`${template.id}-loading-${index}`}
                className="relative bg-gradient-to-br from-purple-50 to-blue-50 border border-gray-200 overflow-hidden aspect-video rounded flex items-center justify-center"
              >
                <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
              </div>
            ))
          ) : previewLayouts.length > 0 ? (
            // Actual layout previews
            previewLayouts.slice(0, 4).map((layout: CompiledLayout, index: number) => {
              const LayoutComponent = layout.component;
              return (
                <div
                  key={`${template.id}-preview-${index}`}
                  className="relative bg-gray-100 border border-gray-200 overflow-hidden aspect-video rounded"
                >
                  <div className="absolute inset-0 bg-transparent z-10" />
                  <div
                    className="transform scale-[0.12] origin-top-left"
                    style={{ width: "833.33%", height: "833.33%" }}
                  >
                    <LayoutComponent data={layout.sampleData} />
                  </div>
                </div>
              );
            })
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
    </Card>
  );
};

const LayoutPreview = () => {
  const router = useRouter();
  const { templates: customTemplates, loading: customLoading } = useCustomTemplateSummaries();
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="tailwindcss.com"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const totalStaticLayouts = templates.reduce((acc: number, g: TemplateLayoutsWithSettings) => acc + g.layouts.length, 0);
  const totalCustomLayouts = customTemplates.reduce((acc: number, t: CustomTemplates) => acc + t.layoutCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Templates</h1>
          <p className="text-gray-600 mt-2">
            {totalStaticLayouts + totalCustomLayouts} layouts across{" "}
            {templates.length + customTemplates.length} templates
          </p>
        </div>

        {/* Inbuilt Templates Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Inbuilt Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((template: TemplateLayoutsWithSettings) => {
              const previewLayouts = template.layouts.slice(0, 4);

              return (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 group overflow-hidden"
                  onClick={() => router.push(`/template-preview/${template.id}`)}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900 capitalize">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {template.layouts.length}
                        </span>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
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
                          >
                            <div className="absolute inset-0 bg-transparent z-10" />
                            <div
                              className="transform scale-[0.12] origin-top-left"
                              style={{ width: "833.33%", height: "833.33%" }}
                            >
                              <LayoutComponent data={layout.sampleData} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Custom Templates Section */}
        <section>
          <div className="flex items-center justify-between mb-6">

            <h2 className="text-xl font-semibold text-gray-800 ">
              My Custom Templates
            </h2>
            <a href="/custom-template" className="text-sm flex font-bold font-inter items-center justify-center gap-2  bg-[#5146E5] text-white px-4 py-2 rounded-md">
              <Plus className="w-4 h-4" /> Create new template
            </a>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {customTemplates.map((template: CustomTemplates) => (
                <CustomTemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LayoutPreview;
