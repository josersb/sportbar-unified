#!/usr/bin/env node
/**
 * migrate-dispositivos-hierarchy.js
 *
 * Migration script: reorganize wiki/Dispositivos/ from flat files to
 * Fabricante → Categoría hierarchy.
 *
 * 4 phases + verification:
 *   1. Create directory structure (7 fabricantes, 10 categorías)
 *   2. Merge Decodificadores.md + DirecTV-Decos.md → DirecTV/Decodificadores/
 *   3. Move 7 files + rewrite wikilinks (internal depth correction)
 *   4. Placeholders idempotentes + index.md + AGENTS.md + log.md
 *
 * Idempotent — safe to re-run. Pre-flight checks git status --porcelain wiki/.
 *
 * Usage: node scripts/migrate-dispositivos-hierarchy.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIKI_DIR = path.join(process.cwd(), 'wiki');
const DISPOSITIVOS_DIR = path.join(WIKI_DIR, 'Dispositivos');
const CONCEPTOS_DIR = path.join(WIKI_DIR, 'Conceptos');

/**
 * PATH_MAP — maps old device filenames (without .md) to new hierarchical paths
 * relative to wiki/Dispositivos/.
 *
 * null entries are handled specially:
 *   DirecTV-Decos → merged into the Decodificadores file
 *   ZonasAudio    → cross-type move to wiki/Conceptos/
 */
const PATH_MAP = {
  'Decodificadores':   'DirecTV/Decodificadores/Decodificadores',
  'DirecTV-Decos':     null, // merged — redirect to DirecTV/Decodificadores/Decodificadores
  'IPEX5001-Encoder':  'Liberty/Distribucion/IPEX5001-Encoder',
  'IPEX5002-Decoder':  'Liberty/Distribucion/IPEX5002-Decoder',
  'Arranger-IPEXCB':   'Liberty/Controladores/Arranger-IPEXCB',
  'AHM-32':            'Allen-Heath/Procesadores/AHM-32',
  'SQ6':               'Allen-Heath/Mezcladoras/SQ6',
  'Shure-ANI':         'Shure/Audio/ANI',
  'MagicInfo':         'Samsung/Software/MagicInfo',
  'ZonasAudio':        null, // cross-type → wiki/Conceptos/
};

/**
 * Map of null-entry redirects: where a wikilink to a null-mapped device
 * should point instead.
 */
const NULL_REDIRECTS = {
  'DirecTV-Decos': 'Dispositivos/DirecTV/Decodificadores/Decodificadores',
  'ZonasAudio':    'Conceptos/ZonasAudio',
};

/**
 * Directory tree: 7 fabricantes × 10 categorías under wiki/Dispositivos/
 */
const DIR_TREE = [
  'DirecTV/Decodificadores',
  'Samsung/Televisores',
  'Samsung/Software',
  'Allen-Heath/Procesadores',
  'Allen-Heath/Mezcladoras',
  'Liberty/Distribucion',
  'Liberty/Controladores',
  'Shure/Audio',
  'dbx/Procesadores',
  'Kramer/Distribucion',
];

/**
 * Files to migrate: { oldName, newHierarchicalPath }.
 * oldName includes .md extension.
 */
const FILES_TO_MOVE = [
  { old: 'IPEX5001-Encoder.md', new: 'Liberty/Distribucion/IPEX5001-Encoder.md' },
  { old: 'IPEX5002-Decoder.md', new: 'Liberty/Distribucion/IPEX5002-Decoder.md' },
  { old: 'Arranger-IPEXCB.md',  new: 'Liberty/Controladores/Arranger-IPEXCB.md' },
  { old: 'AHM-32.md',           new: 'Allen-Heath/Procesadores/AHM-32.md' },
  { old: 'SQ6.md',              new: 'Allen-Heath/Mezcladoras/SQ6.md' },
  { old: 'Shure-ANI.md',        new: 'Shure/Audio/ANI.md' },
  { old: 'MagicInfo.md',        new: 'Samsung/Software/MagicInfo.md' },
];

