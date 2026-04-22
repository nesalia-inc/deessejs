# Rules Index

All project rules are defined in this directory.

## Architecture

| Rule | Description |
|------|-------------|
| [NO-USE-CLIENT-AT-ROOT](architecture/NO-USE-CLIENT-AT-ROOT.md) | Layouts/pages ne doivent jamais avoir "use client" |
| [SERVER-FIRST](architecture/SERVER-FIRST.md) | Préférer les Server Components par défaut |
| [CLIENT-BOUNDARY](architecture/CLIENT-BOUNDARY.md) | Props traversant "use client" doivent être sérialisables |
| [FOLDER-DOMAIN-ORGANIZATION](architecture/FOLDER-DOMAIN-ORGANIZATION.md) | Dossiers organisés par domaine |

## Components

| Rule | Description |
|------|-------------|
| [ONE-COMPONENT-PER-FILE](components/ONE-COMPONENT-PER-FILE.md) | Un composant principal par fichier |
| [LOGIC-EXTRACTION](components/LOGIC-EXTRACTION.md) | Logique extraite dans des fichiers .ts séparés |
| [ARROW-FUNCTIONS](components/ARROW-FUNCTIONS.md) | Composants utilisent des arrow functions |
| [MAX-PROPS](components/MAX-PROPS.md) | Maximum 3 props par composant |
| [PROVIDERS-LOCATION](components/PROVIDERS-LOCATION.md) | Providers dans @/components/providers/ |
| [COMPONENTS-FOLDER-TS-FILES](components/COMPONENTS-FOLDER-TS-FILES.md) | Pas de .ts dans components/ (hors index) |
| [PROPS-ONLY-TYPES](components/PROPS-ONLY-TYPES.md) | Types/interfaces仅限于props定义 |

## Code Quality

| Rule | Description |
|------|-------------|
| [IMPORT-ORGANIZATION](code-quality/IMPORT-ORGANIZATION.md) | Imports organisés par groupe et alphabétique |
| [PACKAGE-README](code-quality/PACKAGE-README.md) | Chaque package doit avoir un README.md |

## Enforcement

**IMPORTANT:** Before performing any code review or quality review, you MUST follow these rules.

All rules are checked during code reviews.
