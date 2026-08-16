# css-modules-migration Specification

## Purpose

Migrate all 14 existing plain CSS files to CSS Modules (`.module.css`), one component at a time, with zero visual regressions.

## Requirements

### Requirement: CSS Modules Migration

Each component's styles MUST reside in a co-located `.module.css` file imported via ES modules. Migration MUST be incremental — one component per step.

#### Scenario: Component with CSS Module

- GIVEN a component `FooBar.jsx` with styles in `FooBar.css`
- WHEN migration is applied
- THEN a new file `FooBar.module.css` exists with identical styles
- AND `FooBar.jsx` imports styles via `import styles from './FooBar.module.css'`
- AND classNames use `styles.className` references
- AND the original `FooBar.css` is deleted

#### Scenario: No visual regression

- GIVEN a component has been migrated to CSS Modules
- WHEN the page renders in the browser
- THEN all visual output MUST match the pre-migration state pixel-for-pixel

### Requirement: Global Styles Consolidation

The system MUST consolidate duplicated CSS blocks into a single shared class. The 7 duplicated `.page-container`-style blocks MUST be replaced by one shared definition.

#### Scenario: Shared page container

- GIVEN multiple pages currently define identical or near-identical page container styles
- WHEN consolidation is applied
- THEN a single `.page-container` class exists in a shared location
- AND all pages use that single class
- AND visual output is unchanged

### Requirement: Dead Dependency Removal

`styled-components` MUST be removed from `package.json` since no component uses it.

#### Scenario: styled-components removal

- GIVEN `styled-components` exists in `package.json` dependencies
- WHEN the dependency is removed and `pnpm install` runs
- THEN the app builds and runs without errors
- AND no component references `styled-components`