/** Cross-type move: file moves outside Dispositivos/ */
const CROSS_TYPE_MOVE = {
  old: 'ZonasAudio.md',
  new: path.join(CONCEPTOS_DIR, 'ZonasAudio.md'),
};

/**
 * Placeholders to create (idempotent — skip if > 30 bytes).
 * { subdir, filename, displayName }
 */
const PLACEHOLDERS = [
  { subdir: 'Samsung/Televisores', filename: 'DBE-DME-DHE.md',  displayName: 'DBE-DME-DHE' },
  { subdir: 'dbx/Procesadores',    filename: 'ZonePRO-1260.md',  displayName: 'ZonePRO-1260' },
  { subdir: 'Kramer/Distribucion', filename: 'VM-8H.md',         displayName: 'VM-8H' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

function warn(msg) {
  console.warn(`[migrate] ⚠  ${msg}`);
}

function err(msg) {
  console.error(`[migrate] ✖ ${msg}`);
}

/** Recursive mkdir -p */
function mkdirp(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** Read file as UTF-8, return null if missing */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** Write file as UTF-8 */
function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

/** Delete file if it exists */
function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore if already gone
  }
}

/** Count leading directory components in a relative path (number of `/` + 1) */
function depthFromRoot(relPath) {
  if (!relPath || relPath === '.') return 0;
  return relPath.split('/').length;
}

// ---------------------------------------------------------------------------
// Wikilink Rewrite Engine
// ---------------------------------------------------------------------------

/**
 * Rewrite all [[wikilinks]] in `content` for a file being moved.
 *
 * @param {string} content        — file content
 * @param {number} oldDepth       — old depth from wiki root (2 for wiki/Dispositivos/)
 * @param {number} newDepth       — new depth from wiki root (4 for wiki/Dispositivos/Fab/Cat/)
 * @returns {string} content with wikilinks rewritten
 */
function rewriteWikilinks(content, oldDepth, newDepth) {
  // Match [[target]] or [[target|alias]] — handles multiline links
  return content.replace(/\[\[([^\[\]]+)\]\]/g, (match, inner) => {
    const pipeIdx = inner.indexOf('|');
    let target, alias;
    if (pipeIdx === -1) {
      target = inner.trim();
      alias = null;
    } else {
      target = inner.slice(0, pipeIdx).trim();
      alias = inner.slice(pipeIdx + 1).trim();
    }

    // Count leading ../ groups in the wikilink
    let upCount = 0;
    let rest = target;
    while (rest.startsWith('../')) {
      upCount++;
      rest = rest.slice(3);
    }

    // Resolve the target to an absolute path from wiki root.
    //
    // Old file location is at `oldDepth` from wiki root.
    // The wikilink with `upCount` ../ groups from there gives us:
    //   wiki/ + '../'.repeat(oldDepth - upCount) + rest
    // Simplified: the absolute path = resolvedDepth levels from wiki/,
    // where resolvedDepth = oldDepth - upCount.
    //
    // We compute resolvedDepth, then apply PATH_MAP to the rest segments.
    const resolvedDepth = oldDepth - upCount;

    // Split the rest into segments and apply PATH_MAP
    const segments = rest.split('/').filter(Boolean);
    const mappedSegments = segments.map((seg) => {
      if (PATH_MAP[seg] !== undefined) {
        if (PATH_MAP[seg] === null) {
          // null entry: lookup in NULL_REDIRECTS
          const redirect = NULL_REDIRECTS[seg];
          if (redirect) {
            return redirect;
          }
          // no redirect — leave as-is but warn
          warn(`No redirect for null-mapped device "${seg}" — link may break`);
          return seg;
        }
        return PATH_MAP[seg];
      }
      return seg;
    });
    const mappedRest = mappedSegments.join('/');

    // Build new relative path from new file depth
    // From file at newDepth to wiki root: "../".repeat(newDepth - 1)
    // Then the mapped rest
    const prefix = '../'.repeat(newDepth - 1 + resolvedDepth);
    const aliasStr = alias ? `|${alias}` : '';

    return `[[${prefix}${mappedRest}${aliasStr}]]`;
  });
}

// ---------------------------------------------------------------------------
// Phase 1: Create directory structure
// ---------------------------------------------------------------------------

function phase1CreateDirs() {
  log('Phase 1: Creating directory structure…');

  DIR_TREE.forEach((relDir) => {
    const absDir = path.join(DISPOSITIVOS_DIR, relDir);
    if (!fs.existsSync(absDir)) {
      mkdirp(absDir);
      log(`  Created: ${relDir}/`);
    } else {
      log(`  Exists:  ${relDir}/`);
    }
  });

  // Also ensure Conceptos/ exists for cross-type move
  mkdirp(CONCEPTOS_DIR);
}

// ---------------------------------------------------------------------------
// Phase 2: Merge Decodificadores + DirecTV-Decos
// ---------------------------------------------------------------------------

/**
 * Parse a markdown file into sections keyed by heading (## or lower).
 * Returns { sections: { heading: contentBlock }, preamble: string }
 */
function parseSections(fileContent) {
  const lines = fileContent.split('\n');
  const result = { sections: {}, preamble: '' };
  let currentHeading = null;
  let currentLines = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      // Save previous section
      if (currentHeading !== null) {
        result.sections[currentHeading] = currentLines.join('\n');
      } else if (currentLines.length > 0) {
        result.preamble = currentLines.join('\n');
      }
      currentHeading = line;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  // Save last section / final preamble
  if (currentHeading !== null) {
    result.sections[currentHeading] = currentLines.join('\n');
  } else if (currentLines.length > 0) {
    result.preamble = currentLines.join('\n');
  }

  return result;
}

/**
 * Merge two section maps, keeping the longer version of overlapping headings.
 */
function mergeSections(sectionsA, sectionsB) {
  const merged = { ...sectionsA };

  for (const [heading, content] of Object.entries(sectionsB)) {
    if (merged[heading] === undefined) {
      merged[heading] = content;
    } else if (content.length > merged[heading].length) {
      merged[heading] = content;
    }
    // else keep A's version (longer or equal)
  }

  return merged;
}

/** Merge preamble (content before first heading), picking the longer one */
function mergePreamble(preambleA, preambleB) {
  const trimmedA = (preambleA || '').trim();
  const trimmedB = (preambleB || '').trim();
  if (!trimmedA && !trimmedB) return '';
  if (trimmedA.length >= trimmedB.length) return trimmedA;
  return trimmedB;
}

function phase2MergeDecoders() {
  log('Phase 2: Merging decodificadores…');

  const fileA = path.join(DISPOSITIVOS_DIR, 'Decodificadores.md');
  const fileB = path.join(DISPOSITIVOS_DIR, 'DirecTV-Decos.md');

  const destDir = path.join(DISPOSITIVOS_DIR, 'DirecTV', 'Decodificadores');
  const destFile = path.join(destDir, 'Decodificadores.md');

  // Check if merged file already exists (idempotency)
  if (fs.existsSync(destFile)) {
    log('  Merged file already exists — skipping Phase 2');
    return;
  }

  const contentA = readFile(fileA);
  const contentB = readFile(fileB);

  if (!contentA && !contentB) {
    warn('  Both decoder files missing — nothing to merge');
    return;
  }

  const parsedA = contentA ? parseSections(contentA) : { sections: {}, preamble: '' };
  const parsedB = contentB ? parseSections(contentB) : { sections: {}, preamble: '' };

  // Merge sections (heading-level dedup)
  const mergedSections = mergeSections(parsedA.sections, parsedB.sections);
  const mergedPreamble = mergePreamble(parsedA.preamble, parsedB.preamble);

  // Assemble merged content: preamble is the title + intro (actually both have # Title)
  // We take the first # heading from either file, then merged preamble sections
  let mergedContent = '# Decodificadores\n\n';
  mergedContent += '> Fusión de las páginas `Decodificadores.md` y `DirecTV-Decos.md`.\n';
  mergedContent += '> Contenido único de ambos archivos preservado.\n\n';

  if (mergedPreamble) {
    mergedContent += mergedPreamble + '\n\n';
  }

  // Order sections alphabetically for deterministic output
  const sortedHeadings = Object.keys(mergedSections).sort();
  for (const heading of sortedHeadings) {
    mergedContent += mergedSections[heading] + '\n\n';
  }

  // Write merged file
  mkdirp(destDir);
  writeFile(destFile, mergedContent.trim() + '\n');
  log(`  Created: Dispositivos/DirecTV/Decodificadores/Decodificadores.md`);

  // Delete originals
  deleteFile(fileA);
  deleteFile(fileB);
  log('  Deleted originals: Decodificadores.md, DirecTV-Decos.md');
}

// ---------------------------------------------------------------------------
// Phase 3: Move files + rewrite wikilinks
// ---------------------------------------------------------------------------

function phase3MoveFiles() {
  log('Phase 3: Moving files and rewriting wikilinks…');

  // Old depth for files in wiki/Dispositivos/ = 2 (wiki/ + Dispositivos/)
  const OLD_DEPTH = 2;

  // --- Standard moves ---
  FILES_TO_MOVE.forEach(({ old: oldName, new: newRelPath }) => {
    const src = path.join(DISPOSITIVOS_DIR, oldName);
    const dest = path.join(DISPOSITIVOS_DIR, newRelPath);

    if (!fs.existsSync(src)) {
      warn(`  Source not found: ${oldName} — skipping`);
      return;
    }

    if (fs.existsSync(dest)) {
      log(`  Already exists: ${newRelPath} — skipping`);
      deleteFile(src); // clean up source if dest exists
      return;
    }

    // Calculate new depth for file at Dispositivos/Fab/Cat/Name.md
    // newRelPath example: "Liberty/Distribucion/IPEX5001-Encoder.md"
    // Depth from wiki root = 2 (wiki/Dispositivos/) + segments in newRelPath - 1 (filename)
    const newDir = path.dirname(newRelPath); // e.g. "Liberty/Distribucion"
    const newDepth = OLD_DEPTH + depthFromRoot(newDir);

    let content = readFile(src);
    if (content === null) {
      warn(`  Cannot read: ${oldName}`);
      return;
    }

    // Backup original content before rewrite
    const originalContent = content;

    // Rewrite wikilinks
    content = rewriteWikilinks(content, OLD_DEPTH, newDepth);

    // Write to destination
    writeFile(dest, content);
    log(`  Moved: ${oldName} → ${newRelPath}`);

    // Report if wikilinks changed
    if (content !== originalContent) {
      log(`    └─ wikilinks rewritten`);
    }

    // Delete original
    deleteFile(src);
    log(`    └─ original deleted`);
  });

  // --- Cross-type move: ZonasAudio → Conceptos/ ---
  const srcCross = path.join(DISPOSITIVOS_DIR, CROSS_TYPE_MOVE.old);
  const destCross = CROSS_TYPE_MOVE.new;

  if (fs.existsSync(srcCross)) {
    if (!fs.existsSync(destCross)) {
      // New depth for Conceptos/ZonasAudio.md = 2 (wiki/Conceptos/)
      const newDepth = 2;

      let content = readFile(srcCross);
      if (content !== null) {
        const originalContent = content;
        content = rewriteWikilinks(content, OLD_DEPTH, newDepth);
        writeFile(destCross, content);
        log(`  Moved (cross-type): ZonasAudio.md → Conceptos/ZonasAudio.md`);
        if (content !== originalContent) {
          log(`    └─ wikilinks rewritten`);
        }
      }
    } else {
      log(`  Already exists: Conceptos/ZonasAudio.md — skipping`);
    }
    deleteFile(srcCross);
    log(`    └─ original ZonasAudio.md deleted`);
  } else {
    warn('  Source ZonasAudio.md not found — skipping cross-type move');
  }
}

// ---------------------------------------------------------------------------
// Phase 4: Placeholders + index.md + AGENTS.md + log.md
// ---------------------------------------------------------------------------

function phase4Placeholders() {
  log('Phase 4a: Creating placeholders…');

  PLACEHOLDERS.forEach(({ subdir, filename, displayName }) => {
    const filePath = path.join(DISPOSITIVOS_DIR, subdir, filename);

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 30) {
        log(`  Skipped (has content): ${subdir}/${filename}`);
        return;
      }
      // File exists but is tiny/empty — overwrite
    }

    const content = `# ${displayName}\n\n## Estado\n\nPendiente de documentación.\n`;
    writeFile(filePath, content);
    log(`  Created: ${subdir}/${filename}`);
  });
}

