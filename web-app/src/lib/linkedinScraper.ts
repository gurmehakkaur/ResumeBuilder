import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { Browser, Page } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

export interface LinkedInJobData {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
}

export interface ScrapeOptions {
  timeout?: number;
  headless?: boolean;
}

// Check if we're running in a serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

/**
 * Finds Chrome/Chromium executable path for local development
 * @returns Path to Chrome executable or null if not found
 */
function findChromeExecutable(): string | null {
  // Check if CHROME_PATH is explicitly set
  if (process.env.CHROME_PATH) {
    const chromePath = process.env.CHROME_PATH;
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Common Chrome/Chromium paths by platform
  const platform = process.platform;
  const possiblePaths: string[] = [];

  if (platform === 'darwin') {
    // macOS paths
    possiblePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    );
  } else if (platform === 'linux') {
    // Linux paths
    possiblePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    );
  } else if (platform === 'win32') {
    // Windows paths
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    
    possiblePaths.push(
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Chromium', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Chromium', 'Application', 'chrome.exe'),
    );
  }

  // Try to find an existing Chrome executable
  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

/**
 * Extracts job information from a LinkedIn job posting URL
 * Optimized for serverless environments (Vercel)
 * @param url - LinkedIn job posting URL
 * @param options - Optional configuration for scraping
 * @returns Promise with extracted job data
 */
