/**
 * Integrations Service - Replaces base44.integrations.Core
 * Handles file uploads and AI/LLM operations
 */

import apiClient from "../clients/apiClient";

export const Core = {
  /**
   * Upload a file to the server
   * @param {Object} params - { file: File }
   * @returns {Promise<{file_url: string}>}
   */
  async UploadFile({ file }) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${apiClient.baseUrl}/api/upload/file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiClient.getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "File upload failed");
    }

    const data = await response.json();
    const payload = data?.data || data;
    return { file_url: payload.fileUrl || payload.file_url || payload.url };
  },

  /**
   * Invoke LLM for AI-powered text generation
   * @param {Object} params - { prompt, context, response_json_schema, file_urls, ... }
   * @returns {Promise<Object>}
   */
  async InvokeLLM(params) {
    const response = await apiClient.post("/api/ai/invoke", params);
    return response.data || response;
  },

  /**
   * Extract data from an uploaded file using AI
   * @param {Object} params - { file_url, extraction_type, ... }
   * @returns {Promise<Object>}
   */
  async ExtractDataFromUploadedFile(params) {
    const response = await apiClient.post("/api/upload/extract-data", params);
    return response.data || response;
  },

  /**
   * Send an email
   * @param {Object} params - { to, subject, body }
   * @returns {Promise<Object>}
   */
  async SendEmail(params) {
    const response = await apiClient.post("/api/email/send", params);
    return response.data || response;
  },
};

export const integrations = {
  Core,
};

export default integrations;
