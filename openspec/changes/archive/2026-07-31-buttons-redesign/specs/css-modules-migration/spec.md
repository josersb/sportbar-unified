# Delta for css-modules-migration

## ADDED Requirements

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

### Edge Cases

- **Canales.jsx direct usage**: Line 91 uses `className="CanalFavorito"` directly (not via `CanalFavorito` component). Both consumers (`CanalFavorito.jsx` line 6 AND `Canales.jsx` line 91) MUST be updated.
- **Import path**: `Canales.jsx` is at `src/componentes/Canales.jsx`, so its module import path is `../elementos/CanalFavorito.module.css`.
- **Image and h3 selectors**: `.CanalFavorito img` and `.CanalFavorito h3` nested selectors MUST be migrated using CSS Modules nesting or separate class names.
