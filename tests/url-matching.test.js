/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Test suite for URL pattern matching in background_script.js
 * Ensures the page action icon is only shown when an issue can be identified
 */

const { expect } = require('chai');

/**
 * Extracted hasIdentifiableIssue function from background_script.js
 * This function determines whether a URL points to an identifiable Jira issue
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

describe('Jira URL Pattern Matching', () => {
  describe('Direct Issue View (/browse/*)', () => {
    it('should show icon on direct issue page', () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should show icon on direct issue page with uppercase project key', () => {
      const url = 'https://mycompany.atlassian.net/browse/ABC-456';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should show icon on direct issue page with numeric project key', () => {
      const url = 'https://mycompany.atlassian.net/browse/P2X-789';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should show icon on direct issue page with query parameters', () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123?page=com.atlassian.jira.plugin';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });

  describe('Board View (/jira/software/*/boards/*)', () => {
    it('should NOT show icon on board view without selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should show icon on board view WITH selectedIssue parameter', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1?selectedIssue=PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should show icon on board view with selectedIssue and other parameters', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1?rapidView=1&selectedIssue=PROJ-456';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should NOT show icon on board view with trailing slash but no selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should show icon on board view with trailing slash and selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/?selectedIssue=PROJ-789';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should handle different project identifiers in path', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/projects/ABC/boards/42?selectedIssue=ABC-100';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });

  describe('Backlog View (/jira/software/*/boards/*/backlog)', () => {
    it('should NOT show icon on backlog view without selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/backlog';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should show icon on backlog view WITH selectedIssue parameter', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/backlog?selectedIssue=PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should show icon on backlog view with selectedIssue and other parameters', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/backlog?modal=detail&selectedIssue=PROJ-456&view=planning';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should NOT show icon on backlog view with trailing slash but no selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/backlog/';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should show icon on backlog view with trailing slash and selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/backlog/?selectedIssue=PROJ-789';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });

  describe('Timeline View (/jira/software/*/boards/*/timeline)', () => {
    it('should NOT show icon on timeline view without selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/timeline';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should show icon on timeline view WITH selectedIssue parameter', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/timeline?selectedIssue=PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should show icon on timeline view with selectedIssue and other parameters', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/timeline?selectedIssue=PROJ-456&epic=PROJ-100';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should NOT show icon on timeline view with trailing slash but no selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/timeline/';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should show icon on timeline view with trailing slash and selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/timeline/?selectedIssue=PROJ-789';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });

  describe('Other Jira Views with selectedIssue', () => {
    it('should show icon on any /jira/ path with selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/projects/PROJ/issues?selectedIssue=PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should show icon on dashboard with selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/dashboards/12345?selectedIssue=PROJ-456';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should NOT show icon on /jira/ path without selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/projects/PROJ/issues';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });
  });

  describe('Non-Atlassian Sites', () => {
    it('should NOT show icon on non-Atlassian sites', () => {
      const url = 'https://example.com/browse/PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should NOT show icon on partially matching domain', () => {
      const url = 'https://notatlassian.net/browse/PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });
  });

  describe('Invalid URLs and Edge Cases', () => {
    it('should return false for null URL', () => {
      expect(hasIdentifiableIssue(null)).to.be.false;
    });

    it('should return false for undefined URL', () => {
      expect(hasIdentifiableIssue(undefined)).to.be.false;
    });

    it('should return false for empty string', () => {
      expect(hasIdentifiableIssue('')).to.be.false;
    });

    it('should return false for malformed URL', () => {
      expect(hasIdentifiableIssue('not-a-url')).to.be.false;
    });

    it('should handle URLs with fragments', () => {
      const url = 'https://mycompany.atlassian.net/browse/PROJ-123#comment-12345';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });

  describe('Project Settings and Admin Pages', () => {
    it('should NOT show icon on project settings page', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/settings';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should NOT show icon on admin pages', () => {
      const url = 'https://mycompany.atlassian.net/jira/settings/projects/PROJ';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should show icon on project settings page with selectedIssue (unusual but valid)', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/settings?selectedIssue=PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });

  describe('Issue Key Validation in selectedIssue', () => {
    it('should NOT require validation of selectedIssue format (trusts parameter presence)', () => {
      // The current implementation only checks for presence, not format
      // This test documents current behavior
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1?selectedIssue=invalid';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should work with valid issue key in selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1?selectedIssue=PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });

  describe('Board Variants', () => {
    it('should NOT show icon on board reports without selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/reports';
      expect(hasIdentifiableIssue(url)).to.be.false;
    });

    it('should show icon on board reports with selectedIssue', () => {
      const url = 'https://mycompany.atlassian.net/jira/software/c/projects/PROJ/boards/1/reports?selectedIssue=PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });

  describe('Multiple Subdomains', () => {
    it('should work with different Atlassian subdomain', () => {
      const url = 'https://anothercompany.atlassian.net/browse/PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });

    it('should work with board view on different subdomain', () => {
      const url = 'https://test-env.atlassian.net/jira/software/c/projects/PROJ/boards/1?selectedIssue=PROJ-123';
      expect(hasIdentifiableIssue(url)).to.be.true;
    });
  });
});
