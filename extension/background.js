/**
 * Background Script for Lazy Me Extension
 * Handles extension lifecycle, notifications, and cross-tab communication
 */

// Import configuration
importScripts("config.js");

/**
 * Main Background Service
 * Orchestrates all background operations
 */
class BackgroundService {
  constructor() {
    this.sessionManager = null;
    this.tabManager = null;
    this.notificationManager = null;
    this.messageHandler = null;
    this.jobSiteDetector = null;
    this.isInitialized = false;
    this.isReady = false; // Track if background service is fully ready
  }

  /**
   * Initialize the background service
   */
  async init() {
    try {
      // Initialize managers
      this.sessionManager = new SessionManager();
      this.tabManager = new TabManager();
      this.notificationManager = new NotificationManager();
      this.messageHandler = new MessageHandler();
      this.jobSiteDetector = new JobSiteDetector();

      // Set up message handler with session manager reference
      this.messageHandler.setSessionManager(this.sessionManager);

      // Initialize all managers
      await this.sessionManager.init();
      await this.tabManager.init();
      await this.notificationManager.init();
      await this.jobSiteDetector.init();

      // Set up event listeners
      this.setupEventListeners();

      // Start periodic tasks
      this.startPeriodicTasks();

      this.isInitialized = true;
      this.isReady = true;
    } catch (error) {
      console.error("BackgroundService: Initialization failed:", error);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Extension lifecycle events
    chrome.runtime.onStartup.addListener(() => this.handleStartup());
    chrome.runtime.onInstalled.addListener((details) =>
      this.handleInstalled(details)
    );

    // Tab events
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) =>
      this.handleTabUpdate(tabId, changeInfo, tab)
    );
    chrome.tabs.onActivated.addListener((activeInfo) =>
      this.handleTabActivated(activeInfo)
    );

