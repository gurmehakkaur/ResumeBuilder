/**
 * API Service for Lazy Me Extension
 * Handles all communication with the backend server
 */

class APIService {
  constructor() {
    this.baseURL = CONFIG.API.BASE_URL;
    this.authService = window.authService;

  }

  /**
   * Generic API request method with authentication and retry logic
   */
  async request(endpoint, options = {}) {
    try {
      // Get authentication headers
      const authHeaders = this.authService.getAuthHeaders();

      // Merge headers
      const headers = {
        ...authHeaders,
        ...options.headers,
      };

      // Make the request
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle response
      if (response.ok) {
        return await response.json();
      } else {
        const errorText = await response.text();
        throw new Error(
          `API request failed: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      console.error(`APIService: Request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Get user information
   */
  async getUser() {
    return await this.request(CONFIG.API.ENDPOINTS.USER);
  }

  /**
   * Get master resume status
   */
  async getMasterResumeStatus() {
    return await this.request(CONFIG.API.ENDPOINTS.MASTER_RESUME + "/status");
  }

  /**
   * Download master resume
   */
  async downloadMasterResume() {
    try {
      const authHeaders = this.authService.getAuthHeaders();

      const response = await fetch(
        `${this.baseURL}${CONFIG.API.ENDPOINTS.MASTER_RESUME}/download`,
        {
          method: "GET",
          headers: {
            ...authHeaders,
            Accept: "application/pdf, application/octet-stream",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Download failed:", response.status, errorText);
        throw new Error(`Download failed: ${response.status} - ${errorText}`);
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "master_resume.pdf";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const contentType = response.headers.get("Content-Type");

      // Handle different content types
      if (contentType && contentType.includes("application/pdf")) {
        const blob = await response.blob();
        return { blob, filename };
      } else {
        // Handle base64 responses (fallback)
        const base64String = await response.text();
        const cleanBase64 = base64String.replace(
          /^data:application\/pdf;base64,/,
          ""
        );
        const binaryString = atob(cleanBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        return { blob, filename };
      }
    } catch (error) {
      console.error("APIService: Download failed:", error);
      throw error;
    }
  }

  /**
   * Upload master resume
   */
  async uploadMasterResume(file) {
    try {
      // Validate file type
      if (!CONFIG.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
        throw new Error(
          `Invalid file type: ${file.type}. Only PDF and DOCX files are allowed.`
        );
      }

      // Validate file size
      if (file.size > CONFIG.UPLOAD.MAX_FILE_SIZE) {
        throw new Error(
          `File too large: ${file.size} bytes. Maximum size is ${CONFIG.UPLOAD.MAX_FILE_SIZE} bytes.`
        );
      }

      // For PDF files, validate the signature
      if (file.type === "application/pdf") {
        const isValidPDF = await this._validatePDFSignature(file);
        if (!isValidPDF) {
          throw new Error(
            "Invalid PDF file format. Please ensure the file is a valid PDF document."
          );
        }
      }

      // Get authentication headers
      const authHeaders = this.authService.getAuthHeaders();

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${this.baseURL}${CONFIG.API.ENDPOINTS.MASTER_RESUME}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: authHeaders.Authorization,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("APIService: Upload failed:", error);
      throw error;
    }
  }

  /**
   * Validate PDF file signature
   */
  async _validatePDFSignature(file) {
    try {
      const buffer = await file.slice(0, 8).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Check for PDF signature (%PDF-1.)
      const pdfSignature = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]; // %PDF-1.

      for (let i = 0; i < pdfSignature.length; i++) {
        if (bytes[i] !== pdfSignature[i]) {
          console.error(
            `APIService: Invalid PDF signature at byte ${i}: expected ${pdfSignature[i]}, got ${bytes[i]}`
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("APIService: Failed to validate PDF signature:", error);
      return false;
    }
  }

  /**
   * Check API health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      console.error("APIService: Health check failed:", error);
      throw error;
    }
  }
}

// Create global instance
window.apiService = new APIService();
