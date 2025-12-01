/**
 * Main Popup Script for Lazy Me Extension
 * Handles UI interactions and orchestrates extension functionality
 */

class PopupController {
  constructor() {
    this.currentScreen = "login";
    this.isLoggedIn = false;
    this.currentUser = null;
    this.masterResume = null;
    this.isLoading = false;
    this.isGeneratingResume = false;
    this.activeTab = null;
    this.isLinkedInJob = false;
    this.currentJobContext = null;
    this.generateErrorMessage = null;

    this.init();
  }

  /**
   * Initialize the popup controller
   */
  async init() {
    try {
      this.bindEvents();

      await this.refreshActiveTabContext();

      // Check initial authentication state (which will wait for services if needed)
      await this.checkInitialState();
    } catch (error) {
      console.error("Lazy Me: Initialization failed:", error);
    }
  }

  /**
   * Wait for background services to be ready
   */
  async waitForServices() {
    try {
      const response = await this.sendMessageToBackground({
        type: "GET_SESSION_STATUS",
      });

      // Check if the response indicates the service is ready
      if (response && response.isReady === true) {
        return response; // Return the session status for immediate use
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.waitForServices();
      }
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.waitForServices();
    }
  }

  /**
   * Send message to background script
   */
  async sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Check initial authentication state
   */
  async checkInitialState() {
    try {
      // Get session status from waitForServices (which already waited for background to be ready)
      const sessionStatus = await this.waitForServices();

      if (
        sessionStatus &&
        sessionStatus.isAuthenticated &&
        sessionStatus.userInfo
      ) {
        this.isLoggedIn = true;
        this.currentUser = sessionStatus.userInfo;

        // Load resume status
        await this.loadResumeStatus();

        // Show dashboard immediately

        this.showScreen("dashboard");

        this.updateUI();
      } else {
        this.showScreen("login");
        this.updateUI();
      }
    } catch (error) {
      console.error("Lazy Me: Error checking initial state:", error);
      this.showScreen("login");
    }
  }

  /**
   * Load resume status from background
   */
  async loadResumeStatus() {
    try {
      // First clear the cache to ensure fresh data
      await this.sendMessageToBackground({
        type: "CLEAR_RESUME_CACHE",
      });

      const response = await this.sendMessageToBackground({
        type: "GET_RESUME_STATUS",
      });

      if (response && response.success) {
        if (response.resume && response.resume.exists) {
          this.masterResume = {
            fileName: response.resume.fileName,
            fileSize: response.resume.fileSize,
          };
        } else {
          this.masterResume = null;
        }

        // Log cache status for debugging
        if (response.fromCache) {
        } else {
        }

        // Update UI to reflect resume status
        this.updateUI();
      } else {
        console.error(
          "PopupController: Failed to get resume status:",
          response?.error
        );
      }
    } catch (error) {
      console.error("PopupController: Failed to load resume status:", error);
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Header buttons
    document
      .getElementById("aboutBtn")
      .addEventListener("click", () => this.handleAboutClick());
    document
      .getElementById("settingsBtn")
      .addEventListener("click", () => this.handleSettingsClick());
    document
      .getElementById("closeBtn")
      .addEventListener("click", () => this.closeExtension());

    // Login screen
    document
      .getElementById("syncLink")
      .addEventListener("click", (e) => this.handleSyncClick(e));

    // Dashboard buttons
    document
      .getElementById("generateResumeBtn")
      .addEventListener("click", () => this.handleGenerateResume());
    document
      .getElementById("uploadMasterBtn")
      .addEventListener("click", () => this.handleUploadMaster());
    document
      .getElementById("editMasterBtn")
      .addEventListener("click", () => this.handleEditMaster());
    document
      .getElementById("downloadMasterBtn")
      .addEventListener("click", () => this.handleDownloadMaster());

    // Footer
    document
      .getElementById("logoutBtn")
      .addEventListener("click", () => this.handleLogout());

    // File input
    document
      .getElementById("fileInput")
      .addEventListener("change", (e) => this.handleFileUpload(e));
  }

  /**
   * Refresh active tab context for job detection
   */
  async refreshActiveTabContext() {
    try {
      const response = await this.sendMessageToBackground({
        type: "GET_TAB_INFO",
      });

      this.activeTab = response?.tab || null;
      this.isLinkedInJob = this.isLinkedInJobUrl(this.activeTab?.url || "");
      this.currentJobContext = null;
      this.generateErrorMessage = null;
      this.setHelperErrorState(false);
      this.updateGenerateButtonState();
    } catch (error) {
      console.error("PopupController: Failed to refresh tab context:", error);
      this.activeTab = null;
      this.isLinkedInJob = false;
      this.currentJobContext = null;
      this.generateErrorMessage = null;
      this.setHelperErrorState(false);
      this.updateGenerateButtonState();
    }
  }

  async getCurrentWindowId() {
    return new Promise((resolve) => {
      try {
        chrome.windows.getCurrent({}, (currentWindow) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(currentWindow?.id ?? null);
        });
      } catch (error) {
        resolve(null);
      }
    });
  }