    // Message handling
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Indicates we will send a response asynchronously
    });

    // Storage changes
    chrome.storage.onChanged.addListener((changes, namespace) =>
      this.handleStorageChange(changes, namespace)
    );

    // Notifications
    chrome.notifications.onClicked.addListener((notificationId) =>
      this.handleNotificationClick(notificationId)
    );

    // Context menu
    chrome.contextMenus.onClicked.addListener((info, tab) =>
      this.handleContextMenuClick(info, tab)
    );
  }

  /**
   * Handle extension startup
   */
  async handleStartup() {
    await this.init();
  }

  /**
   * Handle extension installation/update
   */
  async handleInstalled(details) {
    if (details.reason === "install") {
      await this.handleFirstInstall();
    } else if (details.reason === "update") {
      await this.handleUpdate(details.previousVersion);
    }

    await this.init();
  }

  /**
   * Handle first installation
   */
  async handleFirstInstall() {
    // Show welcome notification
    await this.notificationManager.showWelcomeNotification();

    // Set up context menu
    this.setupContextMenu();
  }

  /**
   * Handle extension update
   */
  async handleUpdate(previousVersion) {
    // Update context menu
    this.setupContextMenu();
  }

  /**
   * Handle tab updates
   */
  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === "complete" && tab.url) {
      // Check if this is a job site
      const isJobSite = this.jobSiteDetector.isJobSite(tab.url);

      if (isJobSite) {
        // Update badge to indicate job site
        chrome.action.setBadgeText({
          text: "JOB",
          tabId: tabId,
        });
        chrome.action.setBadgeBackgroundColor({
          color: "#4CAF50",
          tabId: tabId,
        });

        // Send message to content script
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: "JOB_SITE_DETECTED",
            url: tab.url,
          });
        } catch (error) {
          // Content script might not be ready yet
        }
      } else {
        // Clear badge for non-job sites
        chrome.action.setBadgeText({
          text: "",
          tabId: tabId,
        });
      }
    }
  }

  /**
   * Handle tab activation
   */
  async handleTabActivated(activeInfo) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);

      if (tab.url && this.jobSiteDetector.isJobSite(tab.url)) {
        // Update badge for active job site
        chrome.action.setBadgeText({
          text: "JOB",
          tabId: activeInfo.tabId,
        });
        chrome.action.setBadgeBackgroundColor({
          color: "#4CAF50",
          tabId: activeInfo.tabId,
        });
      } else {
        // Clear badge for non-job sites
        chrome.action.setBadgeText({
          text: "",
          tabId: activeInfo.tabId,
        });
      }
    } catch (error) {
      console.error("BackgroundService: Error handling tab activation:", error);
    }
  }

  /**
   * Handle messages from other extension components
   */
  handleMessage(request, sender, sendResponse) {
    // Handle each message type with proper async handling
    (async () => {
      try {
        switch (request.type) {
          case "GET_SESSION_STATUS":
            await this.messageHandler.handleGetSessionStatus(
              request,
              sendResponse
            );
            break;
          case "LOGOUT":
            await this.messageHandler.handleLogout(request, sendResponse);
            break;
          case "UPLOAD_RESUME":
            await this.messageHandler.handleResumeUpload(request, sendResponse);
            break;
          case "DOWNLOAD_RESUME":
            await this.messageHandler.handleResumeDownload(
              request,
              sendResponse
            );
            break;
          case "GET_USER_DATA":
            await this.messageHandler.handleGetUserData(request, sendResponse);
            break;
          case "GET_RESUME_STATUS":
            await this.messageHandler.handleGetResumeStatus(
              request,
              sendResponse
            );
            break;
          case "GENERATE_TAILORED_RESUME":
            await this.messageHandler.handleGenerateTailoredResume(
              request,
              sendResponse
            );
            break;
          case "CLEAR_RESUME_CACHE":
            await this.messageHandler.clearResumeStatusCache();
            sendResponse({ success: true });
            break;
          case "GET_TAB_INFO":
            await this.messageHandler.handleGetTabInfo(request, sendResponse);
            break;
          case "OPEN_WEB_APP_TAB":
            await this.messageHandler.handleOpenWebAppTab(
              request,
              sendResponse
            );
            break;
          case "FORCE_SYNC":
            await this.messageHandler.handleForceSync(request, sendResponse);
            break;
          case "FIND_WEBSITE_TAB":
            await this.messageHandler.handleFindWebsiteTab(
              request,
              sendResponse
            );
            break;
          case "FOCUS_TAB":
            await this.messageHandler.handleFocusTab(request, sendResponse);
            break;
          default:
            console.warn(
              "BackgroundService: Unknown message type:",
              request.type
            );
            sendResponse({ error: "Unknown message type" });
            break;
        }
      } catch (error) {
        console.error("BackgroundService: Error handling message:", error);
        sendResponse({ error: error.message });
      }
    })();

    // Return true to indicate we will send a response asynchronously
    return true;
  }

  /**
   * Handle storage changes
   */
  handleStorageChange(changes, namespace) {
    if (namespace === "local") {
      // Check for session changes
      if (changes.sessionToken || changes.userInfo) {
        // Broadcast session change to all tabs
        this.broadcastMessage({
          type: "SESSION_CHANGED",
          sessionToken: changes.sessionToken?.newValue,
          userInfo: changes.userInfo?.newValue,
        });
      }
    }
  }

  /**
   * Handle notification clicks
   */
  handleNotificationClick(notificationId) {
    // Clear the notification
    chrome.notifications.clear(notificationId);

    // Handle specific notification types
    if (notificationId === "welcome") {
      // Open extension popup or dashboard
      chrome.action.openPopup();
    }
  }

  /**
   * Handle context menu clicks
   */
  handleContextMenuClick(info, tab) {
    // Context menu functionality removed
  }

  /**
   * Set up context menu
   */
  setupContextMenu() {
    // Remove existing context menu
    chrome.contextMenus.removeAll();

    // Add "Generate Resume from Job Posting" option
    chrome.contextMenus.create({
      id: "generateResume",
      title: "Generate Resume from Job Posting",
      contexts: ["page"],
      documentUrlPatterns: [
        "*://*.linkedin.com/*",
        "*://*.indeed.com/*",
        "*://*.glassdoor.com/*",
        "*://*.monster.com/*",
        "*://*.ziprecruiter.com/*",
      ],
    });
  }

  /**
   * Start periodic tasks
   */
  startPeriodicTasks() {}
}

/**
 * Session Manager
 * Handles session token and user information
 */
class SessionManager {
  constructor() {
    this.sessionToken = null;
    this.userInfo = null;
    this.isAuthenticated = false;
    this.isReady = false;
  }

  async init() {
    await this.loadStoredSession();

    // If no stored session, try to sync with website
    if (!this.isAuthenticated) {
      await this.attemptAutoSync();
    }

    this.isReady = true;
  }

