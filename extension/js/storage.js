/**
 * Storage Service for Lazy Me Extension
 * Handles local storage, file management, and data persistence
 */

class StorageService {
  constructor() {
    this.storageKey = CONFIG.SESSION.STORAGE_KEY;

  }

  /**
   * Store data in Chrome storage
   */
  async set(key, value) {
    try {
      const data = {};
      data[key] = value;
      await chrome.storage.local.set(data);

      return true;
    } catch (error) {
      console.error(
        `StorageService: Failed to store data for key ${key}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get data from Chrome storage
   */
  async get(key) {
    try {
      const result = await chrome.storage.local.get([key]);

      return result[key] || null;
    } catch (error) {
      console.error(
        `StorageService: Failed to get data for key ${key}:`,
        error
      );
      return null;
    }
  }

  /**
   * Remove data from Chrome storage
   */
  async remove(key) {
    try {
      await chrome.storage.local.remove([key]);

      return true;
    } catch (error) {
      console.error(
        `StorageService: Failed to remove data for key ${key}:`,
        error
      );
      return false;
    }
  }

  /**
   * Clear all storage data
   */
  async clear() {
    try {
      await chrome.storage.local.clear();

      return true;
    } catch (error) {
      console.error("StorageService: Failed to clear storage:", error);
      return false;
    }
  }

  /**
   * Get all storage data
   */
  async getAll() {
    try {
      const result = await chrome.storage.local.get(null);

      return result;
    } catch (error) {
      console.error("StorageService: Failed to get all storage data:", error);
      return {};
    }
  }

  /**
   * Store session data
   */
  async storeSession(sessionData) {
    return await this.set(this.storageKey, sessionData);
  }

  /**
   * Get session data
   */
  async getSession() {
    return await this.get(this.storageKey);
  }

  /**
   * Remove session data
   */
  async removeSession() {
    return await this.remove(this.storageKey);
  }

  /**
   * Store user data with caching
   */
  async storeUserData(userData) {
    const cacheData = {
      data: userData,
      timestamp: Date.now(),
    };
    return await this.set("userData", cacheData);
  }

  /**
   * Get cached user data
   */
  async getCachedUserData() {
    const cacheData = await this.get("userData");
    if (cacheData && cacheData.timestamp) {
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - cacheData.timestamp < maxAge) {
        return cacheData.data;
      }
    }
    return null;
  }

  /**
   * Remove cached user data
   */
  async removeCachedUserData() {
    return await this.remove("userData");
  }

  /**
   * Store resume status with caching
   */
  async storeResumeStatus(resumeData) {
    const cacheData = {
      data: resumeData,
      timestamp: Date.now(),
    };
    return await this.set("resumeStatus", cacheData);
  }

  /**
   * Get cached resume status
   */
  async getCachedResumeStatus() {
    const cacheData = await this.get("resumeStatus");
    if (cacheData && cacheData.timestamp) {
      // Cache is valid for the duration of the session (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - cacheData.timestamp < maxAge) {
        return cacheData.data;
      }
    }
    return null;
  }

  /**
   * Remove cached resume status
   */
  async removeCachedResumeStatus() {
    return await this.remove("resumeStatus");
  }

  /**
   * Store session-based cache with expiry tied to session token
   */
  async storeSessionCache(key, data, sessionToken) {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      sessionToken: sessionToken, // Tie cache to specific session
    };
    return await this.set(`sessionCache_${key}`, cacheData);
  }

  /**
   * Get session-based cache
   */
  async getSessionCache(key, currentSessionToken) {
    const cacheData = await this.get(`sessionCache_${key}`);
    if (cacheData && cacheData.timestamp && cacheData.sessionToken) {
      // Check if cache is for the current session
      if (cacheData.sessionToken === currentSessionToken) {
        // Cache is valid for the duration of the session (24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (Date.now() - cacheData.timestamp < maxAge) {
          return cacheData.data;
        }
      }
    }
    return null;
  }

  /**
   * Remove session-based cache
   */
  async removeSessionCache(key) {
    return await this.remove(`sessionCache_${key}`);
  }

  /**
   * Clear all session-based caches (useful when session changes)
   */
  async clearAllSessionCaches() {
    try {
      const allData = await this.getAll();
      const sessionCacheKeys = Object.keys(allData).filter((key) =>
        key.startsWith("sessionCache_")
      );

      if (sessionCacheKeys.length > 0) {
        await chrome.storage.local.remove(sessionCacheKeys);

      }
      return true;
    } catch (error) {
      console.error("StorageService: Failed to clear session caches:", error);
      return false;
    }
  }

  /**
   * Check if cache is valid for current session
   */
  async isCacheValid(key, currentSessionToken) {
    const cacheData = await this.get(`sessionCache_${key}`);
    if (cacheData && cacheData.sessionToken === currentSessionToken) {
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      return Date.now() - cacheData.timestamp < maxAge;
    }
    return false;
  }
}

// Create global instance
window.storageService = new StorageService();
