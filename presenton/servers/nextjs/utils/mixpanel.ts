'use client';

import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = 'd726e8bea8ec147f4c7720060cb2e6d1';

export enum MixpanelEvent {
  PageView = 'Page View',
  Navigation = 'Navigation',
  Home_SaveConfiguration_Button_Clicked = 'Home Save Configuration Button Clicked',
  Home_SaveConfiguration_API_Call = 'Home Save Configuration API Call',
  Home_CheckOllamaModelPulled_API_Call = 'Home Check Ollama Model Pulled API Call',
  Home_DownloadOllamaModel_API_Call = 'Home Download Ollama Model API Call',
  Outline_Generate_Presentation_Button_Clicked = 'Outline Generate Presentation Button Clicked',
  Outline_Select_Template_Button_Clicked = 'Outline Select Template Button Clicked',
  Outline_Add_Slide_Button_Clicked = 'Outline Add Slide Button Clicked',
  Presentation_Prepare_API_Call = 'Presentation Prepare API Call',
  Presentation_Stream_API_Call = 'Presentation Stream API Call',
  Group_Layout_Selected_Clicked = 'Group Layout Selected Clicked',
  Header_Export_PDF_Button_Clicked = 'Header Export PDF Button Clicked',
  Header_Export_PPTX_Button_Clicked = 'Header Export PPTX Button Clicked',
  Header_UpdatePresentationContent_API_Call = 'Header Update Presentation Content API Call',
  Header_ExportAsPDF_API_Call = 'Header Export As PDF API Call',
  Header_GetPptxModel_API_Call = 'Header Get PPTX Model API Call',
  Header_ExportAsPPTX_API_Call = 'Header Export As PPTX API Call',
  Slide_Add_New_Slide_Button_Clicked = 'Slide Add New Slide Button Clicked',
  Slide_Delete_Slide_Button_Clicked = 'Slide Delete Slide Button Clicked',
  Slide_Update_From_Prompt_Button_Clicked = 'Slide Update From Prompt Button Clicked',
  Slide_Edit_API_Call = 'Slide Edit API Call',
  Slide_Delete_API_Call = 'Slide Delete API Call',
  TemplatePreview_Back_Button_Clicked = 'Template Preview Back Button Clicked',
  TemplatePreview_All_Groups_Button_Clicked = 'Template Preview All Groups Button Clicked',
  TemplatePreview_Delete_Templates_Button_Clicked = 'Template Preview Delete Templates Button Clicked',
  TemplatePreview_Delete_Templates_API_Call = 'Template Preview Delete Templates API Call',
  TemplatePreview_Open_Editor_Button_Clicked = 'Template Preview Open Editor Button Clicked',
  CustomTemplate_Save_Templates_API_Call = 'Custom Template Save Templates API Call',
  PdfMaker_Retry_Button_Clicked = 'PDF Maker Retry Button Clicked',
  Upload_Upload_Documents_API_Call = 'Upload Upload Documents API Call',
  Upload_Decompose_Documents_API_Call = 'Upload Decompose Documents API Call',
  Upload_Create_Presentation_API_Call = 'Upload Create Presentation API Call',
  DocumentsPreview_Create_Presentation_API_Call = 'Documents Preview Create Presentation API Call',
  DocumentsPreview_Next_Button_Clicked = 'Documents Preview Next Button Clicked',
  Settings_SaveConfiguration_Button_Clicked = 'Settings Save Configuration Button Clicked',
  Settings_SaveConfiguration_API_Call = 'Settings Save Configuration API Call',
  Settings_CheckOllamaModelPulled_API_Call = 'Settings Check Ollama Model Pulled API Call',
  Settings_DownloadOllamaModel_API_Call = 'Settings Download Ollama Model API Call',
  PresentationPage_Refresh_Page_Button_Clicked = 'Presentation Page Refresh Page Button Clicked',
  PresentationMode_Fullscreen_Toggle_Clicked = 'Presentation Mode Fullscreen Toggle Clicked',
  PresentationMode_Exit_Clicked = 'Presentation Mode Exit Clicked',
  ImageEditor_GetPreviousGeneratedImages_API_Call = 'Image Editor Get Previous Generated Images API Call',
  ImageEditor_GenerateImage_API_Call = 'Image Editor Generate Image API Call',
  ImageEditor_UploadImage_API_Call = 'Image Editor Upload Image API Call',
  Header_ReGenerate_Button_Clicked = 'Header ReGenerate Button Clicked',
}

export type MixpanelProps = Record<string, unknown>;

declare global {
  interface Window {
    __mixpanel_initialized?: boolean;
    __mixpanel_telemetry_enabled?: boolean;
  }
}

function canUseMixpanel(): boolean {
  return typeof window !== 'undefined' && Boolean(MIXPANEL_TOKEN);
}

let trackingCheckPromise: Promise<boolean> | null = null;

async function ensureTelemetryStatus(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (typeof window.__mixpanel_telemetry_enabled === 'boolean') {
    return window.__mixpanel_telemetry_enabled;
  }
  if (!trackingCheckPromise) {
    trackingCheckPromise = fetch('/api/telemetry-status')
      .then(async (res) => {
        try {
          const data = await res.json();
          const enabled = Boolean(data?.telemetryEnabled);
          window.__mixpanel_telemetry_enabled = enabled;
          return enabled;
        } catch {
          // If the API response is malformed, default to enabling tracking
          window.__mixpanel_telemetry_enabled = true;
          return true;
        }
      })
      .catch(() => {
        // If the API call fails, default to enabling tracking
        window.__mixpanel_telemetry_enabled = true;
        return true;
      });
  }
  return trackingCheckPromise;
}

export function initMixpanel(): void {
  if (!canUseMixpanel()) return;
  if (window.__mixpanel_initialized) return;
  // Ensure telemetry is allowed before initializing
  void ensureTelemetryStatus().then((enabled) => {
    if (!enabled) return;
    if (window.__mixpanel_initialized) return;
    mixpanel.init(MIXPANEL_TOKEN as string, { track_pageview: false });
    mixpanel.identify(mixpanel.get_distinct_id());
    window.__mixpanel_initialized = true;
  });
}

export function track(eventName: string, props?: Record<string, unknown>): void {
  if (!canUseMixpanel()) return;
  if (typeof window !== 'undefined' && window.__mixpanel_telemetry_enabled === false) {
    return;
  }
  if (!window.__mixpanel_initialized) {
    initMixpanel();
    return;
  }
  mixpanel.track(eventName, props);
}

export function trackEvent(event: MixpanelEvent, props?: MixpanelProps): void {
  track(event, props);
}

export function getDistinctId(): string | undefined {
  if (!canUseMixpanel()) return undefined;
  if (typeof window !== 'undefined' && window.__mixpanel_telemetry_enabled === false) {
    return undefined;
  }
  if (!window.__mixpanel_initialized) {
    initMixpanel();
    return undefined;
  }
  if (!window.__mixpanel_initialized) return undefined;
  return mixpanel.get_distinct_id();
}

export function identifyAnonymous(): void {
  if (!canUseMixpanel()) return;
  if (typeof window !== 'undefined' && window.__mixpanel_telemetry_enabled === false) {
    return;
  }
  if (!window.__mixpanel_initialized) {
    initMixpanel();
    return;
  }
  mixpanel.identify(mixpanel.get_distinct_id());
}

export default {
  initMixpanel,
  track,
  trackEvent,
  getDistinctId,
  identifyAnonymous,
};


