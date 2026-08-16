# Wiki-Dispositivos Specification

## Purpose

Reorganize `wiki/Dispositivos/` from flat files to Fabricante → Categoría → Dispositivo hierarchy, reflecting the SportBar rack layout.

## Requirements

### Requirement: Directory hierarchy

The system MUST create folders for 7 fabricantes and 9 categorías matching the proposal's target tree under `wiki/Dispositivos/`.

#### Scenario: All directories created

- GIVEN `wiki/Dispositivos/` exists as flat directory
- WHEN migration executes
- THEN 7 fabricante folders exist (DirecTV, Samsung, Allen-Heath, Liberty, Shure, dbx, Kramer)
- AND each contains its corresponding categoría subfolders

#### Scenario: Nested parent creation

- GIVEN `wiki/Dispositivos/dbx/` does not exist
- WHEN creating `dbx/Procesadores/ZonePRO-1260.md`
- THEN `dbx/` and `dbx/Procesadores/` are created before the file is written

### Requirement: File migration

The system MUST move 8 existing `.md` files from `wiki/Dispositivos/` root to their hierarchical paths without content alteration.

#### Scenario: Content-preserving move

- GIVEN `AHM-32.md` exists at `wiki/Dispositivos/AHM-32.md`
- WHEN migration moves it to `wiki/Dispositivos/Allen-Heath/Procesadores/AHM-32.md`
- THEN content is byte-identical to original
- AND the old root file no longer exists

#### Scenario: Rename during migration

- GIVEN `Shure-ANI.md` exists in flat root
- WHEN migration runs
- THEN `Shure/Audio/ANI.md` exists at new path with original content
- AND `Shure-ANI.md` is removed from root

### Requirement: Decoder file merge

The system MUST merge `Decodificadores.md` and `DirecTV-Decos.md` into `DirecTV/Decodificadores/Decodificadores.md`, deduplicating overlapping sections and prioritizing the more detailed version.

#### Scenario: Two files become one

- GIVEN both decoder files exist in `wiki/Dispositivos/`
- WHEN merge executes
- THEN `DirecTV/Decodificadores/Decodificadores.md` contains all unique content
- AND no duplicate headings remain
- AND both originals are deleted

#### Scenario: Conflicting detail levels

- GIVEN DTV1 is described in both files with different detail
- WHEN merge encounters overlap
- THEN the version with more fields is retained
- AND the partial version is discarded

### Requirement: Placeholder files

The system MUST create 3 placeholder files (`DBE-DME-DHE.md`, `ZonePRO-1260.md`, `VM-8H.md`) with minimal structure: `# DeviceName` and `## Estado: Pendiente de documentación`.

#### Scenario: Placeholders created

- GIVEN hierarchy directories exist
- WHEN placeholders are generated
- THEN each file is at its correct tree path with the required structure

#### Scenario: Idempotent regeneration

- GIVEN a placeholder already exists
- WHEN placeholders are regenerated
- THEN existing content is NOT overwritten

### Requirement: Wikilink updates

The system MUST replace all `[[Dispositivos/X]]` wikilinks with `[[Dispositivos/{Fabricante}/{Categoria}/X]]`, preserving any `|alias` display text.

#### Scenario: Flat links converted

- GIVEN `wiki/index.md` contains `[[Dispositivos/AHM-32|AHM-32]]`
- WHEN wikilinks are processed
- THEN it becomes `[[Dispositivos/Allen-Heath/Procesadores/AHM-32|AHM-32]]`

#### Scenario: Cross-domain link

- GIVEN a reference to `[[Dispositivos/ZonasAudio]]`
- WHEN ZonasAudio moves to `wiki/Conceptos/`
- THEN the link updates to `[[Conceptos/ZonasAudio]]`

### Requirement: AGENTS.md schema update

The system MUST update the LLM Wiki Schema naming convention to `Dispositivos/{Fabricante}/{Categoria}/Dispositivo.md` and update existing device examples.

#### Scenario: Schema reflects hierarchy

- GIVEN `AGENTS.md` documents flat Dispositivos paths
- WHEN schema is updated
- THEN naming convention shows `{Fabricante}/{Categoria}/Dispositivo.md`
- AND device examples use hierarchical paths

### Requirement: index.md hierarchical index

The system MUST restructure `wiki/index.md` to group devices by Fabricante > Categoría with updated wikilinks.

#### Scenario: Index reflects hierarchy

- GIVEN migration and link updates complete
- WHEN `index.md` is generated
- THEN Dispositivos section groups entries by fabricante and categoría
- AND all wikilinks target new hierarchical paths

### Requirement: log.md change registration

The system MUST append a dated entry to `wiki/log.md` with migration summary and affected file list.

#### Scenario: Entry recorded

- GIVEN migration is complete
- WHEN change is registered
- THEN log contains today's date, migrated count, merge detail, and placeholder count

### Requirement: Post-migration verification

The system MUST verify zero flat wikilinks remain and zero `.md` files linger in `wiki/Dispositivos/` root.

#### Scenario: Clean verification

- GIVEN migration and link updates complete
- WHEN `grep -r "\[\[Dispositivos/[A-Z]" wiki/` executes
- THEN no matches exist (all links are hierarchical)
- AND no `.md` files remain directly under `wiki/Dispositivos/`

#### Scenario: Residual flat link found

- GIVEN a flat wikilink was missed
- WHEN verification runs
- THEN the residual path is reported
- AND migration MUST be re-run for affected files
