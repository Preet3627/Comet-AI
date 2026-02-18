"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Loader2, Trash2 } from "lucide-react";

import { useFontLoader } from "../../hooks/useFontLoader";
import { MixpanelEvent, trackEvent } from "@/utils/mixpanel";
import TemplateService from "../../services/api/template";
import Header from "../../dashboard/components/Header";
import { toast } from "sonner";
import { CustomTemplateLayout, useCustomTemplateDetails } from "@/app/hooks/useCustomTemplates";
import { templates as templateGroups, getTemplatesByTemplateName } from "@/app/presentation-templates";

const GroupLayoutPreview = () => {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const templateParams = params.slug as string;

  // Check if this is a custom template
  const isCustom = templateParams.startsWith("custom-");
  const customTemplateId = isCustom ? templateParams.split("custom-")[1] : null;


  // Fetch static templates if not custom
  const staticTemplates = !isCustom ? getTemplatesByTemplateName(templateParams) : [];

  const staticGroup = !isCustom ? templateGroups.find((g: { id: string }) => g.id === templateParams) : null;

  // Fetch custom template details if custom
  const {
    template: customTemplate,
    loading: customLoading,
    error: customError,
    fonts: customFonts,
  } = useCustomTemplateDetails({ id: templateParams?.split("custom-")[1] || "", name: "", description: "" });



  useEffect(() => {
    const existingScript = document.querySelector('script[src*="tailwindcss.com"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, [templateParams]);

  const handleDeleteCustomTemplate = async () => {
    if (!customTemplateId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this template? This action cannot be undone."
    );
    if (!confirmed) return;

    const success = await TemplateService.deleteCustomTemplate(customTemplateId);
    if (success.success) {
      toast.success("Template deleted successfully");
      router.push("/template-preview");
    } else {
      toast.error("Failed to delete template");
    }
  };


  // Loading state for custom templates
  if (isCustom && (customLoading)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Compiling templates...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isCustom && customError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center py-24">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error loading template</h2>
          <p className="text-gray-600 mb-4">{customError}</p>
          <Button onClick={() => router.push("/template-preview")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (
    (!isCustom && (!staticGroup || staticTemplates.length === 0)) ||
    (isCustom && (!customTemplate))
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center py-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Template not found
          </h2>
          <Button onClick={() => router.push("/template-preview")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  // Determine what to render
  const templateName = isCustom ? customTemplate?.template.name || "Custom Template" : staticGroup?.name || "";
  const templateDescription = isCustom
    ? customTemplate?.template.description || ""
    : staticGroup?.description || "";
  const layoutCount = isCustom
    ? customTemplate?.layouts.length || 0
    : staticTemplates.length;

  console.log('compileLayout', customTemplate)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className=" mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4 max-w-[1440px] mx-auto">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  trackEvent(MixpanelEvent.TemplatePreview_Back_Button_Clicked, { pathname });
                  router.back();
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  trackEvent(MixpanelEvent.TemplatePreview_All_Groups_Button_Clicked, { pathname });
                  router.push("/template-preview");
                }}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                All Templates
              </Button>
            </div>

            {isCustom && (
              <div className="flex items-center gap-4">

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    trackEvent(MixpanelEvent.TemplatePreview_Delete_Templates_Button_Clicked, { pathname });
                    trackEvent(MixpanelEvent.TemplatePreview_Delete_Templates_API_Call);
                    handleDeleteCustomTemplate();
                  }}
                  className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Template
                </Button>
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{templateName}</h1>
              {isCustom && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-sm">
                  Custom
                </span>
              )}
            </div>
            <p className="text-gray-600">
              {layoutCount} layout{layoutCount !== 1 ? "s" : ""} •{" "}
              {templateDescription}
            </p>
          </div>
        </div>

      </header>

      {/* Layout Grid - Wrapped in SchemaHighlightProvider for custom templates */}
      <main className="mx-auto px-2 py-8" id="presentation-page">
        {/* Static Templates */}
        {!isCustom && (
          <div className="space-y-12 w-[1440px] h-[720px] aspect-video mx-auto">
            {staticTemplates.map((template: any, index: number) => {
              const LayoutComponent = template.component;

              return (
                <Card
                  key={`${templateParams}-${template.layoutId}-${index}`}
                  id={template.layoutId}
                  className="overflow-hidden shadow-md"
                >
                  <div className="bg-white px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {template.layoutName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                          {template.layoutDescription}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm font-mono">
                          {template.layoutId}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100 p-6 flex justify-center overflow-x-auto">
                    <div
                      className="flex-shrink-0"
                      style={{ width: "1280px", height: "720px" }}
                    >
                      <LayoutComponent data={template.sampleData} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Custom Templates - with page-level schema editor */}
        {isCustom && (

          <div className="flex flex-col items-center justify-center w-full gap-10  aspect-video mx-auto">
            {/* Slides List */}

            {customTemplate && customTemplate.layouts.map((layout: CustomTemplateLayout, index: number) => {
              const LayoutComponent = layout.component;
              return (
                <Card
                  key={`${templateParams}-${layout.layoutId}-${index}`}
                  id={layout.layoutId}
                  className="overflow-hidden shadow-md"
                >
                  <div className="bg-white px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {layout.rawLayoutName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                          {layout.layoutDescription}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end justify-end ">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm font-mono">
                        {templateParams}:{layout.layoutId}
                      </span>

                    </div>
                  </div>

                  <div className="bg-gray-100 p-6 flex justify-center overflow-x-auto">
                    <div
                      className="flex-shrink-0"
                      style={{ width: "1280px", height: "720px" }}
                    >
                      <LayoutComponent data={layout.sampleData} />
                    </div>
                  </div>
                </Card>
              );
            })}


          </div>
        )}
      </main>
    </div>
  );
};

export default GroupLayoutPreview;