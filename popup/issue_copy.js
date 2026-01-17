/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

(function () {
  "use strict";

  let issueFormats = null;

  /**
   * Initialize the popup
   */
  async function init() {
    try {
      // Get the active tab
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      if (!tab) {
        showError();
        return;
      }

      // Check if we're on a Jira page
      if (!isJiraUrl(tab.url)) {
        showError();
        return;
      }

      // Request issue data from the content script
      try {
        const response = await browser.tabs.sendMessage(tab.id, {
          action: "getIssueData",
        });

        if (response && response.formats && response.issueData.key) {
          issueFormats = response.formats;
          showIssueInfo(response.issueData);
          enableButtons();
        } else {
          showError();
        }
      } catch (err) {
        // Content script might not be loaded, try injecting it
        console.log("Content script not responding, attempting injection...");
        await injectContentScript(tab.id);

        // Retry after injection
        setTimeout(async () => {
          try {
            const response = await browser.tabs.sendMessage(tab.id, {
              action: "getIssueData",
            });
            if (response && response.formats && response.issueData.key) {
              issueFormats = response.formats;
              showIssueInfo(response.issueData);
              enableButtons();
            } else {
              showError();
            }
          } catch (retryErr) {
            console.error("Retry failed:", retryErr);
            showError();
          }
        }, 100);
      }
    } catch (err) {
      console.error("Init error:", err);
      showError();
    }
  }

  /**
   * Check if URL is a Jira URL
   */
  function isJiraUrl(url) {
    if (!url) return false;
    return (
      url.includes(".atlassian.net/") ||
      url.includes("/jira/") ||
      url.includes("/browse/")
    );
  }

  /**
   * Inject content script manually if needed
   */
  async function injectContentScript(tabId) {
    try {
      await browser.tabs.executeScript(tabId, { file: "content.js" });
    } catch (err) {
      console.error("Failed to inject content script:", err);
    }
  }

  /**
   * Display issue information in the popup
   */
  function showIssueInfo(issueData) {
    const issueInfo = document.getElementById("issue-info");
    const errorMessage = document.getElementById("error-message");
    const keyElement = document.getElementById("issue-key");
    const summaryElement = document.getElementById("issue-summary");

    keyElement.textContent = issueData.key;
    summaryElement.textContent = issueData.summary || "(No summary)";

    issueInfo.hidden = false;
    errorMessage.hidden = true;
  }

  /**
   * Show error state
   */
  function showError() {
    const issueInfo = document.getElementById("issue-info");
    const errorMessage = document.getElementById("error-message");
    const buttonGroup = document.getElementById("button-group");

    issueInfo.hidden = true;
    errorMessage.hidden = false;
    buttonGroup.hidden = true;
  }

  /**
   * Enable copy buttons and attach event listeners
   */
  function enableButtons() {
    const buttons = document.querySelectorAll(".copy-btn");

    buttons.forEach((button) => {
      button.disabled = false;
      button.addEventListener("click", handleCopyClick);
    });
  }

  /**
   * Handle copy button click
   */
  async function handleCopyClick(event) {
    const button = event.currentTarget;
    const format = button.dataset.format;

    if (!issueFormats || !issueFormats[format]) {
      console.error("Format not available:", format);
      return;
    }

    const textToCopy = issueFormats[format];

    try {
      // For HTML format, copy as both HTML and plain text
      if (format === "html") {
        await copyHtmlToClipboard(textToCopy, issueFormats.plainText);
      } else {
        await navigator.clipboard.writeText(textToCopy);
      }

      showCopiedFeedback(button);
    } catch (err) {
      console.error("Copy failed:", err);
      showErrorFeedback("Failed to copy to clipboard");
    }
  }

  /**
   * Copy HTML to clipboard with both HTML and plain text formats
   */
  async function copyHtmlToClipboard(html, plainText) {
    try {
      // Use ClipboardItem API for rich content
      const htmlBlob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([plainText], { type: "text/plain" });

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": textBlob,
        }),
      ]);
    } catch (err) {
      // ClipboardItem may not be supported in all contexts
      // Fall back to plain text copy of the HTML string
      console.warn(
        "ClipboardItem not supported, falling back to text copy:",
        err,
      );
      await navigator.clipboard.writeText(html);
    }
  }

  /**
   * Show visual feedback when copy succeeds
   */
  function showCopiedFeedback(button) {
    // Add copied class to button
    button.classList.add("copied");

    // Show toast
    const toast = document.getElementById("toast");
    toast.textContent = "Copied to clipboard!";
    toast.hidden = false;
    toast.classList.remove("hide", "error");

    // Reset after delay
    setTimeout(() => {
      button.classList.remove("copied");
      toast.classList.add("hide");

      setTimeout(() => {
        toast.hidden = true;
      }, 300);
    }, 1500);
  }

  /**
   * Show error feedback when copy fails
   */
  function showErrorFeedback(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove("hide");
    toast.classList.add("error");

    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => {
        toast.hidden = true;
        toast.classList.remove("error");
      }, 300);
    }, 3000);
  }

  // Initialize when DOM is ready
  document.addEventListener("DOMContentLoaded", init);
})();