function phase4UpdateIndex() {
  log('Phase 4b: Updating wiki/index.md…');

  const indexPath = path.join(WIKI_DIR, 'index.md');
  let content = readFile(indexPath);
  if (content === null) {
    warn('  index.md not found — skipping');
    return;
  }

  // ---- Rewrite all Dispositivos/* wikilinks in index.md ----
  // index.md is at depth 1 from wiki root (wiki/index.md)
  const INDEX_DEPTH = 1;

  // Match [[Dispositivos/Something]] or [[Dispositivos/Something|alias]]
  content = content.replace(/\[\[Dispositivos\/([^\]|]+)(\|[^\]]+)?\]\]/g, (match, target, aliasStr) => {
    const deviceName = target.trim(); // e.g. "Decodificadores", "IPEX5001-Encoder"
    const alias = aliasStr || '';

    // Look up in PATH_MAP
    if (PATH_MAP[deviceName] !== undefined) {
      if (PATH_MAP[deviceName] === null) {
        // Null entry: use NULL_REDIRECTS or remove
        const redirect = NULL_REDIRECTS[deviceName];
        if (redirect) {
          return `[[${redirect}${alias}]]`;
        }
        warn(`  No redirect for null-mapped "${deviceName}" in index.md — removing link`);
        return '';
      }
      return `[[Dispositivos/${PATH_MAP[deviceName]}${alias}]]`;
    }

    // Not in PATH_MAP — leave unchanged
    return match;
  });

  // ---- Restructure "## Dispositivos Hardware" section ----
  // Find the section and replace it with hierarchical index.
  const dispositivosSectionRegex = /(## Dispositivos Hardware\r?\n\r?\n)([\s\S]*?)(?=\r?\n## )/;

  const hierarchicalIndex = `### DirecTV

- [[Dispositivos/DirecTV/Decodificadores/Decodificadores]] — catálogo de 8 fuentes de video: 6 DirecTV + 2 encoders IPEX5001

### Liberty

- [[Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]] — transmisor HDMI sobre IP, JPEG2000, PoE
- [[Dispositivos/Liberty/Distribucion/IPEX5002-Decoder]] — receptor HDMI sobre IP, video wall 16×16
- [[Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — controlador central IPEXCB, API HTTP + TCP

### Allen-Heath

- [[Dispositivos/Allen-Heath/Procesadores/AHM-32]] — matriz de audio Allen & Heath 32×32 (TCP, sin integrar)
- [[Dispositivos/Allen-Heath/Mezcladoras/SQ6]] — consola de mezcla Allen & Heath para eventos en vivo

### Shure

- [[Dispositivos/Shure/Audio/ANI]] — interfaces de audio en red (ANI22/ANI4OUT)

### Samsung

- [[Dispositivos/Samsung/Software/MagicInfo]] — cartelería digital Samsung (25+ TVs, sin integrar)

### dbx

- [[Dispositivos/dbx/Procesadores/ZonePRO-1260]] — procesador de audio (documentación pendiente)

### Kramer

- [[Dispositivos/Kramer/Distribucion/VM-8H]] — distribuidor de video (documentación pendiente)
`;

  content = content.replace(dispositivosSectionRegex, (match, header, oldSection) => {
    return header + hierarchicalIndex;
  });

  // ---- Update the "Referencias de API" section ----
  // Replace [[Dispositivos/Arranger-IPEXCB]] with hierarchical path
  content = content.replace(
    /\[\[Dispositivos\/Arranger-IPEXCB\]\]/g,
    '[[Dispositivos/Liberty/Controladores/Arranger-IPEXCB]]'
  );

  writeFile(indexPath, content);
  log('  Updated: index.md — wikilinks rewritten + hierarchical index');
}