  /**
   * Determine if the URL matches a supported LinkedIn job posting
   */
  isLinkedInJobUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      return (
        hostname.includes("linkedin.com") &&
        parsed.pathname.includes("/jobs/")
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Update generate button based on current state
   */
  updateGenerateButtonState() {
    const helper = document.getElementById("generateResumeHelper");
    if (this.generateErrorMessage) {
      this.setHelperErrorState(true);
      this.setGenerateButtonState("disabled", this.generateErrorMessage);
      return;
    }

    this.setHelperErrorState(false);

    if (this.isGeneratingResume) {
      this.setGenerateButtonState("loading", helper?.textContent);
      return;
    }

    if (!this.isLoggedIn) {
      this.setGenerateButtonState(
        "disabled",
        "Sync your Lazy Me account to unlock tailored resumes."
      );
      return;
    }

    if (!this.isLinkedInJob) {
      this.setGenerateButtonState(
        "disabled",
        "Open a LinkedIn job posting to generate a tailored resume."
      );
      return;
    }

    this.setGenerateButtonState(
      "idle",
      "We’ll tailor your resume for this job posting."
    );
  }

  /**
   * Set generate resume button state
   */
  setGenerateButtonState(state, helperMessage) {
    const button = document.getElementById("generateResumeBtn");
    const label = document.getElementById("generateResumeBtnLabel");
    const helper = document.getElementById("generateResumeHelper");

    if (!button) return;

    if (helper && typeof helperMessage === "string") {
      helper.textContent = helperMessage;
    }

    switch (state) {
      case "loading":
        button.disabled = true;
        button.classList.add("loading");
        if (label) {
          label.textContent = "Generating...";
        }
        break;
      case "disabled":
        button.disabled = true;
        button.classList.remove("loading");
        if (label) {
          label.textContent = "Generate Resume";
        }
        break;
      default:
        button.disabled = false;
        button.classList.remove("loading");
        if (label) {
          label.textContent = "Generate Resume";
        }
        break;
    }
  }

  setHelperErrorState(isError) {
    const helper = document.getElementById("generateResumeHelper");
    if (!helper) return;

    if (isError) {
      helper.style.color = "#d93025";
      helper.classList.add("helper-error");
    } else {
      helper.style.color = "";
      helper.classList.remove("helper-error");
    }
  }

  showGenerateError(message) {
    this.generateErrorMessage = message;
    this.setHelperErrorState(true);
    this.setGenerateButtonState("disabled", message);
    this.setResumeStatusMessage(message, "error");
    this.showError(message);
  }

  clearGenerateError() {
    if (!this.generateErrorMessage) {
      return;
    }
    this.generateErrorMessage = null;
    this.setHelperErrorState(false);
  }

  async handleSettingsClick() {
    try {
      const windowId = await this.getCurrentWindowId();
      const response = await this.sendMessageToBackground({
        type: "OPEN_WEB_APP_TAB",
        windowId,
        url: CONFIG.WEB_APP.SETTINGS_URL,
      });

      if (!response || !response.success) {
        throw new Error(response?.error || "Failed to open settings");
      }
    } catch (error) {
      console.error("PopupController: Failed to open settings:", error);
      this.showError(
        "Unable to open Lazy Me settings. Please try again in a moment."
      );
    }
  }

  handleAboutClick() {
    try {
      chrome.tabs.create({
        url: "https://github.com/KaosElegent/LazyMe",
      });
    } catch (error) {
      console.error("PopupController: Failed to open About page:", error);
      this.showError("Unable to open About page. Please try again.");
    }
  }

  toggleLogoutVisibility() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;
    if (this.isLoggedIn) {
      logoutBtn.classList.remove("hidden");
    } else {
      logoutBtn.classList.add("hidden");
    }
  }

