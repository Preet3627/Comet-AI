import { getHeaderForFormData } from "./header";
import { ApiResponseHandler } from "./api-error-handler";
import { ImageAssetResponse } from "./types";


export class ImagesApi {
 
 static async uploadImage(file: File): Promise<ImageAssetResponse> {
    try {
          const formData = new FormData();
      formData.append("file", file);
    const response = await fetch(`/api/v1/ppt/images/upload`, {
      method: "POST",
      headers: getHeaderForFormData(),
      body: formData,
    });
    return await ApiResponseHandler.handleResponse(response, "Failed to upload image") as ImageAssetResponse;
  } catch (error:any) {
    console.log("Upload error:", error.message);
    throw error;
  }
  }

  static async getUploadedImages(): Promise<ImageAssetResponse[]> {
    try {
    const response = await fetch(`/api/v1/ppt/images/uploaded`);
   return await ApiResponseHandler.handleResponse(response, "Failed to get uploaded images") as ImageAssetResponse[];
  } catch (error:any) {
    console.log("Get uploaded images error:", error);
    throw error;
  }
  }

  static async deleteImage(image_id: string): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`/api/v1/ppt/images/${image_id}`, {
        method: "DELETE"
      });
      return await ApiResponseHandler.handleResponse(response, "Failed to delete image") as {success: boolean, message?: string};
    } catch (error:any) {
      console.log("Delete image error:", error);
      throw error;
    }
  }
}