function phase4UpdateAgentsMD() {
  log('Phase 4c: Updating AGENTS.md…');

  const agentsPath = path.join(process.cwd(), 'AGENTS.md');
  let content = readFile(agentsPath);
  if (content === null) {
    warn('  AGENTS.md not found — skipping');
    return;
  }

  // ---- 1. Update Naming Convention for Dispositivos ----
  // Old: | Dispositivo Hardware | ... | `Dispositivos/Nombre.md` | ...
  // New: | Dispositivo Hardware | ... | `Dispositivos/{Fabricante}/{Categoria}/Dispositivo.md` | ...
  const namingRegex = /(\| Dispositivo Hardware \|.*\| )`Dispositivos\/Nombre\.md`( \|.*\|)/;
  content = content.replace(namingRegex, (match, before, after) => {
    return `${before}\`Dispositivos/{Fabricante}/{Categoria}/Dispositivo.md\`${after}`;
  });

  // ---- 2. Update device examples ----
  // Old: | `Dispositivos/DTV1.md` |
  // This seems not to exist literally. Instead update the example column:
  // "| Dispositivo Hardware | Equipo físico conectado a la matriz | `Dispositivos/Nombre.md` | `Dispositivos/DTV1.md` |"
  const exampleRegex = /`Dispositivos\/DTV1\.md`/;
  content = content.replace(exampleRegex, '`Dispositivos/DirecTV/Decodificadores/Decodificadores.md`');

  // ---- 3. Add hierarchical linking convention to Link Conventions ----
  const linkConventionsSection = '### Link Conventions';
  const hierarchicalLinkRule = `- **Dispositivos jerárquicos**: \`[[Dispositivos/{Fabricante}/{Categoria}/Dispositivo]]\` para dispositivos en la nueva estructura. Ej: \`[[Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]]\`.\n`;

  if (content.includes(hierarchicalLinkRule.trim())) {
    log('  AGENTS.md already has hierarchical link rule — skipping');
  } else {
    // Insert after the "No usar Markdown links" rule, before "Ingest Triggers"
    content = content.replace(
      /- \*\*No usar paths absolutos\*\*/,
      `${hierarchicalLinkRule}- **No usar paths absolutos**`
    );
  }

  // ---- 4. Add hierarchy to cross-linking expectations ----
  const crossLinkDeviceLine = `  - Dispositivo → vinculado desde la API que lo gestiona y desde los Componentes que lo usan`;
  const hierarchyAddition = `  - Dispositivo jerárquico → mismo que Dispositivo plano, más los placeholders de su misma categoría.`;

  if (content.includes(hierarchyAddition.trim())) {
    log('  AGENTS.md already has hierarchy cross-link note — skipping');
  } else {
    content = content.replace(crossLinkDeviceLine, crossLinkDeviceLine + '\n' + hierarchyAddition);
  }

  writeFile(agentsPath, content);
  log('  Updated: AGENTS.md — naming convention, examples, link conventions');
}