  /**
   * Attempt to automatically sync with website
   */
  async attemptAutoSync() {
    try {
      // Get session token from website cookies
      const sessionToken = await this.getSessionTokenFromWebsite();

      if (sessionToken) {
        // Validate the session token by making an API call
        const apiUrl = `${CONFIG.API.BASE_URL}/extension/user`;

        let response;
        try {
          response = await fetch(apiUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              "Content-Type": "application/json",
            },
          });
        } catch (fetchError) {
          console.error("SessionManager: Fetch error:", fetchError);
          return false;
        }

        let responseText = "";
        try {
          responseText = await response.text();
        } catch (readError) {
          console.error(
            "SessionManager: Failed reading response body:",
            readError
          );
        }

        if (response.ok) {
          let data = null;
          try {
            data = responseText ? JSON.parse(responseText) : {};
          } catch (parseError) {
            console.error(
              "SessionManager: Failed to parse extension user response as JSON:",
              parseError,
              responseText
            );
            return false;
          }

          // Store the session - the API returns { user: {...} } but we need just the user object
          await this.storeSession(sessionToken, data);
          return true;
        } else {
          console.error(
            `SessionManager: Extension user API failed: ${response.status}`,
            responseText
          );

          // Extension API is failing, let's try the main users API endpoint
          try {
            const mainApiUrl = `${CONFIG.API.BASE_URL}/users`;

            const mainResponse = await fetch(mainApiUrl, {
              method: "GET",
              headers: {
                Cookie: `__session=${sessionToken}`,
                "Content-Type": "application/json",
              },
            });

            if (mainResponse.ok) {
              const userData = await mainResponse.json();

              // Store the session with the user data from main API
              await this.storeSession(sessionToken, userData);
              return true;
            } else {
              const mainErrorText = await mainResponse.text();
              console.error(
                `SessionManager: Main API also failed: ${mainResponse.status} - ${mainErrorText}`
              );
            }
          } catch (mainApiError) {
            console.error(
              "SessionManager: Main API request failed:",
              mainApiError
            );
          }

          console.error(
            "SessionManager: All API endpoints failed, not storing session"
          );
          return false;
        }
      } else {
        console.log("SessionManager: No session token found in cookies");
      }
    } catch (error) {
      console.error("SessionManager: Auto-sync error:", error);
    }
    return false;
  }

  /**
   * Get session token from website cookies
   */
  async getSessionTokenFromWebsite() {
    try {
      // Try multiple domain patterns to find the session cookie
      const domainConfigs = (() => {
        const urls = new Set();
        const domains = new Map();

        const addUrl = (rawUrl) => {
          if (!rawUrl) return;
          try {
            const parsed = new URL(rawUrl);
            const key = parsed.origin;
            if (!urls.has(key)) {
              urls.add(key);
              domains.set(key, parsed.hostname);
            }
          } catch (error) {
            console.warn(
              "SessionManager: Skipping invalid URL in domain config:",
              rawUrl,
              error
            );
          }
        };

        addUrl(CONFIG.WEB_APP.BASE_URL);
        addUrl(CONFIG.WEB_APP.LOGIN_URL);
        addUrl(CONFIG.WEB_APP.RESUME_EDIT_URL);
        addUrl("https://lazy-me-five.vercel.app");
        addUrl("http://localhost:3000");

        return [...urls].map((origin) => ({
          url: `${origin}/`,
          domain: domains.get(origin),
        }));
      })();

      for (const { url, domain } of domainConfigs) {
        try {
          const sessionCookie = await chrome.cookies.get({
            url,
            name: CONFIG.SESSION.COOKIE_NAME,
            storeId: "0",
          });

          if (sessionCookie) {
            return sessionCookie.value;
          }
        } catch (domainError) {
          // Continue to next domain if this one fails
          if (
            domainError &&
            typeof domainError.message === "string" &&
            domainError.message.includes("No host permissions")
          ) {
            console.warn(
              "SessionManager: Missing host permission. Please open the popup and grant site access when prompted."
            );
          }
        }
      }

      // If no specific domain worked, try getting all cookies and search for the session
      try {
        const allCookies = await chrome.cookies.getAll({
          name: CONFIG.SESSION.COOKIE_NAME,
        });

        const sessionCookie = allCookies.find(
          (cookie) => cookie.name === CONFIG.SESSION.COOKIE_NAME
        );

        if (sessionCookie) {
          return sessionCookie.value;
        }
      } catch (allCookiesError) {
        console.error(
          "SessionManager: Failed to get all cookies:",
          allCookiesError
        );
      }

      console.log("SessionManager: No session cookie found on any domain");
      return null;
    } catch (error) {
      console.error(
        "SessionManager: Failed to get session token from website:",
        error
      );
      return null;
    }
  }

  /**
   * Store session data
   */
  async storeSession(token, userInfo) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

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

      // Clear resume status cache to ensure fresh data with dynamic filename
      if (this.messageHandler) {
        await this.messageHandler.clearResumeStatusCache();
      }

      return true;
    } catch (error) {
      console.error("SessionManager: Failed to store session:", error);
      return false;
    }
  }

  /**
   * Load session from storage
   */
  async loadStoredSession() {
    try {
      const result = await chrome.storage.local.get([
        CONFIG.SESSION.STORAGE_KEY,
        "userInfo",
      ]);

      if (result[CONFIG.SESSION.STORAGE_KEY]) {
        const sessionData = result[CONFIG.SESSION.STORAGE_KEY];

        // Check if session is still valid (not expired) AND has a token
        if (
          sessionData.expiresAt &&
          new Date() < new Date(sessionData.expiresAt) &&
          sessionData.token
        ) {
          this.sessionToken = sessionData.token;
          this.userInfo = sessionData.userInfo;
          this.isAuthenticated = true;

          // If we have a token but no userInfo, try to fetch it

          if (
            this.sessionToken &&
            (!this.userInfo ||
              this.userInfo === null ||
              this.userInfo === undefined)
          ) {
            try {
              const response = await fetch(
                `${CONFIG.API.BASE_URL}/extension/user`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${this.sessionToken}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.ok) {
                const userData = await response.json();

                this.userInfo = userData;

                // Update the stored session with the userInfo
                await this.storeSession(this.sessionToken, this.userInfo);
              } else {
              }
            } catch (error) {
              console.error("SessionManager: Error fetching user data:", error);
            }
          } else {
          }
        } else {
          await this.clearStoredSession();
        }
      } else {
      }
    } catch (error) {
      console.error("SessionManager: Error loading stored session:", error);
    }
  }

  /**
   * Clear stored session
   */
  async clearStoredSession() {
    try {
      this.sessionToken = null;
      this.userInfo = null;
      this.isAuthenticated = false;

      await chrome.storage.local.remove([
        CONFIG.SESSION.STORAGE_KEY,
        "userInfo",
      ]);
    } catch (error) {
      console.error("SessionManager: Error clearing session:", error);
    }
  }
}