export async function scrapeLinkedInJob(
  url: string,
  options: ScrapeOptions = {}
): Promise<LinkedInJobData> {
  const { timeout = 30000, headless = true } = options;

  // Validate URL
  if (!url || !url.includes('linkedin.com/jobs')) {
    throw new Error('Invalid LinkedIn job URL');
  }

  let browser: Browser | null = null;

  try {
    // Configure Chromium for serverless environment
    if (isServerless) {
      // For serverless (Vercel), use the bundled Chromium
      // Disable graphics mode for better performance in serverless
      chromium.setGraphicsMode = false;
      
      browser = await puppeteerCore.launch({
        args: [
          ...chromium.args,
          '--hide-scrollbars',
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        executablePath: await chromium.executablePath(),
        headless: 'shell',
      });
    } else {
      // For local development, try to use system Chrome/Chromium
      // This allows testing locally without downloading Chromium
      const chromePath = findChromeExecutable();
      
      if (!chromePath) {
        throw new Error(
          'Chrome/Chromium executable not found. Please install Google Chrome or set the CHROME_PATH environment variable to point to your Chrome executable.\n' +
          'Example: export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"'
        );
      }

      browser = await puppeteerCore.launch({
        headless: headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: chromePath,
      });
    }

    const page: Page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the LinkedIn job page
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait a bit for any modals to appear (they might be triggered by JavaScript)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Function to dismiss modals
    const dismissModals = async () => {
      try {
        // Force remove overflow-hidden and hide all modals immediately
        await page.evaluate(() => {
          // Remove overflow-hidden from body (this is a strong indicator of active modal)
          document.body.classList.remove('overflow-hidden');
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';

          // First, look for visible modals (those with --visible class or aria-hidden="false")
          const visibleModals = document.querySelectorAll(
            '.modal__overlay--visible, ' +
            '.modal__overlay[aria-hidden="false"], ' +
            '[aria-modal="true"][aria-hidden="false"], ' +
            '.modal:not([aria-hidden="true"])'
          );
          
          // Hide visible modals first
          visibleModals.forEach((modal) => {
            const htmlModal = modal as HTMLElement;
            htmlModal.style.display = 'none';
            htmlModal.style.visibility = 'hidden';
            htmlModal.style.opacity = '0';
            htmlModal.style.pointerEvents = 'none';
            htmlModal.classList.remove('modal__overlay--visible');
            htmlModal.classList.add('invisible', 'hidden');
            htmlModal.setAttribute('aria-hidden', 'true');
            
            // Also hide parent modal containers
            const parent = htmlModal.closest('.modal, [class*="modal"]');
            if (parent) {
              (parent as HTMLElement).style.display = 'none';
              (parent as HTMLElement).setAttribute('aria-hidden', 'true');
            }
          });

          // Hide all modal overlays and modals (catch any we might have missed)
          const allModals = document.querySelectorAll(
            '.modal__overlay, .modal, [class*="modal"], [class*="Modal"], ' +
            '.contextual-sign-in-modal, .sign-in-modal, ' +
            '[role="dialog"], [aria-modal="true"]'
          );
          
          allModals.forEach((modal) => {
            const htmlModal = modal as HTMLElement;
            // Skip if already hidden
            if (htmlModal.style.display === 'none') return;
            
            // Force hide with multiple methods
            htmlModal.style.display = 'none';
            htmlModal.style.visibility = 'hidden';
            htmlModal.style.opacity = '0';
            htmlModal.style.pointerEvents = 'none';
            htmlModal.classList.remove('modal__overlay--visible');
            htmlModal.classList.add('invisible', 'hidden');
            htmlModal.setAttribute('aria-hidden', 'true');
          });

          // Hide backdrop/scrim/overlay elements
          const overlays = document.querySelectorAll(
            '[class*="backdrop"], [class*="scrim"], [class*="overlay"], ' +
            '[class*="Overlay"], .bg-color-background-scrim, ' +
            '.top-level-modal-container'
          );
          
          overlays.forEach((overlay) => {
            const htmlOverlay = overlay as HTMLElement;
            htmlOverlay.style.display = 'none';
            htmlOverlay.style.visibility = 'hidden';
            htmlOverlay.style.opacity = '0';
            htmlOverlay.style.pointerEvents = 'none';
          });
        });

        // Try to click dismiss buttons if they exist (even if not visible, we'll force click)
        const dismissButtonSelectors = [
          'button.modal__dismiss[aria-label="Dismiss"]',
          'button.contextual-sign-in-modal__modal-dismiss',
          'button.sign-in-modal__dismiss',
          'button[aria-label="Dismiss"]',
          'button[aria-label="Close"]',
          '.modal__dismiss',
        ];

        // First try clicking visible buttons
        for (const selector of dismissButtonSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              // Check if visible
              const isVisible = await page.evaluate((el) => {
                if (!el) return false;
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       rect.width > 0 && 
                       rect.height > 0;
              }, button);

              if (isVisible) {
                await button.click({ delay: 100 }).catch(() => {});
                await new Promise(resolve => setTimeout(resolve, 500));
                break;
              }
            }
          } catch {
            // Continue to next selector
          }
        }

        // Also try clicking buttons even if they appear hidden (sometimes they're clickable)
        // This is a fallback in case the visibility check was too strict
        try {
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button.modal__dismiss, button[aria-label="Dismiss"]');
            buttons.forEach((btn) => {
              (btn as HTMLElement).click();
            });
          });
        } catch {
          // Ignore errors
        }

        // Wait for modal dismissal animations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error dismissing modals:', error);
      }
    };

    // Dismiss modals
    await dismissModals();

    // Try dismissing again after a delay (in case modal appears after first dismissal)
    await new Promise(resolve => setTimeout(resolve, 1500));
    await dismissModals();

    // Wait for the main content to load (try both guest and logged-in selectors)
    await page.waitForSelector(
      '.topcard__title, .job-details-jobs-unified-top-card__job-title, h1, .decorated-job-posting__details', 
      {
        timeout: 10000,
      }
    ).catch(() => {
      // Some pages might have different selectors
    });

    // Wait for job description section to load (try both guest and logged-in selectors)
    await page.waitForSelector(
      '.description__text--rich, .show-more-less-html__markup, article.jobs-description__container, #job-details, .jobs-description__container, .decorated-job-posting__details', 
      {
        timeout: 15000,
      }
    ).catch(() => {
      // Description might not be available immediately
    });

    // Wait for company section to load (try both guest and logged-in selectors)
    await page.waitForSelector(
      '.topcard__org-name-link, .jobs-company, .jobs-company__box, section[data-view-name*="about-company"]', 
      {
        timeout: 10000,
      }
    ).catch(() => {
      // Company section might not be available immediately
    });

    // Wait a bit more for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract job data using multiple selector strategies
    const jobData = await page.evaluate(() => {
      // Helper function to get text content safely, including handling nested elements
      const getText = (selector: string): string => {
        const element = document.querySelector(selector);
        if (!element) return '';
        
        // Get text content, which handles nested elements and ignores HTML comments
        // textContent is available on all Element types
        const text = element.textContent || '';
        return text.trim();
      };

      // Helper function to get text from multiple possible selectors
      const getTextFromSelectors = (selectors: string[]): string => {
        for (const selector of selectors) {
          const text = getText(selector);
          if (text && text.length > 0) return text;
        }
        return '';
      };

      // Extract Job Title - try guest page selectors first, then logged-in selectors
      const jobTitle = getTextFromSelectors([
        '.topcard__title',
        'h1.topcard__title',
        '.decorated-job-posting__details h1',
        '.job-details-jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__job-title',
        'h1.t-24.t-bold',
        'h1[class*="job-title"]',
        'h1',
        '.jobs-details-top-card__job-title',
      ]);

      // Extract Company Name - try guest page selectors first, then logged-in selectors
      let companyName = '';
      
      // First, try guest page topcard selectors
      const topcardCompanyLink = document.querySelector('.topcard__org-name-link, a.topcard__org-name-link');
      if (topcardCompanyLink) {
        companyName = (topcardCompanyLink.textContent || '').trim();
      }

      // If not found, try the "About the company" section (jobs-company section)
      if (!companyName || companyName.length === 0) {
        const aboutCompanySection = document.querySelector('.jobs-company, section[data-view-name*="about-company"]');
        if (aboutCompanySection) {
          // Look for the company name link in the artdeco-entity-lockup__title
          const aboutCompanyLink = aboutCompanySection.querySelector('.artdeco-entity-lockup__title a, a[data-view-name*="company-name"]');
          if (aboutCompanyLink) {
            companyName = (aboutCompanyLink.textContent || '').trim();
          }
        }
      }

      // If not found, try the jobs-company__box specifically
      if (!companyName || companyName.length === 0) {
        const companyBox = document.querySelector('.jobs-company__box');
        if (companyBox) {
          const companyLink = companyBox.querySelector('.artdeco-entity-lockup__title a');
          if (companyLink) {
            companyName = (companyLink.textContent || '').trim();
          }
        }
      }

      // Fallback to top card company name
      if (!companyName || companyName.length === 0) {
        const companyNameLink = document.querySelector('.job-details-jobs-unified-top-card__company-name a');
        if (companyNameLink) {
          companyName = (companyNameLink.textContent || '').trim();
        }
      }

      // If still not found, try the container div
      if (!companyName || companyName.length === 0) {
        const companyNameDiv = document.querySelector('.job-details-jobs-unified-top-card__company-name, .topcard__org-name');
        if (companyNameDiv) {
          companyName = (companyNameDiv.textContent || '').trim();
        }
      }

      // Extract Job Description - try guest page selectors first, then logged-in selectors
      let jobDescription = '';
      
      // First, try guest page description selectors (for non-logged-in users)
      const guestDescription = document.querySelector('.description__text--rich, .show-more-less-html__markup, .decorated-job-posting__details .description__text');
      if (guestDescription) {
        jobDescription = (guestDescription.textContent || '').trim();
        // Remove "THE POSITION" heading if present
        if (jobDescription.startsWith('THE POSITION')) {
          jobDescription = jobDescription.replace(/^THE POSITION\s*/i, '').trim();
        }
      }

      // If not found, try the core-section-container description
      if (!jobDescription || jobDescription.length < 50) {
        const coreDescription = document.querySelector('.core-section-container.description .description__text, .core-section-container__content .description__text');
        if (coreDescription) {
          const text = (coreDescription.textContent || '').trim();
          if (text.length > jobDescription.length) {
            jobDescription = text;
          }
        }
      }

      // If still not found, try logged-in user selectors (article with jobs-description__container)
      if (!jobDescription || jobDescription.length < 50) {
        const descriptionArticle = document.querySelector('article.jobs-description__container');
        if (descriptionArticle) {
          // Look for the #job-details element inside the article
          const jobDetailsElement = descriptionArticle.querySelector('#job-details');
          if (jobDetailsElement) {
            // Find the <p> tag that contains the actual description (skip the h2 heading)
            const descriptionParagraph = jobDetailsElement.querySelector('p[dir="ltr"], .mt4 p, p');
            if (descriptionParagraph) {
              // Get text from the paragraph directly
              jobDescription = (descriptionParagraph.textContent || '').trim();
            } else {
              // If no paragraph found, get all text from #job-details but remove the h2 content
              const h2Element = jobDetailsElement.querySelector('h2');
              let fullText = (jobDetailsElement.textContent || '').trim();
              if (h2Element) {
                const h2Text = (h2Element.textContent || '').trim();
                // Remove the heading text from the beginning
                fullText = fullText.replace(new RegExp(`^${h2Text}\\s*`, 'i'), '').trim();
              }
              if (fullText.length > jobDescription.length) {
                jobDescription = fullText;
              }
            }
          }
        }
      }

      // If still not found or too short, try finding #job-details directly
      if (!jobDescription || jobDescription.length < 50) {
        const jobDetailsElement = document.querySelector('#job-details');
        if (jobDetailsElement) {
          // Look for paragraph inside
          const paragraph = jobDetailsElement.querySelector('p[dir="ltr"], .mt4 p, p');
          if (paragraph) {
            const text = (paragraph.textContent || '').trim();
            if (text.length > jobDescription.length) {
              jobDescription = text;
            }
          } else {
            // Get all text and remove heading
            let text = (jobDetailsElement.textContent || '').trim();
            const h2 = jobDetailsElement.querySelector('h2');
            if (h2) {
              const h2Text = (h2.textContent || '').trim();
              text = text.replace(new RegExp(`^${h2Text}\\s*`, 'i'), '').trim();
            }
            if (text.length > jobDescription.length) {
              jobDescription = text;
            }
          }
        }
      }

      // Final fallback - try jobs-description__content directly
      if (!jobDescription || jobDescription.length < 50) {
        const descriptionContainer = document.querySelector('.jobs-description__content, .jobs-description-content');
        if (descriptionContainer) {
          // Try to find the paragraph
          const paragraph = descriptionContainer.querySelector('p[dir="ltr"], p');
          if (paragraph) {
            const text = (paragraph.textContent || '').trim();
            if (text.length > jobDescription.length) {
              jobDescription = text;
            }
          } else {
            let text = (descriptionContainer.textContent || '').trim();
            text = text.replace(/^About the job\s*/i, '').trim();
            if (text.length > jobDescription.length) {
              jobDescription = text;
            }
          }
        }
      }

      return {
        jobTitle,
        companyName,
        jobDescription,
      };
    });

    // Clean the job description after extraction
    if (jobData.jobDescription) {
      jobData.jobDescription = jobData.jobDescription
        // Remove "Show more" and "Show less" text (case insensitive, with optional spacing)
        .replace(/\b(Show\s+more|Show\s+less|show\s+more|show\s+less)\b/gi, '')
        // Remove multiple consecutive blank lines (3 or more newlines/whitespace)
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        // Remove leading/trailing whitespace from each line
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0) // Remove empty lines
        .join('\n')
        // Clean up any remaining excessive spaces
        .replace(/\s{3,}/g, ' ')
        // Remove any remaining "Show more"/"Show less" that might be on their own lines
        .replace(/\n*\s*(Show\s+more|Show\s+less|show\s+more|show\s+less)\s*\n*/gi, '')
        // Final trim
        .trim();
    }

    // If description is still empty or too short, try scrolling and waiting more
    if (!jobData.jobDescription || jobData.jobDescription.length < 50) {
      // Scroll to description section to trigger lazy loading
      await page.evaluate(() => {
        const descElement = document.querySelector('article.jobs-description__container, #job-details');
        if (descElement) {
          descElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      // Wait for potential lazy-loaded content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const retryDescription = await page.evaluate(() => {
        // Try the same approach as before - find article first
        const descriptionArticle = document.querySelector('article.jobs-description__container');
        if (descriptionArticle) {
          const jobDetailsElement = descriptionArticle.querySelector('#job-details');
          if (jobDetailsElement) {
            // Look for the paragraph that contains the description
            const paragraph = jobDetailsElement.querySelector('p[dir="ltr"], .mt4 p, p');
            if (paragraph) {
              return (paragraph.textContent || '').trim();
            }
            // Fallback: get all text and remove h2
            let text = (jobDetailsElement.textContent || '').trim();
            const h2 = jobDetailsElement.querySelector('h2');
            if (h2) {
              const h2Text = (h2.textContent || '').trim();
              text = text.replace(new RegExp(`^${h2Text}\\s*`, 'i'), '').trim();
            }
            return text;
          }
        }

        // Fallback: try #job-details directly
        const jobDetails = document.querySelector('#job-details');
        if (jobDetails) {
          const paragraph = jobDetails.querySelector('p[dir="ltr"], .mt4 p, p');
          if (paragraph) {
            return (paragraph.textContent || '').trim();
          }
          let text = (jobDetails.textContent || '').trim();
          const h2 = jobDetails.querySelector('h2');
          if (h2) {
            const h2Text = (h2.textContent || '').trim();
            text = text.replace(new RegExp(`^${h2Text}\\s*`, 'i'), '').trim();
          }
          return text;
        }

        return '';
      });

      if (retryDescription && retryDescription.length > (jobData.jobDescription?.length || 0)) {
        jobData.jobDescription = retryDescription;
        // Clean the retry description as well
        jobData.jobDescription = jobData.jobDescription
          .replace(/\b(Show\s+more|Show\s+less|show\s+more|show\s+less)\b/gi, '')
          .replace(/\n\s*\n\s*\n+/g, '\n\n')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('\n')
          .replace(/\s{3,}/g, ' ')
          .replace(/\n*\s*(Show\s+more|Show\s+less|show\s+more|show\s+less)\s*\n*/gi, '')
          .trim();
      }
    }

    // Validate that we got at least some data
    if (!jobData.jobTitle && !jobData.companyName) {
      throw new Error('Could not extract job information from the page');
    }

    // Validate description length
    if (!jobData.jobDescription || jobData.jobDescription.length < 50) {
      throw new Error('Unable to locate job description. The job posting may require authentication or the description may be missing.');
    }

    return {
      companyName: jobData.companyName || 'Unknown Company',
      jobTitle: jobData.jobTitle || 'Unknown Title',
      jobDescription: jobData.jobDescription,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('Chrome/Chromium executable not found') || error.message.includes('executablePath') || error.message.includes('channel')) {
        throw new Error(
          'Chrome/Chromium executable not found. Please install Google Chrome or set the CHROME_PATH environment variable.\n' +
          'For macOS: export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"\n' +
          'For Linux: export CHROME_PATH="/usr/bin/google-chrome"\n' +
          'For Windows: set CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"'
        );
      }
      if (error.message.includes('Invalid LinkedIn job URL')) {
        throw new Error('Invalid LinkedIn job URL. Please ensure the URL is a valid LinkedIn job posting link.');
      }
      if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
        throw new Error('Request timed out. The LinkedIn page took too long to load. Please try again or verify the URL is accessible.');
      }
      if (error.message.includes('net::ERR')) {
        throw new Error('Network error. Unable to reach LinkedIn. Please check your internet connection and try again.');
      }
      if (error.message.includes('Unable to locate job description')) {
        throw new Error('Unable to locate job description. The job posting may require authentication or the description may be missing. Please enter the details manually.');
      }
      if (error.message.includes('Could not extract job information')) {
        throw new Error('We couldn\'t fetch job details from this link. The page structure may have changed or the job may not be publicly accessible. Please verify the URL or enter the details manually.');
      }
      throw new Error(`Failed to scrape LinkedIn job: ${error.message}`);
    }
    throw new Error('Failed to scrape LinkedIn job: Unknown error occurred');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