function phase4UpdateLogMD() {
  log('Phase 4d: Updating wiki/log.md…');

  const logPath = path.join(WIKI_DIR, 'log.md');
  let content = readFile(logPath);
  if (content === null) {
    warn('  log.md not found — skipping');
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  // Check if entry already exists (idempotency)
  const entryMarker = `## [${today}] migration | Jerarquía Fabricante → Categoría`;
  if (content.includes(entryMarker)) {
    log('  log.md entry already exists — skipping');
    return;
  }

  const placeholdersStr = PLACEHOLDERS.map(p => `${p.subdir}/${p.filename}`).join(', ');
  const movedFiles = FILES_TO_MOVE.map(f => f.old).join(', ');

  const logEntry = `\n---\n\n## [${today}] migration | Jerarquía Fabricante → Categoría\n\n` +
    `**Operación**: Migración de \`wiki/Dispositivos/\` de estructura plana a jerarquía Fabricante → Categoría.\n\n` +
    `**Cambios**:\n` +
    `- Creadas ${DIR_TREE.length} carpetas (${new Set(DIR_TREE.map(d => d.split('/')[0])).size} fabricantes)\n` +
    `- Fusionados \`Decodificadores.md\` + \`DirecTV-Decos.md\` → \`DirecTV/Decodificadores/Decodificadores.md\`\n` +
    `- Migrados 7 archivos a paths jerárquicos con wikilinks reescritos: ${movedFiles}\n` +
    `- Migrado \`ZonasAudio.md\` → \`Conceptos/ZonasAudio.md\` (cross-type)\n` +
    `- Creados 3 placeholders: ${placeholdersStr}\n` +
    `- Actualizados \`index.md\`, \`AGENTS.md\`, y este archivo\n\n` +
    `**Archivos**: scripts/migrate-dispositivos-hierarchy.js, wiki/ (${DIR_TREE.length + 1} dirs, 8 movidos, 3 placeholders, 2 eliminados)\n` +
    `**Script**: \`scripts/migrate-dispositivos-hierarchy.js\`\n`;

  content += logEntry;
  writeFile(logPath, content);
  log('  Updated: log.md — migration entry added');
}

// ---------------------------------------------------------------------------
// Post-flight verification
// ---------------------------------------------------------------------------

function postFlightVerify() {
  log('Post-flight: Running verification…');
  let allOk = true;

  // 1. No flat wikilinks [[Dispositivos/{Name}]] where {Name} doesn't contain /
  //    We check for [[Dispositivos/Name]] where Name has no subfolder
  const flatLinkRegex = /\[\[Dispositivos\/([A-Z][^\]\/|]+)\]\]/g;
  let foundFlat = 0;

  function scanDir(dirPath, relPath) {
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, relPath ? `${relPath}/${entry.name}` : entry.name);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = readFile(fullPath);
        if (content === null) continue;
        let match;
        while ((match = flatLinkRegex.exec(content)) !== null) {
          warn(`  Flat wikilink found in ${relPath ? relPath + '/' : ''}${entry.name}: [[Dispositivos/${match[1]}]]`);
          foundFlat++;
          allOk = false;
        }
      }
    }
  }

  // Only scan if wiki/Dispositivos/ has been migrated (check for any subdirectory)
  const hasSubdirs = DIR_TREE.some(d => fs.existsSync(path.join(DISPOSITIVOS_DIR, d.split('/')[0])));
  if (hasSubdirs) {
    scanDir(DISPOSITIVOS_DIR, 'Dispositivos');
  } else {
    log('  Skipping flat wikilink scan — migration not yet executed');
  }

  log(foundFlat === 0
    ? '  ✓ Zero flat wikilinks detected'
    : `  ✖ ${foundFlat} flat wikilink(s) found`);

  // 2. No .md files directly in wiki/Dispositivos/ root
  let rootMDFiles = 0;
  if (fs.existsSync(DISPOSITIVOS_DIR)) {
    const entries = fs.readdirSync(DISPOSITIVOS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        warn(`  Residual .md in Dispositivos/ root: ${entry.name}`);
        rootMDFiles++;
        allOk = false;
      }
    }
  }
  log(rootMDFiles === 0
    ? '  ✓ No residual .md files in Dispositivos/ root'
    : `  ✖ ${rootMDFiles} residual .md file(s) found`);

  // 3. Placeholders exist and have content > 20 bytes
  let placeholderOk = 0;
  let placeholderFail = 0;
  PLACEHOLDERS.forEach(({ subdir, filename }) => {
    const filePath = path.join(DISPOSITIVOS_DIR, subdir, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 20) {
        placeholderOk++;
      } else {
        warn(`  Placeholder too small: ${subdir}/${filename} (${stats.size} bytes)`);
        placeholderFail++;
        allOk = false;
      }
    } else {
      warn(`  Placeholder missing: ${subdir}/${filename}`);
      placeholderFail++;
      allOk = false;
    }
  });
  log(placeholderOk > 0
    ? `  ✓ ${placeholderOk}/${PLACEHOLDERS.length} placeholders OK`
    : '  ✖ No placeholders verified');
  if (placeholderFail > 0) {
    log(`  ✖ ${placeholderFail} placeholder(s) failed`);
  }

  // 4. AGENTS.md contains hierarchical convention
  const agentsPath = path.join(process.cwd(), 'AGENTS.md');
  const agentsContent = readFile(agentsPath);
  const hasHierarchicalConvention = agentsContent &&
    agentsContent.includes('{Fabricante}/{Categoria}/Dispositivo.md');
  log(hasHierarchicalConvention
    ? '  ✓ AGENTS.md has hierarchical naming convention'
    : '  ✖ AGENTS.md missing hierarchical naming convention');

  // 5. log.md has the migration entry
  const logPathForCheck = path.join(WIKI_DIR, 'log.md');
  const logContent = readFile(logPathForCheck);
  const hasLogEntry = logContent && logContent.includes('Jerarquía Fabricante');
  log(hasLogEntry
    ? '  ✓ log.md has migration entry'
    : '  ✖ log.md missing migration entry (may be pending Phase 4)');

  log(allOk ? '✓ All checks passed' : '✖ Some checks failed — see warnings above');
  return allOk;
}