/**
 * Tab Manager
 * Handles tab-related operations
 */
class TabManager {
  constructor() {
    this.activeTab = null;
  }

  async init() {
    await this.getCurrentTab();
  }

  /**
   * Get current active tab
   */
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      this.activeTab = tab;
      return tab;
    } catch (error) {
      console.error("TabManager: Error getting current tab:", error);
      return null;
    }
  }
}

/**
 * Notification Manager
 * Handles Chrome notifications
 */
class NotificationManager {
  constructor() {
    this.notificationId = 0;
  }

  async init() {}

  /**
   * Show notification
   */
  async showNotification(title, message, type = "basic") {
    try {
      const notificationId = `lazyme_${++this.notificationId}`;

      await chrome.notifications.create(notificationId, {
        type: type,
        iconUrl: "icons/icon128.png",
        title: title,
        message: message,
        timestamp: Date.now(),
      });

      return notificationId;
    } catch (error) {
      console.error("NotificationManager: Error showing notification:", error);
    }
  }

  /**
   * Show welcome notification
   */
  async showWelcomeNotification() {
    return await this.showNotification(
      "Welcome to Lazy Me!",
      "Your AI-powered resume builder is ready to help you create tailored resumes from job postings."
    );
  }
}

/**
 * Message Handler
 * Handles messages from popup and content scripts
 */
class MessageHandler {
  constructor() {
    this.sessionManager = null;
  }

  setSessionManager(sessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Get cached resume status
   */
  async getCachedResumeStatus() {
    try {
      const result = await chrome.storage.local.get(["resumeStatus"]);
      const cacheData = result.resumeStatus;

      if (cacheData && cacheData.timestamp) {
        // Cache is valid for the duration of the session (24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - cacheData.timestamp < maxAge) {
          return cacheData.data;
        }
      }
      return null;
    } catch (error) {
      console.error(
        "MessageHandler: Failed to get cached resume status:",
        error
      );
      return null;
    }
  }

  /**
   * Cache resume status
   */
  async cacheResumeStatus(resumeData) {
    try {
      const cacheData = {
        data: resumeData,
        timestamp: Date.now(),
      };
      await chrome.storage.local.set({ resumeStatus: cacheData });
    } catch (error) {
      console.error("MessageHandler: Failed to cache resume status:", error);
    }
  }

