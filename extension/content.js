/**
 * Content Script for Lazy Me Extension
 * Handles webpage interaction, job content extraction, and communication with background script
 */

class ContentScript {
  constructor() {
    this.isInitialized = false;
    this.jobContent = null;
    this.siteType = "unknown";

    this.init();
  }

  async init() {
    try {

      // Setup message listeners
      this.setupMessageListeners();

      // Detect if this is a job posting page
      await this.detectJobPosting();

      this.isInitialized = true;

    } catch (error) {
      console.error("ContentScript: Failed to initialize:", error);
    }
  }

  /**
   * Setup message listeners for communication with background script
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

      switch (request.type) {
        case "SCAN_JOB_POSTING":
          this.handleScanJobPosting(request, sendResponse);
          break;

        case "EXTRACT_JOB_CONTENT":
          this.handleExtractJobContent(request, sendResponse);
          break;

        case "SESSION_CHANGED":
          this.handleSessionChanged(request, sendResponse);
          break;

        default:
          console.warn("ContentScript: Unknown message type:", request.type);
          sendResponse({ error: "Unknown message type" });
      }

      return true; // Indicates we will send a response asynchronously
    });
  }

  /**
   * Handle job posting scan request
   */
  async handleScanJobPosting(request, sendResponse) {
    try {

      this.siteType = request.siteType || "unknown";
      const jobContent = await this.extractJobContent();

      if (jobContent) {
        this.jobContent = jobContent;

        // Show job detection indicator
        this.showJobDetectionIndicator();

        sendResponse({
          success: true,
          jobContent: jobContent,
          siteType: this.siteType,
        });
      } else {

        sendResponse({ success: false, error: "No job content found" });
      }
    } catch (error) {
      console.error("ContentScript: Error scanning job posting:", error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle job content extraction request
   */
  async handleExtractJobContent(request, sendResponse) {
    try {
      const jobContent = await this.extractJobContent();
      sendResponse({
        success: true,
        jobContent: jobContent,
        siteType: this.siteType,
      });
    } catch (error) {
      console.error("ContentScript: Error extracting job content:", error);
      sendResponse({ error: error.message });
    }
  }

  /**
   * Handle session changes
   */
  handleSessionChanged(request, sendResponse) {

    // Update any UI elements based on session state
    sendResponse({ success: true });
  }

  /**
   * Detect if current page is a job posting
   */
  async detectJobPosting() {
    try {
      const jobContent = await this.extractJobContent();
      if (jobContent) {

        this.jobContent = jobContent;
        this.showJobDetectionIndicator();
      }
    } catch (error) {
      console.error("ContentScript: Error detecting job posting:", error);
    }
  }

  /**
   * Extract job content from the current page
   */
  async extractJobContent() {
    try {
      const url = window.location.href;
      const hostname = window.location.hostname.toLowerCase();

      // Determine extraction strategy based on site type
      if (hostname.includes("linkedin")) {
        return await this.extractLinkedInJob();
      } else if (hostname.includes("indeed")) {
        return await this.extractIndeedJob();
      } else if (hostname.includes("glassdoor")) {
        return await this.extractGlassdoorJob();
      } else if (hostname.includes("monster")) {
        return await this.extractMonsterJob();
      } else if (hostname.includes("ziprecruiter")) {
        return await this.extractZipRecruiterJob();
      } else {
        // Generic extraction for unknown sites
        return await this.extractGenericJob();
      }
    } catch (error) {
      console.error("ContentScript: Error extracting job content:", error);
      return null;
    }
  }

  /**
   * Extract job content from LinkedIn
   */
  async extractLinkedInJob() {
    try {
      const title = this.getTextFromSelectors([
        ".job-details-jobs-unified-top-card__job-title",
        ".jobs-unified-top-card__job-title",
        "h1[data-test-job-title]",
        ".job-details-jobs-unified-top-card__primary-description h1",
        "h1",
      ]);

      const company = this.getTextFromSelectors([
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name",
        "[data-test-company-name]",
        ".job-details-jobs-unified-top-card__company-name a",
      ]);

      const location = this.getTextFromSelectors([
        ".job-details-jobs-unified-top-card__bullet",
        ".jobs-unified-top-card__primary-description li",
        "[data-test-job-location]",
        ".job-details-jobs-unified-top-card__workplace-type",
      ]);

      const description = this.getTextFromSelectors([
        ".jobs-description-content__text",
        ".jobs-box__html-content",
        ".jobs-description__content",
        "section[data-test-description]",
        "[data-test-id='job-details']",
      ]);

      const jobUrl = this.getLinkedInJobUrl();

      const jobContent = {
        title,
        company,
        location,
        description,
        requirements: description,
        url: jobUrl,
        rawUrl: window.location.href,
        siteType: "linkedin",
      };

      return this.validateJobContent(jobContent);
    } catch (error) {
      console.error("ContentScript: Error extracting LinkedIn job:", error);
      return null;
    }
  }

  getLinkedInJobUrl() {
    const preferredUrl = this.getPreferredLinkedInJobUrl();
    if (preferredUrl) {
      return preferredUrl;
    }

    try {
      const jobId = this.getLinkedInJobId();
      if (jobId) {
        return `https://www.linkedin.com/jobs/view/${jobId}`;
      }
    } catch (_error) {
      // Ignore malformed job IDs and continue with default.
    }

    return window.location.href;
  }

  getPreferredLinkedInJobUrl() {
    const candidates = [];

    const jobTitleAnchor = document.querySelector(
      ".job-details-jobs-unified-top-card__job-title a[href*='/jobs/view/']"
    );
    if (jobTitleAnchor) {
      try {
        const absoluteHref = new URL(
          jobTitleAnchor.getAttribute("href"),
          window.location.origin
        ).toString();
        candidates.push(absoluteHref);
      } catch (error) {
        // Ignore malformed URLs
      }
    }

    const canonicalLink = document.querySelector("link[rel='canonical']");
    if (canonicalLink?.href) {
      candidates.push(canonicalLink.href);
    }

    const ogUrl = document
      .querySelector("meta[property='og:url']")
      ?.getAttribute("content");
    if (ogUrl) {
      candidates.push(ogUrl);
    }

    const shareLinkSelectors = [
      "[data-share-copy-link]",
      "[data-share-url]",
      "[data-share-modal-form-url]",
      "[data-share-link]",
      "button[aria-label*='Copy link']",
    ];

    for (const selector of shareLinkSelectors) {
      const element = document.querySelector(selector);
      if (!element) continue;

      const dataset = element.dataset || {};
      const shareProps = [
        dataset.shareCopyLink,
        dataset.shareUrl,
        dataset.shareModalFormUrl,
        dataset.shareLink,
      ].filter(Boolean);

      for (const prop of shareProps) {
        candidates.push(prop);
      }

      const attrCandidates = [
        element.getAttribute("data-share-copy-link"),
        element.getAttribute("data-share-url"),
        element.getAttribute("data-share-modal-form-url"),
        element.getAttribute("data-share-link"),
        element.getAttribute("href"),
      ].filter(Boolean);

      candidates.push(...attrCandidates);
    }

    const scripts = Array.from(
      document.querySelectorAll("script[type='application/ld+json']")
    );
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || "{}");
        if (data?.hiringOrganization?.sameAs) {
          candidates.push(data.hiringOrganization.sameAs);
        }
        if (data?.url) {
          candidates.push(data.url);
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }

    for (const candidate of candidates) {
      const normalized = this.normalizeLinkedInJobUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  normalizeLinkedInJobUrl(url) {
    if (!url || typeof url !== "string") {
      return null;
    }

    try {
      const decoded = decodeURIComponent(url);
      const trimmed = decoded.trim();

      if (!trimmed || !trimmed.includes("linkedin.com")) {
        return null;
      }

      const jobViewMatch = trimmed.match(
        /(https:\/\/www\.linkedin\.com\/jobs\/view\/\d+)/i
      );
      if (jobViewMatch && jobViewMatch[1]) {
        return jobViewMatch[1];
      }

      const urlObj = new URL(trimmed);
      if (urlObj.pathname.includes("/jobs/view/")) {
        urlObj.search = "";
        urlObj.hash = "";
        return urlObj.toString();
      }
    } catch (error) {
      // Ignore failures and continue to next candidate
    }

    return null;
  }

  getLinkedInJobId() {
    const queryParams = new URLSearchParams(window.location.search);
    const possibleKeys = ["currentJobId", "jobId", "job_id"];

    for (const key of possibleKeys) {
      const value = queryParams.get(key);
      if (value && /^\d+$/.test(value)) {
        return value;
      }
    }

    const dataJobIdElement = document.querySelector("[data-job-id]");
    const dataJobId = dataJobIdElement?.getAttribute("data-job-id");
    if (dataJobId && /^\d+$/.test(dataJobId)) {
      return dataJobId;
    }

    const jobIdMatch = document.body.innerHTML.match(
      /"jobId"\s*:\s*"(\d+)"/
    );
    if (jobIdMatch && jobIdMatch[1]) {
      return jobIdMatch[1];
    }

    return null;
  }

  /**
   * Extract job content from Indeed
   */
  async extractIndeedJob() {
    try {
      const jobContent = {
        title:
          this.getTextContent('[data-testid="job-title"]') ||
          this.getTextContent(".jobsearch-JobInfoHeader-title"),
        company:
          this.getTextContent('[data-testid="company-name"]') ||
          this.getTextContent(".jobsearch-CompanyInfoContainer"),
        location:
          this.getTextContent('[data-testid="job-location"]') ||
          this.getTextContent(".jobsearch-JobInfoHeader-subtitle"),
        description: this.getTextContent("#jobDescriptionText"),
        requirements: this.getTextContent("#jobDescriptionText"),
        url: window.location.href,
        siteType: "indeed",
      };

      return this.validateJobContent(jobContent);
    } catch (error) {
      console.error("ContentScript: Error extracting Indeed job:", error);
      return null;
    }
  }

  /**
   * Extract job content from Glassdoor
   */
  async extractGlassdoorJob() {
    try {
      const jobContent = {
        title: this.getTextContent(".jobTitle"),
        company: this.getTextContent(".employerName"),
        location: this.getTextContent(".location"),
        description: this.getTextContent(".jobDescriptionContent"),
        requirements: this.getTextContent(".jobDescriptionContent"),
        url: window.location.href,
        siteType: "glassdoor",
      };

      return this.validateJobContent(jobContent);
    } catch (error) {
      console.error("ContentScript: Error extracting Glassdoor job:", error);
      return null;
    }
  }

  /**
   * Extract job content from Monster
   */
  async extractMonsterJob() {
    try {
      const jobContent = {
        title: this.getTextContent(".job-title"),
        company: this.getTextContent(".company-name"),
        location: this.getTextContent(".location"),
        description: this.getTextContent(".job-description"),
        requirements: this.getTextContent(".job-description"),
        url: window.location.href,
        siteType: "monster",
      };

      return this.validateJobContent(jobContent);
    } catch (error) {
      console.error("ContentScript: Error extracting Monster job:", error);
      return null;
    }
  }

  /**
   * Extract job content from ZipRecruiter
   */
  async extractZipRecruiterJob() {
    try {
      const jobContent = {
        title: this.getTextContent(".job_title"),
        company: this.getTextContent(".company_name"),
        location: this.getTextContent(".location"),
        description: this.getTextContent(".job_description"),
        requirements: this.getTextContent(".job_description"),
        url: window.location.href,
        siteType: "ziprecruiter",
      };

      return this.validateJobContent(jobContent);
    } catch (error) {
      console.error("ContentScript: Error extracting ZipRecruiter job:", error);
      return null;
    }
  }

  /**
   * Generic job content extraction
   */
  async extractGenericJob() {
    try {
      // Try common selectors for job information
      const jobContent = {
        title:
          this.getTextContent("h1") ||
          this.getTextContent(".job-title") ||
          this.getTextContent('[class*="title"]'),
        company:
          this.getTextContent('[class*="company"]') ||
          this.getTextContent('[class*="employer"]'),
        location:
          this.getTextContent('[class*="location"]') ||
          this.getTextContent('[class*="address"]'),
        description:
          this.getTextContent('[class*="description"]') ||
          this.getTextContent('[class*="content"]'),
        requirements:
          this.getTextContent('[class*="requirement"]') ||
          this.getTextContent('[class*="qualification"]'),
        url: window.location.href,
        siteType: "generic",
      };

      return this.validateJobContent(jobContent);
    } catch (error) {
      console.error("ContentScript: Error extracting generic job:", error);
      return null;
    }
  }

  /**
   * Get text content from selector
   */
  getTextContent(selector) {
    try {
      const element = document.querySelector(selector);
      return element ? element.textContent.trim() : null;
    } catch (error) {
      return null;
    }
  }

  getTextFromSelectors(selectors = []) {
    if (!Array.isArray(selectors)) return null;
    for (const selector of selectors) {
      const text = this.getTextContent(selector);
      if (text) {
        return text;
      }
    }
    return null;
  }

  /**
   * Validate job content
   */
  validateJobContent(jobContent) {
    if (!jobContent) return null;

    // Check if we have at least title and description
    if (jobContent.title && jobContent.description) {
      return jobContent;
    }

    return null;
  }

  /**
   * Show job detection indicator
   */
  showJobDetectionIndicator() {
    try {
      // Remove existing indicator if any
      const existingIndicator = document.getElementById("lazyme-job-indicator");
      if (existingIndicator) {
        existingIndicator.remove();
      }

      // Create indicator element
      const indicator = document.createElement("div");
      indicator.id = "lazyme-job-indicator";
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.3s ease;
      `;

      indicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>🎯</span>
          <span>Job detected! Click to generate resume</span>
        </div>
      `;

      // Add click handler
      indicator.addEventListener("click", () => {
        this.generateResume();
      });

      // Add hover effect
      indicator.addEventListener("mouseenter", () => {
        indicator.style.transform = "scale(1.05)";
        indicator.style.background = "#45a049";
      });

      indicator.addEventListener("mouseleave", () => {
        indicator.style.transform = "scale(1)";
        indicator.style.background = "#4CAF50";
      });

      // Add to page
      document.body.appendChild(indicator);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (indicator && indicator.parentNode) {
          indicator.style.opacity = "0";
          setTimeout(() => {
            if (indicator && indicator.parentNode) {
              indicator.remove();
            }
          }, 300);
        }
      }, 10000);
    } catch (error) {
      console.error(
        "ContentScript: Error showing job detection indicator:",
        error
      );
    }
  }

  /**
   * Generate resume from current job
   */
  async generateResume() {
    try {

      // Send message to background script to generate resume
      const response = await chrome.runtime.sendMessage({
        type: "GENERATE_RESUME",
        jobContent: this.jobContent,
        tabId: null, // Background script will determine current tab
      });

      if (response && response.success) {

        // Show success message
        this.showSuccessMessage(
          "Resume generation started! Check your extension popup for progress."
        );
      } else {
        console.error(
          "ContentScript: Resume generation failed:",
          response?.error
        );
        this.showErrorMessage("Failed to generate resume. Please try again.");
      }
    } catch (error) {
      console.error("ContentScript: Error generating resume:", error);
      this.showErrorMessage("Failed to generate resume. Please try again.");
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    this.showMessage(message, "#4CAF50");
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    this.showMessage(message, "#f44336");
  }

  /**
   * Show temporary message
   */
  showMessage(message, color) {
    try {
      const messageEl = document.createElement("div");
      messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10001;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      `;

      messageEl.textContent = message;
      document.body.appendChild(messageEl);

      // Remove after 3 seconds
      setTimeout(() => {
        if (messageEl && messageEl.parentNode) {
          messageEl.remove();
        }
      }, 3000);
    } catch (error) {
      console.error("ContentScript: Error showing message:", error);
    }
  }
}

// Initialize content script when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new ContentScript();
  });
} else {
  new ContentScript();
}