  async handleGenerateResume() {
    if (this.isGeneratingResume) {
      return;
    }

    if (!this.isLoggedIn) {
      this.showError("Please sync your Lazy Me account before generating.");
      return;
    }

    if (!this.isLinkedInJob) {
      this.showError(
        "This feature is available when viewing a LinkedIn job posting."
      );
      return;
    }

    try {
      this.isGeneratingResume = true;
      this.clearGenerateError();
      this.setGenerateButtonState(
        "loading",
        "Tailoring your resume for this posting..."
      );
      this.showResumeStatus("Capturing job context...");

      let jobContent = null;
      try {
        const jobExtraction = await this.fetchJobContentFromActiveTab();
        if (jobExtraction?.success && jobExtraction.jobContent) {
          jobContent = this.normalizeJobContent(jobExtraction.jobContent);
        } else if (jobExtraction?.error) {
          // No-op; will fall back to DOM extraction.
        }
      } catch (extractionError) {
        // Ignore and continue with fallback strategies.
      }

      const { url: jobUrl } = await this.resolveLinkedInJobUrl(jobContent);

      if (!jobUrl) {
        const errorMessage =
          "We couldn't capture the LinkedIn job link. Open the job detail view (Share → Copy link) and try again.";
        this.showGenerateError(errorMessage);
        throw new Error(errorMessage);
      }

      if (jobContent) {
        jobContent.url = jobUrl;
        this.currentJobContext = jobContent;
      } else {
        this.currentJobContext = {
          url: jobUrl,
        };
      }

      this.showResumeStatus("Generating tailored resume...");

      const response = await this.sendMessageToBackground({
        type: "GENERATE_TAILORED_RESUME",
        jobData: {
          title: jobContent?.title || null,
          description: jobContent?.description || null,
          url: jobUrl,
        },
      });

      if (!response || !response.success) {
        throw new Error(response?.error || "Failed to generate resume.");
      }

      const blob = this.prepareResumeBlob(
        response.blobData,
        response.blobType || "application/pdf"
      );
      const filename =
        response.filename || "lazyme-tailored-resume.pdf";

      this.triggerDownload(blob, filename);
      this.setResumeStatusMessage(
        "Tailored resume downloaded successfully.",
        "success"
      );
      this.showSuccess("Your tailored resume has been downloaded.");
    } catch (error) {
      const normalizedMessage = this.normalizeResumeErrorMessage(
        error?.message
      );
      this.setResumeStatusMessage(normalizedMessage, "error");
      if (
        error?.message &&
        error.message.includes("LinkedIn job link")
      ) {
        if (!this.generateErrorMessage) {
          this.showGenerateError(this.sanitizeMessage(error.message));
        }
      } else {
        this.showError(normalizedMessage);
      }
    } finally {
      this.isGeneratingResume = false;
      this.updateGenerateButtonState();
    }
  }

