# Jira Issue Copy Helper

A Firefox extension that lets you quickly copy Jira issue details to your clipboard in various formats, similar to Bugzilla's copy functionality.

## Features

Copy Jira issue information in four formats:

| Format | Output Example |
|--------|----------------|
| **Plain Text** | `PROJ-123 - Issue summary here` |
| **Markdown** | `[PROJ-123 - Issue summary here](https://yoursite.atlassian.net/browse/PROJ-123)` |
| **Markdown (Short)** | `[PROJ-123](https://yoursite.atlassian.net/browse/PROJ-123)` |
| **HTML** | `<a href="https://yoursite.atlassian.net/browse/PROJ-123">PROJ-123 - Issue summary here</a>` |

### Address Bar Integration

The extension icon appears in the Firefox address bar only when you're viewing a Jira issue page. This keeps your browser clean and makes the feature discoverable exactly when you need it.

## Usage

1. Navigate to any Jira issue page (e.g., `https://yoursite.atlassian.net/browse/PROJ-123`)
2. Look for the extension icon in the **address bar** (right side)
3. Click the icon to open the copy menu
4. Choose your preferred format and click the button
5. The formatted text is now in your clipboard!

## Supported Jira URLs

The extension icon appears in the address bar **only when a specific issue can be identified**:

| URL Pattern | Icon Shown? | Notes |
|-------------|-------------|-------|
| `*.atlassian.net/browse/PROJ-123` | ✅ Yes | Direct issue view |
| `*.atlassian.net/jira/software/*/boards/*` | ❌ No | Board view (no issue selected) |
| `*.atlassian.net/jira/software/*/boards/*?selectedIssue=PROJ-123` | ✅ Yes | Board with issue panel open |
| `*.atlassian.net/jira/software/*/boards/*/backlog` | ❌ No | Backlog view (no issue selected) |
| `*.atlassian.net/jira/software/*/boards/*/backlog?selectedIssue=PROJ-123` | ✅ Yes | Backlog with issue panel open |
| `*.atlassian.net/jira/software/*/boards/*/timeline` | ❌ No | Timeline view (no issue selected) |
| `*.atlassian.net/jira/software/*/boards/*/timeline?selectedIssue=PROJ-123` | ✅ Yes | Timeline with issue panel open |

The extension detects issues from:
- The URL path (`/browse/PROJ-123`)
- The `selectedIssue` query parameter (board/backlog/timeline views)