  /**
   * Clear resume status cache
   */
  async clearResumeStatusCache() {
    try {
      await chrome.storage.local.remove(["resumeStatus"]);
    } catch (error) {
      console.error(
        "MessageHandler: Failed to clear resume status cache:",
        error
      );
    }
  }

  async handleGetSessionStatus(request, sendResponse) {
    try {
      // Check if background service is fully ready
      if (!this.sessionManager || !this.sessionManager.isReady) {
        sendResponse({
          isAuthenticated: false,
          sessionToken: null,
          userInfo: null,
          isReady: false,
        });
        return;
      }

      const sessionStatus = {
        isAuthenticated: this.sessionManager.isAuthenticated,
        sessionToken: this.sessionManager.sessionToken ? "present" : null,
        userInfo: this.sessionManager.userInfo,
        isReady: true,
      };

      sendResponse(sessionStatus);
    } catch (error) {
      console.error("MessageHandler: Error getting session status:", error);
      sendResponse({ error: error.message });
    }
  }

  async handleLogout(request, sendResponse) {
    try {
      await this.sessionManager.clearStoredSession();

      // Clear all caches when user logs out
      await this.clearResumeStatusCache();

      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async handleResumeUpload(request, sendResponse) {
    try {
      if (!this.sessionManager.sessionToken) {
        throw new Error("No session token available");
      }

      if (!request.file) {
        throw new Error("No file provided in request");
      }

      // Convert Array back to ArrayBuffer (received from popup message)
      const arrayData = request.file.data;
      const arrayBuffer = new ArrayBuffer(arrayData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      uint8Array.set(arrayData);

      const fileName = request.file.name;
      const fileType = request.file.type;
      const fileSize = request.file.size;

      // Debug: Check the ArrayBuffer data

      // Debug: Show ArrayBuffer preview
      const bufferPreview = Array.from(uint8Array.slice(0, 20))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");

      // Create a new File object from the ArrayBuffer
      // Force all files to be sent as text format regardless of original type
      const file = new File([arrayBuffer], fileName, { type: "text/plain" });

      // Use main users API directly (extension API is not available)
      const fileContent = await file.text();

      const response = await fetch(`${CONFIG.API.BASE_URL}/users`, {
        method: "PUT",
        headers: {
          Cookie: `__session=${this.sessionManager.sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          masterResume: fileContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Clear resume status cache since we just uploaded a new resume
      await this.clearResumeStatusCache();

      sendResponse({ success: true, data: result });
    } catch (error) {
      console.error("MessageHandler: Upload error:", error);
      sendResponse({ error: error.message });
    }
  }

  async handleResumeDownload(request, sendResponse) {
    try {
      if (!this.sessionManager.sessionToken) {
        throw new Error("No session token available");
      }

      // Use main users API directly (extension API is not available)

      const response = await fetch(`${CONFIG.API.BASE_URL}/users`, {
        method: "GET",
        headers: {
          Cookie: `__session=${this.sessionManager.sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const userData = await response.json();

      if (!userData.user || !userData.user.masterResume) {
        throw new Error("No master resume found");
      }

      // Create a text response from the masterResume content
      const resumeContent = userData.user.masterResume;
      const blob = new Blob([resumeContent], { type: "text/plain" });

      // Convert blob to ArrayBuffer for message passing
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const dataArray = Array.from(uint8Array);

      // Generate filename based on user data
      const userEmail = userData.user.email || "user";
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `master_resume_${
        userEmail.split("@")[0]
      }_${timestamp}.txt`;
      const contentType = "text/plain";

      sendResponse({
        success: true,
        blobData: dataArray,
        blobType: contentType,
        filename: filename,
      });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async handleGetUserData(request, sendResponse) {
    try {
      if (this.sessionManager.userInfo) {
        sendResponse({
          success: true,
          user: this.sessionManager.userInfo,
        });
      } else {
        sendResponse({
          success: false,
          error: "No user data available",
        });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async handleGetResumeStatus(request, sendResponse) {
    try {
      if (!this.sessionManager.sessionToken) {
        throw new Error("No session token available");
      }

      // Check cache first
      const cachedResumeStatus = await this.getCachedResumeStatus();
      if (cachedResumeStatus) {
        sendResponse({
          success: true,
          resume: cachedResumeStatus,
          fromCache: true,
        });
        return;
      }

      // Use main users API directly (extension API is not available)

      const response = await fetch(`${CONFIG.API.BASE_URL}/users`, {
        method: "GET",
        headers: {
          Cookie: `__session=${this.sessionManager.sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      let resumeData = null;

      if (response.ok) {
        const userData = await response.json();

        // Check if user has a masterResume
        if (userData.user && userData.user.masterResume) {
          // Generate dynamic filename based on user data
          const userEmail = userData.user.email || "user";
          const timestamp = new Date().toISOString().split("T")[0];
          const dynamicFileName = `master_resume_${
            userEmail.split("@")[0]
          }_${timestamp}.txt`;

          resumeData = {
            fileName: dynamicFileName,
            fileSize: userData.user.masterResume.length,
            fileType: "text/plain",
            exists: true,
          };
        } else {
          resumeData = {
            exists: false,
          };
        }
      } else {
        console.error(
          "MessageHandler: Main API failed for resume status:",
          response.status
        );
        resumeData = {
          exists: false,
        };
      }

      // Cache the result
      await this.cacheResumeStatus(resumeData);

      sendResponse({
        success: true,
        resume: resumeData,
        fromCache: false,
      });
    } catch (error) {
      console.error("MessageHandler: Resume status error:", error);
      sendResponse({ error: error.message });
    }
  }

  async handleGenerateTailoredResume(request, sendResponse) {
    try {
      console.log(
        "MessageHandler: handleGenerateTailoredResume received request:",
        {
          requestType: request?.type,
          hasJobData: Boolean(request?.jobData),
        }
      );

      const requestedJobData = request?.jobData || {};
      const jobUrl = requestedJobData.url || null;

      console.log("MessageHandler: Extracted job data payload:", {
        jobUrl,
        jobTitle: requestedJobData.title || null,
        hasDescription: Boolean(requestedJobData.description),
      });

      if (!jobUrl) {
        throw new Error("LinkedIn job URL is required to generate a resume");
      }

      const generationResult = await this.generateResumeViaApi({
        url: jobUrl,
        title: requestedJobData.title || null,
        description: requestedJobData.description || null,
      });

      sendResponse({
        success: true,
        ...generationResult,
      });
    } catch (error) {
      console.error("MessageHandler: Generate tailored resume error:", error);
      sendResponse({ error: error.message });
    }
  }

  async handleOpenWebAppTab(request, sendResponse) {
    try {
      const targetUrl = request?.url || CONFIG.WEB_APP.LOGIN_URL;
      const preferredWindowId =
        typeof request?.windowId === "number" ? request.windowId : undefined;

      const tabs = await chrome.tabs.query({});
      const existingTab = tabs.find((tab) => this.isWebAppUrl(tab.url || ""));

      if (existingTab) {
        const updateProps = { active: true };
        if (targetUrl) {
          updateProps.url = targetUrl;
        }
        await chrome.tabs.update(existingTab.id, updateProps);
        if (existingTab.windowId) {
          await chrome.windows.update(existingTab.windowId, { focused: true });
        }

        sendResponse({
          success: true,
          tabId: existingTab.id,
          created: false,
        });
        return;
      }

      const createOptions = {
        url: targetUrl,
        active: true,
      };

      if (preferredWindowId !== undefined) {
        createOptions.windowId = preferredWindowId;
      }

      const newTab = await chrome.tabs.create(createOptions);

      if (newTab?.windowId) {
        await chrome.windows.update(newTab.windowId, { focused: true });
      }

      sendResponse({
        success: true,
        tabId: newTab?.id || null,
        created: true,
      });
    } catch (error) {
      console.error("MessageHandler: Open web app tab error:", error);
      sendResponse({ error: error.message });
    }
  }

  async generateResumeViaApi(jobData) {
    if (!this.sessionManager?.sessionToken) {
      throw new Error("Authentication required to generate resume");
    }

    console.log("MessageHandler: generateResumeViaApi invoked with:", {
      hasJobData: Boolean(jobData),
      jobUrl: jobData?.url || null,
      jobTitle: jobData?.title || null,
      hasDescription: Boolean(jobData?.description),
    });

    const endpoint =
      CONFIG.API?.ENDPOINTS?.TAILORED_RESUME || "/extension/resume/generate";

    const payload = {
      linkedInUrl: jobData.url || null,
      url: jobData.url || null,
    };

    console.log("MessageHandler: Prepared resume generation payload:", payload);

    if (!payload.linkedInUrl) {
      throw new Error("LinkedIn job URL is required to generate resume");
    }

    const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.sessionManager.sessionToken}`,
        "Content-Type": "application/json",
        Accept: "application/pdf, application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("MessageHandler: Tailored resume response meta:", {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("Content-Type") || null,
    });

    if (!response.ok) {
      const errorTextRaw = await response.text().catch(() => "");
      console.warn("MessageHandler: Resume generation error response body:", {
        errorTextRaw,
      });
      const sanitizedError = this.sanitizeErrorText(errorTextRaw);
      const refinedError = this.refineErrorText(sanitizedError);
      const baseMessage = refinedError
        ? `${response.status} ${refinedError}`.trim()
        : `${response.status}`;
      const normalizedMessage = baseMessage.endsWith(".")
        ? baseMessage
        : `${baseMessage}.`;
      throw new Error(`Resume generation failed: ${normalizedMessage}`);
    }

    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/pdf")) {
      const arrayBuffer = await response.arrayBuffer();
      const filenameFromHeader =
        this.extractFilenameFromDisposition(
          response.headers.get("Content-Disposition")
        ) || this.buildResumeFilename(jobData);

      return {
        filename: filenameFromHeader,
        blobType: "application/pdf",
        blobData: Array.from(new Uint8Array(arrayBuffer)),
        meta: {
          source: "api-direct",
          jobUrl: jobData.url || null,
        },
      };
    }

    const data = await response
      .json()
      .catch(() => ({ error: "Invalid JSON response" }));

    const resumePayload = data?.resume || data;

    if (resumePayload?.downloadUrl) {
      const downloadResponse = await fetch(resumePayload.downloadUrl, {
        headers: {
          Cookie: `__session=${this.sessionManager.sessionToken}`,
        },
      });

      if (!downloadResponse.ok) {
        throw new Error(
          `Failed to download resume: ${downloadResponse.status}`
        );
      }

      const arrayBuffer = await downloadResponse.arrayBuffer();
      return {
        filename: resumePayload.fileName || this.buildResumeFilename(jobData),
        blobType:
          downloadResponse.headers.get("Content-Type") || "application/pdf",
        blobData: Array.from(new Uint8Array(arrayBuffer)),
        meta: {
          source: "api-download-url",
          jobUrl: jobData.url || null,
        },
      };
    }

    const base64Content =
      resumePayload?.base64 || resumePayload?.pdfBase64 || resumePayload?.data;

    if (base64Content) {
      return {
        filename: resumePayload.fileName || this.buildResumeFilename(jobData),
        blobType:
          resumePayload.contentType ||
          resumePayload.mimeType ||
          "application/pdf",
        blobData: this.base64ToByteArray(base64Content),
        meta: {
          source: "api-base64",
          jobUrl: jobData.url || null,
        },
      };
    }

    throw new Error("Resume generation response did not include a PDF payload");
  }

  sanitizeErrorText(rawText) {
    if (!rawText || typeof rawText !== "string") {
      return "";
    }

    const trimmed = rawText.trim();
    if (!trimmed) {
      return "";
    }

    try {
      const parsedJson = JSON.parse(trimmed);
      if (typeof parsedJson === "string") {
        return parsedJson.trim();
      }
      if (parsedJson && typeof parsedJson === "object") {
        if (parsedJson.error) {
          return String(parsedJson.error).trim();
        }
        if (parsedJson.message) {
          return String(parsedJson.message).trim();
        }
      }
    } catch (jsonError) {
      // Ignore JSON parse errors and fallback to plain text sanitization
    }

    const withoutTags = trimmed.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    return withoutTags.trim();
  }

  refineErrorText(message) {
    if (!message) {
      return "";
    }

    let result = message.trim();

    const duplicatePrefixPattern = /^Resume generation failed:\s*/i;
    while (duplicatePrefixPattern.test(result)) {
      result = result.replace(duplicatePrefixPattern, "").trim();
    }

    const cssIndex = result.search(/\bbody\s*\{/i);
    if (cssIndex !== -1) {
      result = result.slice(0, cssIndex).trim();
    }

    const mediaIndex = result.search(/@media/i);
    if (mediaIndex !== -1) {
      result = result.slice(0, mediaIndex).trim();
    }

    result = result.replace(/\s{2,}/g, " ").trim();

    if (result.length > 200) {
      result = result.slice(0, 200).trim();
    }

    return result;
  }

  extractFilenameFromDisposition(dispositionHeader) {
    if (!dispositionHeader || typeof dispositionHeader !== "string") {
      return null;
    }

    const filenameMatch =
      dispositionHeader.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/) ||
      null;

    if (filenameMatch && filenameMatch[1]) {
      try {
        return decodeURIComponent(filenameMatch[1]);
      } catch (error) {
        return filenameMatch[1];
      }
    }

    return null;
  }

  base64ToByteArray(base64) {
    const normalized = base64.replace(/^data:.*?;base64,/, "");
    const binary = atob(normalized);
    const length = binary.length;
    const bytes = new Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  buildResumeFilename(jobData, fallback = "tailored-resume.pdf") {
    if (jobData?.title) {
      const slug = jobData.title
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);

      if (slug) {
        return `${slug}-resume.pdf`;
      }
    }

    if (jobData?.url) {
      try {
        const parsedUrl = new URL(jobData.url);
        const pathSegments = parsedUrl.pathname
          .split("/")
          .filter((segment) => segment && segment !== "jobs");
        if (pathSegments.length > 0) {
          const jobSlug = pathSegments[pathSegments.length - 1]
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60);
          if (jobSlug) {
            return `${jobSlug}-resume.pdf`;
          }
        }
      } catch (error) {
        // Ignore malformed job URLs and fall back to default.
      }
    }

    return fallback;
  }

  isWebAppUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const allowedOrigins = [
        new URL(CONFIG.WEB_APP.BASE_URL).origin,
        CONFIG.WEB_APP.LOGIN_URL
          ? new URL(CONFIG.WEB_APP.LOGIN_URL).origin
          : null,
        "https://lazy-me-five.vercel.app",
      ].filter(Boolean);

      return allowedOrigins.some((origin) => parsed.origin === origin);
    } catch (error) {
      return false;
    }
  }

  async handleGetTabInfo(request, sendResponse) {
    try {
      const tab = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      sendResponse({
        success: true,
        tab: tab[0] || null,
      });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async handleForceSync(request, sendResponse) {
    try {
      console.log("MessageHandler: Handling FORCE_SYNC request...");

      // Force the session manager to attempt auto-sync
      const syncResult = await this.sessionManager.attemptAutoSync();

      console.log("MessageHandler: Auto-sync result:", syncResult);

      if (syncResult) {
        console.log(
          "MessageHandler: Sync successful, sending success response"
        );
        sendResponse({ success: true, message: "Sync successful" });
      } else {
        console.log("MessageHandler: Sync failed, sending failure response");
        sendResponse({ success: false, message: "No valid session found" });
      }
    } catch (error) {
      console.error("MessageHandler: Force sync error:", error);
      sendResponse({ error: error.message });
    }
  }

  async handleFindWebsiteTab(request, sendResponse) {
    try {
      const websiteUrl = CONFIG.WEB_APP.BASE_URL;
      const tabs = await chrome.tabs.query({});

      // Find tab with the website URL
      const websiteTab = tabs.find(
        (tab) =>
          tab.url &&
          (tab.url.includes(websiteUrl) ||
            tab.url.includes("lazy-me-five.vercel.app"))
      );

      if (websiteTab) {
        sendResponse({ success: true, tab: websiteTab });
      } else {
        sendResponse({ success: false, message: "No website tab found" });
      }
    } catch (error) {
      console.error("MessageHandler: Find website tab error:", error);
      sendResponse({ error: error.message });
    }
  }

  async handleFocusTab(request, sendResponse) {
    try {
      const { tabId } = request;

      if (!tabId) {
        sendResponse({ error: "No tab ID provided" });
        return;
      }

      // Update the tab to make it active
      await chrome.tabs.update(tabId, { active: true });

      // Get the window ID and focus it
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }

      sendResponse({ success: true });
    } catch (error) {
      console.error("MessageHandler: Focus tab error:", error);
      sendResponse({ error: error.message });
    }
  }
}

/**
 * Job Site Detector
 * Detects if a URL is a job site
 */
class JobSiteDetector {
  constructor() {
    this.jobSites = [
      "linkedin.com",
      "indeed.com",
      "glassdoor.com",
      "monster.com",
      "ziprecruiter.com",
      "careerbuilder.com",
      "simplyhired.com",
      "dice.com",
    ];
  }

  async init() {}

  /**
   * Check if URL is a job site
   */
  isJobSite(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      return this.jobSites.some(
        (site) => hostname === site || hostname.endsWith(`.${site}`)
      );
    } catch (error) {
      return false;
    }
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();
backgroundService.init();
