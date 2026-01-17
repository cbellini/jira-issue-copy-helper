/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Background script for Jira Issue Copy Helper
 * Manages page action visibility based on URL patterns
 *
 * Shows the icon only when a specific issue can be identified:
 * - Direct issue pages: /browse/ISSUE-123
 * - Board/backlog/timeline views WITH selectedIssue parameter
 */

(function () {
  "use strict";

  /**
   * Check if URL points to an identifiable Jira issue
   * Returns true only if we can determine which issue to copy
   */
  function hasIdentifiableIssue(url) {
    if (!url) return false;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      const searchParams = urlObj.searchParams;

      // Must be an Atlassian site
      if (!hostname.endsWith(".atlassian.net")) {
        return false;
      }

      // Pattern 1: Direct issue view - /browse/ISSUE-123
      // Always show - the issue key is in the URL path
      if (/\/browse\/[A-Z][A-Z0-9]+-\d+/i.test(pathname)) {
        return true;
      }

      // Pattern 2: Board view - /jira/software/*/boards/*
      // Only show if selectedIssue parameter exists
      if (/\/jira\/software\/[^/]+\/boards\/\d+\/?$/.test(pathname)) {
        return searchParams.has("selectedIssue");
      }

      // Pattern 3: Backlog view - /jira/software/*/boards/*/backlog
      // Only show if selectedIssue parameter exists
      if (/\/jira\/software\/[^/]+\/boards\/\d+\/backlog\/?/.test(pathname)) {
        return searchParams.has("selectedIssue");
      }

      // Pattern 4: Timeline view - /jira/software/*/boards/*/timeline
      // Only show if selectedIssue parameter exists
      if (/\/jira\/software\/[^/]+\/boards\/\d+\/timeline\/?/.test(pathname)) {
        return searchParams.has("selectedIssue");
      }

      // Pattern 5: Issue detail panel in other views
      // Check for selectedIssue in any /jira/ path
      if (pathname.startsWith("/jira/") && searchParams.has("selectedIssue")) {
        return true;
      }

      // No identifiable issue found
      return false;
    } catch (e) {
      console.debug("Error parsing URL:", e);
      return false;
    }
  }

  /**
   * Update page action visibility for a tab
   */
  function updatePageAction(tabId, url) {
    if (hasIdentifiableIssue(url)) {
      browser.pageAction.show(tabId);
    } else {
      browser.pageAction.hide(tabId);
    }
  }

  // Listen for tab updates (URL changes, including SPA navigation)
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check on URL change or when page completes loading
    if (changeInfo.url || changeInfo.status === "complete") {
      updatePageAction(tabId, tab.url);
    }
  });

  // Listen for tab activation (switching tabs)
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      updatePageAction(tab.id, tab.url);
    } catch (err) {
      // Tab might have been closed
      console.debug("Could not get tab info:", err);
    }
  });

  // Check all existing tabs on startup
  browser.tabs.query({}).then((tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && tab.url) {
        updatePageAction(tab.id, tab.url);
      }
    });
  });

  // Handle history state changes (SPA navigation without full page load)
  // This is triggered by the content script when it detects URL changes
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "urlChanged" && sender.tab) {
      updatePageAction(sender.tab.id, request.url);
    }
    return false;
  });
})();
