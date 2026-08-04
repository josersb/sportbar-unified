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

### Requirement: CanalFavorito CSS Module Migration

The global CSS file `src/elementos/CanalFavorito.css` MUST be migrated to `src/elementos/CanalFavorito.module.css` with identical visual output. All consumers MUST be updated to use CSS Modules imports.

#### Scenario: CanalFavorito.jsx uses module import

- GIVEN the migration is applied
- WHEN `CanalFavorito.jsx` renders
- THEN the component imports `import styles from './CanalFavorito.module.css'`
- AND classNames use `styles.CanalFavorito` references
- AND the original `CanalFavorito.css` file is deleted

#### Scenario: No visual regression

- GIVEN `CanalFavorito.module.css` contains identical style rules to the original
- WHEN the component renders in the browser
- THEN visual output matches the pre-migration state pixel-for-pixel
- AND hover and active states behave identically

### Requirement: Canales.jsx Consumer Migration

The `Canales.jsx` component MUST stop importing the global `CanalFavorito.css` and MUST use the CSS Module import instead for its direct `className="CanalFavorito"` usage.

#### Scenario: Canales.jsx removes global CSS import

- GIVEN `Canales.jsx` currently imports `../elementos/CanalFavorito.css` (line 7)
- WHEN migration is applied
- THEN the global CSS import line is removed
- AND the file imports `import canalStyles from '../elementos/CanalFavorito.module.css'` or equivalent
- AND line 91 `className="CanalFavorito"` becomes `className={canalStyles.CanalFavorito}`

#### Scenario: Channel favorites grid still works

- GIVEN the migration is applied to `Canales.jsx`
- WHEN the Canales page renders channel favorites
- THEN all favorite buttons render with correct styles
- AND hover/active states function identically

### Requirement: Global CSS Audit

After migration, no file outside `CanalFavorito.module.css` MUST reference the `.CanalFavorito` class as a global style.

#### Scenario: Zero global references

- GIVEN migration is complete and `CanalFavorito.css` is deleted
- WHEN searching `src/` for `"CanalFavorito"` in non-module CSS or JSX className strings
- THEN no results exist outside `CanalFavorito.module.css` imports
