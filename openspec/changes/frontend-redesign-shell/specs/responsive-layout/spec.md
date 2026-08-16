# Delta for responsive-layout

## MODIFIED Requirements

### Requirement: Collapsible Aside

The sidebar (`Aside`) MUST collapse when viewport width is below 768px, using `min-width` breakpoints (mobile-first). A toggle button MUST be visible. Aside sub-components MUST use container queries for internal responsive behavior instead of viewport media queries.

(Previously: Used `max-width` media queries. Sub-components had no container query support.)

#### Scenario: Aside collapses on narrow viewport

- GIVEN the viewport width is less than 768px
- WHEN any page renders
- THEN the aside is hidden or collapsed by default
- AND a toggle button is visible

#### Scenario: Toggle expands aside

- GIVEN the viewport is below 768px and the aside is collapsed
- WHEN the user clicks the toggle button
- THEN the aside expands to show navigation links
- AND clicking the toggle again collapses the aside

#### Scenario: Aside visible on desktop

- GIVEN the viewport width is 768px or greater
- WHEN any page renders
- THEN the aside is fully visible

### Requirement: Flexible Forms

All form layouts MUST use `flex-wrap` and relative width units (`%`, `rem`, `fr`). Layouts MUST use `min-width` breakpoints (mobile-first). Fixed `max-width` media queries SHALL NOT be used.

(Previously: Allowed `max-width` media queries alongside flex-wrap.)

#### Scenario: Form reflows on narrow viewport

- GIVEN a form with multiple input fields in a row
- WHEN the viewport width drops below 600px
- THEN fields stack vertically without horizontal overflow

## RENAMED Requirements

(None)

## REMOVED Requirements

(None)