  async fetchJobContentFromActiveTab() {
    if (!this.activeTab?.id) {
      throw new Error("No active tab available for job extraction.");
    }

    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.sendMessage(
          this.activeTab.id,
          { type: "EXTRACT_JOB_CONTENT" },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(
                new Error(
                  "Unable to access job information in this tab. Please refresh the page and try again."
                )
              );
              return;
            }
            resolve(response);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  normalizeJobContent(jobContent) {
    if (!jobContent) return null;
    const normalized = { ...jobContent };

    if (typeof normalized.title === "string") {
      normalized.title = normalized.title.trim();
    }
    if (typeof normalized.description === "string") {
      normalized.description = normalized.description.trim();
    }
    if (typeof normalized.company === "string") {
      normalized.company = normalized.company.trim();
    }

    return normalized;
  }

  async resolveLinkedInJobUrl(jobContent) {
    const candidates = [
      { value: jobContent?.url, source: "job-content-url" },
      { value: jobContent?.rawUrl, source: "job-content-raw-url" },
      { value: jobContent?.sourceUrl, source: "job-content-source-url" },
      { value: this.activeTab?.url, source: "active-tab-url" },
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeLinkedInJobUrl(candidate.value);
      if (normalized) {
        return { url: normalized, source: candidate.source };
      }
    }

    const activeUrl = this.activeTab?.url || "";
    if (this.isLinkedInSearchResultsUrl(activeUrl)) {
      const domExtracted = await this.extractLinkedInJobUrlFromDom();
      const normalized = this.normalizeLinkedInJobUrl(domExtracted);
      if (normalized) {
        return { url: normalized, source: "dom-extraction" };
      }
    }

    return { url: null, source: "unresolved" };
  }

  normalizeLinkedInJobUrl(candidate) {
    if (!candidate || typeof candidate !== "string") {
      return null;
    }

    try {
      const decoded = decodeURIComponent(candidate.trim());
      const absolute = decoded.startsWith("http")
        ? decoded
        : decoded.startsWith("/")
        ? `https://www.linkedin.com${decoded}`
        : `https://www.linkedin.com/${decoded}`;
      const urlObj = new URL(absolute);
      if (!urlObj.hostname.includes("linkedin.com")) {
        return null;
      }

      const match = urlObj.pathname.match(/\/jobs\/view\/(\d+)/);
      if (match && match[1]) {
        return `https://www.linkedin.com/jobs/view/${match[1]}`;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  async extractLinkedInJobUrlFromDom() {
    if (!chrome?.scripting || !this.activeTab?.id) {
      return null;
    }

    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: this.activeTab.id },
        func: () => {
          const normalize = (candidate) => {
            if (!candidate || typeof candidate !== "string") {
              return null;
            }

            try {
              const decoded = decodeURIComponent(candidate.trim());
              const absolute = decoded.startsWith("http")
                ? decoded
                : new URL(
                    decoded.startsWith("/") ? decoded : `/${decoded}`,
                    window.location.origin
                  ).toString();
              const urlObj = new URL(absolute);
              const match = urlObj.pathname.match(/\/jobs\/view\/(\d+)/);
              if (match && match[1]) {
                return `https://www.linkedin.com/jobs/view/${match[1]}`;
              }
            } catch (error) {
              // Ignore malformed URLs
            }
            return null;
          };

          const selectors = [
            ".job-details-jobs-unified-top-card__job-title a[href*='/jobs/view/']",
          ];

          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              const normalized =
                normalize(element.getAttribute("href")) ||
                normalize(element.getAttribute("data-share-link")) ||
                normalize(element.getAttribute("data-share-url")) ||
                normalize(element.getAttribute("data-share-copy-link"));
              if (normalized) {
                return normalized;
              }
            }
          }

          const anchors = Array.from(
            document.querySelectorAll("a[href*='/jobs/view/']")
          );
          for (const anchor of anchors) {
            const normalized =
              normalize(anchor.getAttribute("href")) ||
              normalize(anchor.href) ||
              normalize(anchor.dataset?.shareUrl) ||
              normalize(anchor.dataset?.shareCopyLink);
            if (normalized) {
              return normalized;
            }
          }

          return null;
        },
        world: "MAIN",
      });

