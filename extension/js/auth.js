/**
 * Authentication Service for Lazy Me Extension
 * Handles user authentication, session token management, and session persistence
 */

class AuthService {
  constructor() {
    this.sessionToken = null;
    this.userInfo = null;
    this.isAuthenticated = false;
    this.sessionCheckInterval = null;
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize the authentication service (idempotent)
   */
  async init() {
    // If already initialized, return the existing promise
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._doInit();
    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Internal initialization method
   */
  async _doInit() {
    try {

      await this.loadStoredSession();

      // If we have a session token, validate it in background without blocking initialization
      if (this.sessionToken) {

        // Don't await this - let it run in background
        this.validateSessionInBackground();
      }

    } catch (error) {
      console.error("AuthService: Failed to initialize:", error);
      this.clearSession();
    }
  }

  /**
   * Validate session in background without blocking initialization
   */
  async validateSessionInBackground() {
    try {
      const isValid = await this.validateSession();
      if (!isValid) {

        // Don't clear session immediately, let the popup controller handle it
      }
    } catch (error) {
      console.error("AuthService: Background validation error:", error);
      // Don't clear session on network errors during background validation
    }
  }

  /**
   * Load session data from Chrome storage
   */
  async loadStoredSession() {
    try {
      const result = await chrome.storage.local.get([
        CONFIG.SESSION.STORAGE_KEY,
      ]);
      const sessionData = result[CONFIG.SESSION.STORAGE_KEY];

      if (sessionData && sessionData.token && sessionData.expiresAt) {
        // Check if session is still valid
        if (new Date() < new Date(sessionData.expiresAt)) {
          this.sessionToken = sessionData.token;
          this.userInfo = sessionData.userInfo;
          this.isAuthenticated = true;

          return true;
        } else {

          await this.clearStoredSession();
        }
      }
      return false;
    } catch (error) {
      console.error("AuthService: Failed to load stored session:", error);
      return false;
    }
  }

  /**
   * Store session data in Chrome storage
   */
  async storeSession(token, userInfo, expiresAt) {
    try {
      const sessionData = {
        token,
        userInfo,
        expiresAt: expiresAt.toISOString(),
      };

      await chrome.storage.local.set({
        [CONFIG.SESSION.STORAGE_KEY]: sessionData,
      });

      this.sessionToken = token;
      this.userInfo = userInfo;
      this.isAuthenticated = true;

      // Start session monitoring
      this.startSessionMonitoring();

      return true;
    } catch (error) {
      console.error("AuthService: Failed to store session:", error);
      return false;
    }
  }

  /**
   * Clear stored session data
   */
  async clearStoredSession() {
    try {
      await chrome.storage.local.remove([CONFIG.SESSION.STORAGE_KEY]);
      this.clearSession();

    } catch (error) {
      console.error("AuthService: Failed to clear stored session:", error);
    }
  }

  /**
   * Clear current session data
   */
  clearSession() {
    this.sessionToken = null;
    this.userInfo = null;
    this.isAuthenticated = false;
    this.stopSessionMonitoring();
  }

  /**
   * Get session token from website cookies
   */
  async getSessionTokenFromWebsite() {
    try {
      // Determine the correct domain based on environment
      const domain = CONFIG.ENVIRONMENT.isDevelopment
        ? "localhost"
        : ".lazy-me-five.vercel.app";

      // Request cookies from the appropriate domain
      const cookies = await chrome.cookies.getAll({
        domain: domain,
      });

      const sessionCookie = cookies.find(
        (cookie) => cookie.name === CONFIG.SESSION.COOKIE_NAME
      );

      if (sessionCookie) {

        return sessionCookie.value;
      } else {

        return null;
      }
    } catch (error) {
      console.error(
        "AuthService: Failed to get session token from website:",
        error
      );
      return null;
    }
  }

  /**
   * Validate current session by making API call
   */
  async validateSession() {
    if (!this.sessionToken) {
      return false;
    }

    try {
      const response = await fetch(
        `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.USER}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.sessionToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.userInfo = data.user;
        this.isAuthenticated = true;

        return true;
      } else {

        await this.clearStoredSession();
        return false;
      }
    } catch (error) {
      console.error("AuthService: Session validation error:", error);
      await this.clearStoredSession();
      return false;
    }
  }

  /**
   * Attempt to sync with website session
   */
  async syncWithWebsite() {
    try {

      // Get session token from website
      const token = await this.getSessionTokenFromWebsite();

      if (!token) {
        throw new Error("No session found on website");
      }

      // Validate token by getting user info
      const response = await fetch(
        `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.USER}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API validation failed: ${response.status}`);
      }

      const data = await response.json();

      // Calculate expiry (default to 24 hours from now if not specified)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Store the session
      await this.storeSession(token, data.user, expiresAt);

      return true;
    } catch (error) {
      console.error("AuthService: Failed to sync with website:", error);
      throw error;
    }
  }

  /**
   * Start monitoring session expiry
   */
  startSessionMonitoring() {
    this.stopSessionMonitoring(); // Clear any existing interval

    this.sessionCheckInterval = setInterval(async () => {
      try {
        const isValid = await this.validateSession();
        if (!isValid) {

          // Dispatch event to notify UI
          window.dispatchEvent(new CustomEvent("sessionExpired"));
        }
      } catch (error) {
        console.error("AuthService: Session monitoring error:", error);
      }
    }, CONFIG.SESSION.EXPIRY_CHECK_INTERVAL);
  }

  /**
   * Stop monitoring session expiry
   */
  stopSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Get current user information
   */
  getUserInfo() {
    return this.userInfo;
  }

  /**
   * Get current session token
   */
  getSessionToken() {
    return this.sessionToken;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.sessionToken && this.userInfo;
  }

  /**
   * Logout user and clear session
   */
  async logout() {
    try {
      await this.clearStoredSession();

      // Dispatch event to notify UI
      window.dispatchEvent(new CustomEvent("userLoggedOut"));

      return true;
    } catch (error) {
      console.error("AuthService: Logout error:", error);
      return false;
    }
  }

  /**
   * Get authentication status for API calls
   */
  getAuthHeaders() {
    if (!this.isUserAuthenticated()) {
      throw new Error("User not authenticated");
    }

    return {
      Authorization: `Bearer ${this.sessionToken}`,
      "Content-Type": "application/json",
    };
  }
}

// Create global instance
window.authService = new AuthService();
