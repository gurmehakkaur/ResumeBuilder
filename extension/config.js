/**
 * Configuration file for Lazy Me Extension
 * Environment-specific settings with secure defaults
 */

// Environment configuration - change these values for different environments
const ENV_CONFIG = {
  // Set to true for development mode
  isDevelopment: false,
  // Web application URLs
  WEB_APP_URL: "https://lazy-me-five.vercel.app",
  WEB_APP_DEV_URL: "http://localhost:3000",
  // API endpoints
  API_BASE_URL: "https://lazy-me-five.vercel.app/api",
  API_DEV_BASE_URL: "http://localhost:3000/api",
};

const CONFIG = {
  // Web Application Configuration
  WEB_APP: {
    BASE_URL: ENV_CONFIG.isDevelopment
      ? ENV_CONFIG.WEB_APP_DEV_URL
      : ENV_CONFIG.WEB_APP_URL,
    LOGIN_URL:
      (ENV_CONFIG.isDevelopment
        ? ENV_CONFIG.WEB_APP_DEV_URL
        : ENV_CONFIG.WEB_APP_URL) + "/",
    RESUME_EDIT_URL:
      (ENV_CONFIG.isDevelopment
        ? ENV_CONFIG.WEB_APP_DEV_URL
        : ENV_CONFIG.WEB_APP_URL) + "/resumes",
    SETTINGS_URL:
      (ENV_CONFIG.isDevelopment
        ? ENV_CONFIG.WEB_APP_DEV_URL
        : ENV_CONFIG.WEB_APP_URL) + "/settings",
  },

  // API Configuration
  API: {
    BASE_URL: ENV_CONFIG.isDevelopment
      ? ENV_CONFIG.API_DEV_BASE_URL
      : ENV_CONFIG.API_BASE_URL,
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    ENDPOINTS: {
      USER: "/extension/user",
      MASTER_RESUME: "/extension/resume",
      TAILORED_RESUME: "/extension/resume/generate-from-linkedin",
      HEALTH: "/health",
    },
  },

  // Environment Detection
  ENVIRONMENT: {
    isDevelopment: ENV_CONFIG.isDevelopment,
    isProduction: !ENV_CONFIG.isDevelopment,
  },

  // Session Configuration
  SESSION: {
    COOKIE_NAME: "__session",
    STORAGE_KEY: "lazyme_session",
    EXPIRY_CHECK_INTERVAL: 60000, // Check every minute
  },

  // Feature Flags
  FEATURES: {
    ANALYTICS: true,
    ERROR_REPORTING: true,
    CACHING: true,
    NOTIFICATIONS: true,
  },

  // File Upload Configuration
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
      "text/plain", // TXT
      "application/json", // JSON
    ],
    ALLOWED_EXTENSIONS: [".pdf", ".docx", ".txt", ".json"],
  },
};

// Export configuration for browser (only if window exists)
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}
