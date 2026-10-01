## Purpose

Makes The Office game discoverable from the site's navigation and lets a visitor move between the chatbot and the game without editing the URL.

## Requirements

### Requirement: Navigation links to Chat and Office
The site header SHALL present links to the chatbot page and the Office page, and SHALL NOT present links to pages that do not exist.

#### Scenario: Header shows both destinations
- **WHEN** a visitor loads the chatbot page
- **THEN** the header shows a Chat link and an Office link

#### Scenario: No dead links
- **WHEN** a visitor inspects the header links
- **THEN** every link resolves to an existing page

### Requirement: Navigation works under the deployed base path
Navigation links SHALL work both in local development and when the site is served from the `/susan-and-gloria/` base path on GitHub Pages.

#### Scenario: Office link on the deployed site
- **WHEN** a visitor clicks the Office link on the deployed site
- **THEN** the Office page opens without leaving the application or reloading the site root

### Requirement: Office page includes site navigation
The Office page SHALL display the site header so the visitor can return to the chatbot.

#### Scenario: Returning to the chat
- **WHEN** a visitor is on the Office page and clicks the Chat link
- **THEN** the chatbot page is shown

#### Scenario: Current page indication
- **WHEN** a visitor is on the Office page
- **THEN** the Office link is visually marked as the active page