// ---------------------------------------------------------------------------
// Pre-flight check
// ---------------------------------------------------------------------------

function preFlightCheck() {
  log('Pre-flight: Checking git status for wiki/…');

  const { execSync } = require('child_process');
  try {
    const output = execSync('git status --porcelain wiki/', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (output.length > 0) {
      err(`wiki/ is not clean — aborting. Uncommitted changes detected:`);
      console.error(output);
      return false;
    }
  } catch (e) {
    // git command failed — non-git repo or git not available
    warn(`Cannot check git status (${e.message}) — continuing anyway`);
    return true;
  }

  log('  ✓ wiki/ is clean');
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  log('='.repeat(60));
  log('Dispositivos Hierarchy Migration');
  log('='.repeat(60));
  console.log('');

  // Pre-flight
  // Only run pre-flight if --no-preflight isn't passed
  const skipPreflight = process.argv.includes('--no-preflight');
  if (!skipPreflight && !preFlightCheck()) {
    process.exit(1);
  }

  // Executor gate: if --check-only, only verify without migrating
  const checkOnly = process.argv.includes('--check-only');

  if (!checkOnly) {
    phase1CreateDirs();

    console.log('');
    phase2MergeDecoders();

    console.log('');
    phase3MoveFiles();

    console.log('');
    phase4Placeholders();
    phase4UpdateIndex();
    phase4UpdateAgentsMD();
    phase4UpdateLogMD();

    console.log('');
  } else {
    log('--check-only mode: skipping migration phases');
    console.log('');
  }

  postFlightVerify();

  console.log('');
  log('='.repeat(60));
  log(checkOnly ? 'Check complete.' : 'Migration complete.');
  log('='.repeat(60));
}

main();
