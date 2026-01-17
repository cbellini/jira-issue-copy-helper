/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Content script for Jira Issue Copy Helper
 * Extracts issue key and summary from Jira pages
 */

(function () {
  "use strict";

  // Track current URL for SPA navigation detection
  let currentUrl = window.location.href;

  /**
   * Extracts issue data from the current Jira page
   * Handles both Jira Cloud and various page layouts
   */
  function extractIssueData() {
    const data = {
      key: null,
      summary: null,
      url: window.location.href,
    };

    // Strategy 1: Extract from URL (most reliable for issue key)
    const urlMatch = window.location.href.match(
      /\/browse\/([A-Z][A-Z0-9]+-\d+)/i,
    );
    if (urlMatch) {
      data.key = urlMatch[1].toUpperCase();
    }

    // Strategy 2: Check for selectedIssue query param (board/backlog views)
    if (!data.key) {
      const urlParams = new URLSearchParams(window.location.search);
      const selectedIssue = urlParams.get("selectedIssue");
      if (selectedIssue && /^[A-Z][A-Z0-9]+-\d+$/i.test(selectedIssue)) {
        data.key = selectedIssue.toUpperCase();
      }
    }

    // Strategy 3: Check for issue key in breadcrumb or header
    if (!data.key) {
      // Jira Cloud - breadcrumb
      const breadcrumbKey = document.querySelector(
        '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"] a',
      );
      if (breadcrumbKey) {
        data.key = breadcrumbKey.textContent.trim();
      }
    }

    if (!data.key) {
      // Look for issue key in various common selectors
      const keySelectors = [
        '[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"]',
        '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]',
        "#key-val",
        ".issue-link-key",
        '[data-test-id="issue.views.issue-details.issue-key"]',
      ];

      for (const selector of keySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const keyMatch = element.textContent.match(/([A-Z][A-Z0-9]+-\d+)/i);
          if (keyMatch) {
            data.key = keyMatch[1].toUpperCase();
            break;
          }
        }
      }
    }

    // Extract summary/title
    const summarySelectors = [
      '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
      '[data-testid="issue.views.issue-details.issue-layout.summary"]',
      "#summary-val",
      'h1[data-testid="issue.views.issue-details.issue-header.title"]',
      ".ghx-summary",
      "h1.sc-bwzfXH", // Newer Jira Cloud
      '[data-test-id="issue.views.issue-details.issue-header"]',
    ];

    for (const selector of summarySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.summary = element.textContent.trim();
        break;
      }
    }

    // Fallback: Try to get summary from page title
    if (!data.summary && document.title) {
      // Page titles often follow pattern: "[KEY] Summary - Jira"
      const titleMatch = document.title.match(
        /\[([A-Z][A-Z0-9]+-\d+)\]\s*(.+?)(?:\s*-\s*Jira)?$/i,
      );
      if (titleMatch) {
        if (!data.key) {
          data.key = titleMatch[1].toUpperCase();
        }
        data.summary = titleMatch[2].trim();
      }
    }

    // Clean up the URL to be canonical
    if (data.key) {
      const baseUrl = window.location.origin;
      data.url = `${baseUrl}/browse/${data.key}`;
    }

    return data;
  }

  /**
   * Generates formatted strings for different copy formats
   */
  function generateFormats(issueData) {
    const { key, summary, url } = issueData;

    if (!key) {
      return null;
    }

    const fullTitle = summary ? `${key} - ${summary}` : key;

    return {
      plainText: fullTitle,
      markdown: `[${fullTitle}](${url})`,
      markdownShort: `[${key}](${url})`,
      html: `<a href="${url}">${escapeHtml(fullTitle)}</a>`,
    };
  }

  /**
   * Escapes HTML special characters
   */
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Notify background script of URL changes (for SPA navigation)
   */
  function notifyUrlChange() {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      currentUrl = newUrl;
      browser.runtime
        .sendMessage({
          action: "urlChanged",
          url: newUrl,
        })
        .catch(() => {
          // Background script might not be ready, ignore
        });
    }
  }

  // Listen for messages from the popup
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getIssueData") {
      const issueData = extractIssueData();
      const formats = generateFormats(issueData);

      sendResponse({
        issueData: issueData,
        formats: formats,
      });
    }
    return true; // Keep the message channel open for async response
  });

  // Detect SPA navigation (Jira is a single-page app)
  // Use MutationObserver to detect when the app navigates
  const observer = new MutationObserver(() => {
    notifyUrlChange();
  });

  // Observe changes to the document that might indicate navigation
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also check on popstate (browser back/forward)
  window.addEventListener("popstate", notifyUrlChange);

  // Periodic check as a fallback (every 2 seconds)
  setInterval(notifyUrlChange, 2000);

  // Also expose data for debugging
  window.__jiraCopyHelper = {
    extractIssueData,
    generateFormats,
  };
})();
