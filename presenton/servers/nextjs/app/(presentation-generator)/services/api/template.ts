import { ApiResponseHandler } from "./api-error-handler";

class TemplateService {

    static async getCustomTemplateSummaries() {
        try {
            const response = await fetch(`/api/v1/ppt/template-management/summary`,);
            return await ApiResponseHandler.handleResponse(response, "Failed to get custom template summaries");
        } catch (error) {
            console.error("Failed to get custom template summaries", error);
            throw error;
        }
    }

    static async getCustomTemplateDetails(templateId: string) {
        try {
            const response = await fetch(`/api/v1/ppt/template-management/get-templates/${templateId}`,);
            return await ApiResponseHandler.handleResponse(response, "Failed to get custom template details");
        } catch (error) {
            console.error("Failed to get custom template details", error);
            throw error;
        }
    }

    static async deleteCustomTemplate(presentationId: string) {
        try {
            const response = await fetch(`/api/v1/ppt/template-management/delete-templates/${presentationId}`, { method: "DELETE" });
            return await ApiResponseHandler.handleResponseWithResult(response, "Failed to delete custom template");
        } catch (error) {
            console.error("Failed to delete custom template", error);
            throw error;
        }
    }
}

export default TemplateService;