      return result?.result ?? null;
    } catch (error) {
      return null;
    }
  }

  isLinkedInSearchResultsUrl(url) {
    return typeof url === "string" && url.includes("/jobs/search-results");
  }


  prepareResumeBlob(blobData, blobType) {
    if (blobData instanceof ArrayBuffer) {
      return new Blob([blobData], { type: blobType });
    }

    if (Array.isArray(blobData)) {
      const arrayBuffer = new Uint8Array(blobData).buffer;
      return new Blob([arrayBuffer], { type: blobType });
    }

    if (typeof blobData === "string") {
      const byteArray = this.base64ToUint8Array(blobData);
      return new Blob([byteArray.buffer], { type: blobType });
    }

    throw new Error("Unexpected resume format received from generator.");
  }

  base64ToUint8Array(base64) {
    const normalized = base64.replace(/^data:.*?;base64,/, "");
    const binary = atob(normalized);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  /**
   * Screen Navigation
   */
  showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    // Show target screen
    const targetScreen = document.getElementById(screenName + "Screen");
    if (targetScreen) {
      targetScreen.classList.add("active");
      this.currentScreen = screenName;
    } else {
      console.error(`Screen "${screenName}" not found`);
    }
  }

  /**
   * Handle sync click
   */
  async handleSyncClick(e) {
    e.preventDefault();

    if (this.isLoading) return;

    try {
      this.setSyncState("syncing");

      // First, try to get session from existing website tab
      const sessionFound = await this.attemptDirectSync();

      if (sessionFound) {
        this.setSyncState("success");
        this.showScreen("dashboard");
        this.updateUI();
        await this.refreshActiveTabContext();
        return;
      }

      // Open or focus existing web app tab within the current window
      const currentWindowId = await this.getCurrentWindowId();
      const openResponse = await this.sendMessageToBackground({
        type: "OPEN_WEB_APP_TAB",
        windowId: currentWindowId,
        url: CONFIG.WEB_APP.LOGIN_URL,
      });

      if (!openResponse || !openResponse.success) {
        throw new Error(
          openResponse?.error ||
            "Unable to open Lazy Me web app. Please open it manually and try again."
        );
      }

      // Wait for authentication to complete
      await this.waitForAuthentication();

      this.setSyncState("success");
      this.showScreen("dashboard");
      this.updateUI();
      await this.refreshActiveTabContext();
    } catch (error) {
      console.error("Lazy Me: Sync failed:", error);
      this.setSyncState("error");
      this.showError(
        "Failed to sync with website. Please make sure you are logged in at lazy-me-five.vercel.app"
      );
    }
  }

  /**
   * Attempt to sync directly with existing website session
   */
  async attemptDirectSync() {
    try {
      console.log("PopupController: Starting direct sync attempt...");

      // First, try to find and focus existing website tab
      const existingTab = await this.findExistingWebsiteTab();
      if (existingTab) {
        console.log("PopupController: Found existing website tab, focusing...");
        // Focus the existing tab
        await this.focusTab(existingTab.id);
      } else {
        console.log("PopupController: No existing website tab found");
      }

      // Force background script to attempt auto-sync
      console.log(
        "PopupController: Sending FORCE_SYNC message to background..."
      );
      const response = await this.sendMessageToBackground({
        type: "FORCE_SYNC",
      });

      console.log("PopupController: FORCE_SYNC response:", response);

      if (response && response.success) {
        console.log(
          "PopupController: Force sync successful, checking session status..."
        );

        // Check if we now have a valid session
        const sessionStatus = await this.sendMessageToBackground({
          type: "GET_SESSION_STATUS",
        });

        console.log(
          "PopupController: Session status after sync:",
          sessionStatus
        );

        if (sessionStatus && sessionStatus.isAuthenticated) {
          console.log("PopupController: Session authenticated, updating UI...");
          this.isLoggedIn = true;
          this.currentUser = sessionStatus.userInfo;
          await this.loadResumeStatus();
          this.updateUI();
          await this.refreshActiveTabContext();
          return true;
        } else {
          console.log("PopupController: Session not authenticated after sync");
        }
      } else {
        console.log(
          "PopupController: Force sync failed:",
          response?.message || "Unknown error"
        );
      }
      return false;
    } catch (error) {
      console.error("Lazy Me: Direct sync failed:", error);
      return false;
    }
  }

  /**
   * Find existing website tab
   */
  async findExistingWebsiteTab() {
    try {
      const response = await this.sendMessageToBackground({
        type: "FIND_WEBSITE_TAB",
      });

      return response && response.success ? response.tab : null;
    } catch (error) {
      console.error("Lazy Me: Failed to find website tab:", error);
      return null;
    }
  }

  /**
   * Focus a specific tab
   */
  async focusTab(tabId) {
    try {
      await this.sendMessageToBackground({
        type: "FOCUS_TAB",
        tabId: tabId,
      });
    } catch (error) {
      console.error("Lazy Me: Failed to focus tab:", error);
    }
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuthentication() {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds

    while (attempts < maxAttempts) {
      try {
        const sessionStatus = await this.sendMessageToBackground({
          type: "GET_SESSION_STATUS",
        });

        if (sessionStatus && sessionStatus.isAuthenticated) {
          this.isLoggedIn = true;
          this.currentUser = sessionStatus.userInfo;
          await this.loadResumeStatus();
          this.updateUI();
          await this.refreshActiveTabContext();
          return;
        }
      } catch (error) {
        // Session not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error("Authentication timeout");
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      await this.sendMessageToBackground({
        type: "LOGOUT",
      });

      this.isLoggedIn = false;
      this.currentUser = null;
      this.masterResume = null;
      this.showScreen("login");
      this.updateUI();
      await this.refreshActiveTabContext();
      this.showSuccess("Logged out successfully");
    } catch (error) {
      console.error("Lazy Me: Logout failed:", error);
      this.showError("Failed to logout");
    }
  }

  /**
   * Handle file upload
   */
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Debug: Check the file immediately after selection

    try {
      this.showResumeStatus("Uploading resume...");

      // Validate file size
      if (file.size > CONFIG.UPLOAD.MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds ${
            CONFIG.UPLOAD.MAX_FILE_SIZE / 1024 / 1024
          }MB limit`
        );
      }

      // Validate file type - PDF, DOCX, TXT, and JSON allowed
      if (!CONFIG.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
        // Show user-friendly error message
        const fileName = file.name;
        const fileExtension = fileName.split(".").pop().toLowerCase();

        let errorMessage = "Only PDF, DOCX, TXT, and JSON files are allowed. ";

        if (fileExtension === "doc") {
          errorMessage +=
            "Please save your Word document as DOCX format before uploading.";
        } else if (fileExtension === "rtf") {
          errorMessage +=
            "Please convert your document to PDF, DOCX, TXT, or JSON format before uploading.";
        } else {
          errorMessage += `The file "${fileName}" is not a supported format.`;
        }

        throw new Error(errorMessage);
      }

      // Debug: Check the file object before conversion

      // Convert File to ArrayBuffer for message passing
      const arrayBuffer = await file.arrayBuffer();

      // Debug: Check the ArrayBuffer

      // Debug: Check first few bytes
      const uint8Array = new Uint8Array(arrayBuffer);
      const bufferPreview = Array.from(uint8Array.slice(0, 20))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");

      // Debug: Check if the file content is actually "[object Object]"
      const fileText = String.fromCharCode(...uint8Array);

      if (fileText.includes("[object Object]")) {
        console.error(
          "PopupController: WARNING - File contains '[object Object]' text!"
        );
        console.error(
          "PopupController: This suggests the file itself is corrupted or contains object data."
        );
        throw new Error(
          "The selected file appears to be corrupted and contains '[object Object]' text. Please select a valid file."
        );
      }

      // Convert ArrayBuffer to Array for message passing
      const arrayData = Array.from(new Uint8Array(arrayBuffer));

      const response = await this.sendMessageToBackground({
        type: "UPLOAD_RESUME",
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          data: arrayData,
        },
      });

      if (response && response.success) {
        this.hideLoading();
        this.showSuccess("Resume uploaded successfully!");

        // Reload resume status to update UI
        await this.loadResumeStatus();
      } else {
        throw new Error(response?.error || "Upload failed");
      }
    } catch (error) {
      console.error("Lazy Me: Upload failed:", error);
      this.hideLoading();
      this.showError(
        error.message || "Failed to upload resume. Please try again."
      );
    } finally {
      // Clear the file input
      event.target.value = "";
    }
  }

  /**
   * Handle download master resume
   */
  async handleDownloadMaster() {
    if (!this.isLoggedIn || !this.masterResume) {
      this.showError("No master resume available to download.");
      return;
    }

    try {
      this.showResumeStatus("Downloading resume...");

      const response = await this.sendMessageToBackground({
        type: "DOWNLOAD_RESUME",
      });

      if (response && response.success) {
        // Reconstruct blob from data array
        const blobData = response.blobData;
        const blobType = response.blobType || "text/plain";
        const filename = response.filename || "resume.txt";

        // Convert data array back to ArrayBuffer
        let arrayBuffer;
        if (Array.isArray(blobData)) {
          // Convert regular array back to ArrayBuffer
          arrayBuffer = new Uint8Array(blobData).buffer;
        } else if (blobData instanceof ArrayBuffer) {
          // Already an ArrayBuffer
          arrayBuffer = blobData;
        } else {
          throw new Error("Invalid blob data format");
        }

        // Create a new Blob from the ArrayBuffer
        const blob = new Blob([arrayBuffer], { type: blobType });

        // Create download URL and trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style.display = "none";

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up the URL
        URL.revokeObjectURL(url);

        this.hideLoading();
        this.showSuccess(`Downloaded: ${filename}`);
      } else {
        throw new Error(response?.error || "Download failed");
      }
    } catch (error) {
      console.error("Lazy Me: Download failed:", error);
      this.hideLoading();
      this.showError(
        error.message || "Failed to download resume. Please try again."
      );
    }
  }

  /**
   * Handle upload master resume
   */
  handleUploadMaster() {
    document.getElementById("fileInput").click();
  }

  /**
   * Handle edit master resume
   */
  handleEditMaster() {
    if (!this.isLoggedIn || !this.masterResume) {
      this.showError("No master resume available to edit.");
      return;
    }

    // Open web app resume editor
    window.open(CONFIG.WEB_APP.RESUME_EDIT_URL, "_blank");
  }

  /**
   * Handle session expired
   */
  handleSessionExpired() {
    this.isLoggedIn = false;
    this.currentUser = null;
    this.masterResume = null;
    this.showScreen("login");
    this.showError("Session expired. Please sync again.");
    this.updateUI();
    this.refreshActiveTabContext();
  }

  /**
   * Handle user logged out
   */
  handleUserLoggedOut() {
    this.isLoggedIn = false;
    this.currentUser = null;
    this.masterResume = null;
    this.showScreen("login");
    this.updateUI();
    this.refreshActiveTabContext();
  }

  /**
   * Update UI based on current state
   */
  updateUI() {
    this.updateUserInfo();
    this.updateDashboard();
    this.toggleLogoutVisibility();
    this.updateGenerateButtonState();
  }

  showHelp() {
    this.showInfo(
      "Help & Questions\n\nFor support, please visit our help center at help.lazyme.com or contact us at support@lazyme.com"
    );
  }

  /**
   * Set sync state
   */
  setSyncState(state) {
    const syncLink = document.getElementById("syncLink");
    const syncSpinner = document.getElementById("syncSpinner");
    const syncStatus = document.getElementById("syncStatus");

    // Remove all state classes
    syncLink.classList.remove("loading", "error", "success");

    switch (state) {
      case "syncing":
        syncLink.classList.add("loading");
        syncSpinner.classList.remove("hidden");
        syncStatus.textContent = "Syncing...";
        syncStatus.className = "sync-status-text";
        break;
      case "success":
        syncLink.classList.add("success");
        syncSpinner.classList.add("hidden");
        syncStatus.textContent = "Sync successful!";
        syncStatus.className = "sync-status-text success";
        break;
      case "error":
        syncLink.classList.add("error");
        syncSpinner.classList.add("hidden");
        syncStatus.textContent = "Sync failed";
        syncStatus.className = "sync-status-text error";
        break;
      default:
        syncSpinner.classList.add("hidden");
        syncStatus.textContent = "Click to sync with website";
        syncStatus.className = "sync-status-text";
        break;
    }
  }

  updateUserInfo() {
    const userInfo = document.getElementById("userInfo");
    const userName = document.getElementById("userName");

    if (this.isLoggedIn && this.currentUser) {
      // Handle the user data structure from the API
      let displayName = "User";

      if (this.currentUser.user) {
        // API returns { user: { name, email, ... } }
        displayName =
          this.currentUser.user.name || this.currentUser.user.email || "User";
      } else if (this.currentUser.name || this.currentUser.email) {
        // Direct user object
        displayName = this.currentUser.name || this.currentUser.email || "User";
      }

      userName.textContent = displayName;
      userInfo.classList.remove("hidden");
    } else {
      userInfo.classList.add("hidden");
    }
  }

  hideUserInfo() {
    const userInfo = document.getElementById("userInfo");
    userInfo.classList.add("hidden");
  }

  updateDashboard() {
    // Update master resume buttons
    const uploadMasterBtn = document.getElementById("uploadMasterBtn");
    const editMasterBtn = document.getElementById("editMasterBtn");
    const downloadMasterBtn = document.getElementById("downloadMasterBtn");
    const downloadFileName = document.getElementById("downloadFileName");

    if (this.masterResume) {
      uploadMasterBtn.disabled = false; // Allow re-upload
      editMasterBtn.disabled = false;
      downloadMasterBtn.disabled = false;
      if (downloadFileName)
        downloadFileName.textContent = this.masterResume.fileName;
    } else {
      uploadMasterBtn.disabled = false; // Allow upload even without existing resume
      editMasterBtn.disabled = true;
      downloadMasterBtn.disabled = true;
      if (downloadFileName)
        downloadFileName.textContent = "No resume available";
    }
  }

  /**
   * Loading and notification methods
   */
  showLoading(message) {
    const loadingStatus = document.getElementById("loadingStatus");
    const loadingText = document.getElementById("loadingText");

    loadingText.textContent = message;
    loadingStatus.classList.remove("hidden");
    this.isLoading = true;
  }

  hideLoading() {
    const loadingStatus = document.getElementById("loadingStatus");
    loadingStatus.classList.add("hidden");
    this.hideResumeStatus();
    this.isLoading = false;
  }

  /**
   * Show resume-specific status message
   */
  showResumeStatus(message) {
    const resumeStatus = document.getElementById("resumeStatus");
    const displayMessage =
      this.sanitizeMessage(message) || String(message ?? "").trim();

    resumeStatus.textContent = "";

    const spinner = document.createElement("div");
    spinner.className = "spinner";

    const textSpan = document.createElement("span");
    textSpan.textContent = displayMessage;

    resumeStatus.append(spinner, textSpan);
    resumeStatus.classList.remove(
      "hidden",
      "status-success",
      "status-error"
    );
    resumeStatus.style.color = "";
  }

  /**
   * Hide resume-specific status message
   */
  hideResumeStatus() {
    const resumeStatus = document.getElementById("resumeStatus");
    resumeStatus.classList.add("hidden");
  }

  setResumeStatusMessage(message, type) {
    const resumeStatus = document.getElementById("resumeStatus");
    if (!resumeStatus) return;

    const displayMessage =
      this.sanitizeMessage(message) || String(message ?? "").trim();

    resumeStatus.textContent = "";
    const textSpan = document.createElement("span");
    textSpan.textContent = displayMessage;
    resumeStatus.appendChild(textSpan);
    resumeStatus.classList.remove("hidden", "status-success", "status-error");
    resumeStatus.style.color = "";

    if (type === "success") {
      resumeStatus.classList.add("status-success");
      resumeStatus.style.color = "#188038";
    } else if (type === "error") {
      resumeStatus.classList.add("status-error");
      resumeStatus.style.color = "#d93025";
    }
  }

  sanitizeMessage(message) {
    if (message == null) {
      return "";
    }

    const stringified =
      typeof message === "string" ? message : String(message);
    const trimmed = stringified.trim();
    if (!trimmed) {
      return "";
    }

    const withoutTags = trimmed.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    const result = withoutTags.trim();
    return result ? result.slice(0, 200).trim() : "";
  }

  normalizeResumeErrorMessage(rawMessage) {
    const defaultMessage = "Resume generation failed.";
    const sanitized = this.sanitizeMessage(rawMessage);

    if (!sanitized) {
      return defaultMessage;
    }

    let result = sanitized;
    const prefixPattern = /^Resume generation failed:\s*/i;
    while (prefixPattern.test(result)) {
      result = result.replace(prefixPattern, "").trim();
    }

    if (!result) {
      return defaultMessage;
    }

    return `Resume generation failed: ${result}`;
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showInfo(message) {
    this.showNotification(message, "info");
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to body
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  closeExtension() {
    window.close();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.popupController = new PopupController();
});
