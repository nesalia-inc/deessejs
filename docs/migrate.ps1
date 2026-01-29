###############################################################################
# DeesseJS Documentation Migration Script (PowerShell)
###############################################################################
# This script reorganizes the docs/ directory structure according to the new
# documentation structure defined in NEW-STRUCTURE.md
#
# Usage:
#   .\docs\migrate.ps1
#   .\docs\migrate.ps1 -Execute
#
# Safety features:
#   - Dry run mode (default)
#   - Backup creation
#   - Rollback capability
###############################################################################

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$Execute,
    [switch]$Verbose,
    [switch]$Rollback
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Configuration
$DocsDir = $PSScriptRoot
$BackupDir = "$DocsDir\..\docs-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$DryRun = -not $Execute

###############################################################################
# Functions
###############################################################################

function Print-Header {
    param([string]$Text)
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Print-Success {
    param([string]$Text)
    Write-Host "✓ $Text" -ForegroundColor Green
}

function Print-Error {
    param([string]$Text)
    Write-Host "✗ $Text" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Text)
    Write-Host "⚠ $Text" -ForegroundColor Yellow
}

function Print-Info {
    param([string]$Text)
    Write-Host "ℹ $Text" -ForegroundColor Cyan
}

function Log {
    param([string]$Text)
    if ($Verbose) {
        Write-Host "  $Text" -ForegroundColor Gray
    }
}

function Create-Backup {
    Print-Header "Creating Backup"
    Print-Info "Backup location: $BackupDir"

    if ($DryRun) {
        Print-Warning "DRY RUN: Would create backup at $BackupDir"
        return
    }

    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Copy-Item -Path "$DocsDir\*" -Destination $BackupDir -Recurse -Force
    Print-Success "Backup created successfully"
}

function Create-Directories {
    Print-Header "Creating New Directory Structure"

    $directories = @(
        "01-getting-started",
        "02-core-concepts",
        "03-features\content-management",
        "03-features\admin-dashboard",
        "03-features\visual-editor",
        "03-features\api",
        "03-features\plugins",
        "04-nextjs-integration\app-router",
        "04-nextjs-integration\layouts",
        "04-nextjs-integration\routing-advanced",
        "04-nextjs-integration\data-fetching",
        "04-nextjs-integration\caching",
        "04-nextjs-integration\authentication",
        "04-nextjs-integration\metadata",
        "04-nextjs-integration\error-handling",
        "04-nextjs-integration\advanced",
        "05-enhancements\error-handling",
        "05-enhancements\authentication",
        "05-enhancements\caching",
        "05-enhancements\navigation",
        "05-enhancements\api",
        "05-enhancements\server-actions",
        "06-api-reference",
        "07-guides\deployment",
        "07-guides\testing",
        "07-guides\migration",
        "07-guides\best-practices",
        "08-resources\examples",
        "08-resources\tutorials"
    )

    if ($DryRun) {
        Print-Warning "DRY RUN: Would create directories"
        foreach ($dir in $directories) {
            Log "mkdir $DocsDir\$dir"
        }
        return
    }

    foreach ($dir in $directories) {
        $path = Join-Path $DocsDir $dir
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Log "Created: $dir"
    }

    Print-Success "Created $($directories.Count) directories"
}

function Move-FileSafe {
    param(
        [string]$Source,
        [string]$Target
    )

    if (-not (Test-Path $Source)) {
        Print-Warning "Source file not found: $Source"
        return
    }

    if ($DryRun) {
        Log "mv '$Source' '$Target'"
        return
    }

    Move-Item -Path $Source -Destination $Target -Force
    Log "Moved: $(Split-Path $Source -Leaf)"
}

function Phase1-GettingStarted {
    Print-Header "Phase 1: Getting Started"

    Move-FileSafe "$DocsDir\overview.md" "$DocsDir\01-getting-started\overview.md"
    Move-FileSafe "$DocsDir\philosophy.md" "$DocsDir\01-getting-started\philosophy.md"

    Print-Success "Getting Started files moved"
}

function Phase2-CoreConcepts {
    Print-Header "Phase 2: Core Concepts"

    Move-FileSafe "$DocsDir\technical-architecture.md" "$DocsDir\02-core-concepts\architecture.md"
    Move-FileSafe "$DocsDir\collections.md" "$DocsDir\02-core-concepts\collections.md"
    Move-FileSafe "$DocsDir\configuration.md" "$DocsDir\02-core-concepts\configuration.md"
    Move-FileSafe "$DocsDir\cache-and-reactivity.md" "$DocsDir\02-core-concepts\cache-and-reactivity.md"
    Move-FileSafe "$DocsDir\native-features.md" "$DocsDir\02-core-concepts\native-features.md"
    Move-FileSafe "$DocsDir\additional-core-features.md" "$DocsDir\02-core-concepts\additional-features.md"

    Print-Success "Core Concepts files moved"
}

function Phase3-Features {
    Print-Header "Phase 3: Features"

    # Content Management
    Move-FileSafe "$DocsDir\content-management.md" "$DocsDir\03-features\content-management\overview.md"

    # Admin Dashboard
    Move-FileSafe "$DocsDir\admin-dashboard.md" "$DocsDir\03-features\admin-dashboard\overview.md"

    # Visual Editor
    Move-FileSafe "$DocsDir\visual-page-editor.md" "$DocsDir\03-features\visual-editor\overview.md"

    # API
    Move-FileSafe "$DocsDir\auto-generated-api.md" "$DocsDir\03-features\api\auto-generated.md"
    Move-FileSafe "$DocsDir\deessejs-functions.md" "$DocsDir\06-api-reference\functions.md"

    # Plugins
    Move-FileSafe "$DocsDir\extensions-vs-plugins.md" "$DocsDir\03-features\plugins\extensions-vs-plugins.md"
    Move-FileSafe "$DocsDir\plugin-examples.md" "$DocsDir\03-features\plugins\plugin-examples.md"

    # Hot Reload
    Move-FileSafe "$DocsDir\hot-reload.md" "$DocsDir\03-features\hot-reload.md"

    Print-Success "Features files moved"
}

function Phase4-NextJSIntegration {
    Print-Header "Phase 4: Next.js Integration"

    $nextDir = "$DocsDir\next"
    if (-not (Test-Path $nextDir)) {
        Print-Warning "Next.js directory not found, skipping"
        return
    }

    # App Router
    Move-FileSafe "$nextDir\route-groups.md" "$DocsDir\04-nextjs-integration\app-router\route-groups.md"
    Move-FileSafe "$nextDir\parallel-routes-intercepts.md" "$DocsDir\04-nextjs-integration\app-router\parallel-routes.md"
    Move-FileSafe "$nextDir\parallel-routes-advanced.md" "$DocsDir\04-nextjs-integration\app-router\parallel-routes-advanced.md"
    Move-FileSafe "$nextDir\generateStaticParams.md" "$DocsDir\04-nextjs-integration\app-router\dynamic-routes.md"

    # Layouts
    Move-FileSafe "$nextDir\advanced-layouts.md" "$DocsDir\04-nextjs-integration\layouts\layouts.md"
    Move-FileSafe "$nextDir\templates-state-reset.md" "$DocsDir\04-nextjs-integration\layouts\templates.md"
    Move-FileSafe "$nextDir\loading-states.md" "$DocsDir\04-nextjs-integration\layouts\loading-states.md"
    Move-FileSafe "$nextDir\advanced-error-handling.md" "$DocsDir\04-nextjs-integration\layouts\error-handling.md"
    Move-FileSafe "$nextDir\not-found-handling.md" "$DocsDir\04-nextjs-integration\layouts\not-found.md"

    # Routing Advanced
    Move-FileSafe "$nextDir\intercepting-routes-advanced.md" "$DocsDir\04-nextjs-integration\routing-advanced\intercepting-routes.md"
    Move-FileSafe "$nextDir\modals-implementation.md" "$DocsDir\04-nextjs-integration\routing-advanced\modals.md"
    Move-FileSafe "$nextDir\route-handlers.md" "$DocsDir\04-nextjs-integration\routing-advanced\route-handlers.md"
    Move-FileSafe "$nextDir\route-handlers-advanced.md" "$DocsDir\04-nextjs-integration\routing-advanced\route-handlers-advanced.md"
    Move-FileSafe "$nextDir\proxy-integration.md" "$DocsDir\04-nextjs-integration\routing-advanced\middleware.md"

    # Data Fetching
    Move-FileSafe "$nextDir\suspense-cache-patterns.md" "$DocsDir\04-nextjs-integration\data-fetching\suspense-cache.md"
    Move-FileSafe "$nextDir\fetch-caching.md" "$DocsDir\04-nextjs-integration\data-fetching\fetch-caching.md"
    Move-FileSafe "$nextDir\connection-dynamic.md" "$DocsDir\04-nextjs-integration\data-fetching\connection.md"
    Move-FileSafe "$nextDir\page-typesafety.md" "$DocsDir\04-nextjs-integration\data-fetching\type-safety.md"

    # Caching
    Move-FileSafe "$nextDir\cache-management.md" "$DocsDir\04-nextjs-integration\caching\cache-management.md"
    Move-FileSafe "$nextDir\advanced-static-generation.md" "$DocsDir\04-nextjs-integration\caching\incremental-static-regeneration.md"

    # Authentication
    Move-FileSafe "$nextDir\cookies-sessions.md" "$DocsDir\04-nextjs-integration\authentication\cookies-sessions.md"
    Move-FileSafe "$nextDir\draft-mode.md" "$DocsDir\04-nextjs-integration\authentication\draft-mode.md"
    Move-FileSafe "$nextDir\auth-status-pages.md" "$DocsDir\04-nextjs-integration\authentication\auth-pages.md"
    Move-FileSafe "$nextDir\forbidden-permissions.md" "$DocsDir\04-nextjs-integration\authentication\authorization.md"

    # Metadata
    Move-FileSafe "$nextDir\generateMetadata.md" "$DocsDir\04-nextjs-integration\metadata\metadata-api.md"
    Move-FileSafe "$nextDir\generateImageMetadata.md" "$DocsDir\04-nextjs-integration\metadata\metadata-api-image.md"
    Move-FileSafe "$nextDir\opengraph-twitter-images.md" "$DocsDir\04-nextjs-integration\metadata\open-graph.md"
    Move-FileSafe "$nextDir\metadata-icons-manifest.md" "$DocsDir\04-nextjs-integration\metadata\icons-manifest.md"
    Move-FileSafe "$nextDir\robots-sitemap.md" "$DocsDir\04-nextjs-integration\metadata\robots-sitemap.md"
    Move-FileSafe "$nextDir\viewport-config.md" "$DocsDir\04-nextjs-integration\metadata\viewport-config.md"

    # Advanced
    Move-FileSafe "$nextDir\instrumentation.md" "$DocsDir\04-nextjs-integration\advanced\instrumentation.md"
    Move-FileSafe "$nextDir\route-segment-config.md" "$DocsDir\04-nextjs-integration\advanced\route-segment-config.md"
    Move-FileSafe "$nextDir\headers-reading.md" "$DocsDir\04-nextjs-integration\advanced\headers.md"
    Move-FileSafe "$nextDir\mdx-support.md" "$DocsDir\04-nextjs-integration\advanced\mdx.md"
    Move-FileSafe "$nextDir\after-hooks.md" "$DocsDir\04-nextjs-integration\advanced\after-hooks.md"

    Print-Success "Next.js Integration files moved"
}

function Phase5-Enhancements {
    Print-Header "Phase 5: Enhancements"

    # Keep README and QUICK-REFERENCE in place
    Move-FileSafe "$DocsDir\recommendations\error-handling-enhancements.md" "$DocsDir\05-enhancements\error-handling\error-classification.md"
    Move-FileSafe "$DocsDir\recommendations\error-rethrow-strategies.md" "$DocsDir\05-enhancements\error-handling\error-recovery.md"

    Move-FileSafe "$DocsDir\recommendations\auth-integration-enhancements.md" "$DocsDir\05-enhancements\authentication\auth-config.md"

    Move-FileSafe "$DocsDir\recommendations\cache-revalidation-enhancements.md" "$DocsDir\05-enhancements\caching\smart-refresh.md"
    Move-FileSafe "$DocsDir\recommendations\advanced-caching.md" "$DocsDir\05-enhancements\caching\progressive-caching.md"

    Move-FileSafe "$DocsDir\recommendations\server-actions-complete.md" "$DocsDir\05-enhancements\navigation\navigation-hooks.md"
    Move-FileSafe "$DocsDir\recommendations\navigation-search-useragent.md" "$DocsDir\05-enhancements\navigation\search-params.md"

    Move-FileSafe "$DocsDir\recommendations\redirect-strategies.md" "$DocsDir\05-enhancements\api\redirect-strategies.md"
    Move-FileSafe "$DocsDir\recommendations\next-response-enhancements.md" "$DocsDir\05-enhancements\api\response-utilities.md"
    Move-FileSafe "$DocsDir\recommendations\imageresponse-enhancements.md" "$DocsDir\05-enhancements\api\image-generation.md"

    Print-Success "Enhancements files moved"
}

function Phase6-Cleanup {
    Print-Header "Phase 6: Cleanup"

    if ($DryRun) {
        Print-Warning "DRY RUN: Would remove empty directories"
        Log "rm -rf $DocsDir\next"
        return
    }

    # Remove empty next directory if it exists
    $nextDir = "$DocsDir\next"
    if (Test-Path $nextDir) {
        try {
            Remove-Item $nextDir -Recurse -Force
            Log "Removed: next\"
        } catch {
            Print-Warning "Could not remove next directory"
        }
    }

    Print-Success "Cleanup complete"
}

function Test-Migration {
    Print-Header "Verification"

    $errors = 0

    # Check if all directories exist
    $requiredDirs = @(
        "01-getting-started",
        "02-core-concepts",
        "03-features",
        "04-nextjs-integration",
        "05-enhancements",
        "06-api-reference"
    )

    foreach ($dir in $requiredDirs) {
        $path = Join-Path $DocsDir $dir
        if (-not (Test-Path $path)) {
            Print-Error "Missing directory: $dir"
            $errors++
        }
    }

    # Check if key files exist
    $keyFiles = @(
        "01-getting-started\overview.md",
        "02-core-concepts\architecture.md",
        "03-features\content-management\overview.md",
        "05-enhancements\README.md"
    )

    foreach ($file in $keyFiles) {
        $path = Join-Path $DocsDir $file
        if (-not (Test-Path $path)) {
            Print-Error "Missing file: $file"
            $errors++
        }
    }

    if ($errors -eq 0) {
        Print-Success "Verification passed! All files migrated successfully."
        return $true
    } else {
        Print-Error "Verification failed with $errors error(s)"
        return $false
    }
}

function Invoke-Rollback {
    Print-Header "Rolling Back"

    if (-not (Test-Path $BackupDir)) {
        Print-Error "Backup directory not found: $BackupDir"
        exit 1
    }

    Print-Info "Restoring from backup..."

    # Remove current docs (keep backup safe)
    Get-ChildItem $DocsDir -Exclude "migrate.sh","migrate.ps1","NEW-STRUCTURE.md" | Remove-Item -Recurse -Force

    # Restore from backup
    Copy-Item -Path "$BackupDir\*" -Destination $DocsDir -Recurse -Force

    Print-Success "Rollback complete"
}

###############################################################################
# Main
###############################################################################

if ($Rollback) {
    Invoke-Rollback
    exit 0
}

# Start migration
Print-Header "DeesseJS Documentation Migration"
Write-Host ""
Print-Info "Docs directory: $DocsDir"
if ($DryRun) {
    Print-Info "Mode: DRY RUN (use -Execute to apply)"
} else {
    Print-Info "Mode: EXECUTE"
}
Write-Host ""

# Confirm if not dry run
if (-not $DryRun) {
    Write-Host "This will reorganize your documentation directory." -ForegroundColor Yellow
    Write-Host "A backup will be created at: $BackupDir" -ForegroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "Continue? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Print-Info "Migration cancelled"
        exit 0
    }
}

# Execute phases
Create-Backup
Create-Directories
Phase1-GettingStarted
Phase2-CoreConcepts
Phase3-Features
Phase4-NextJSIntegration
Phase5-Enhancements
Phase6-Cleanup

# Verify
Write-Host ""
$success = Test-Migration

# Print summary
Write-Host ""
Print-Header "Migration Summary"
Write-Host ""

if ($DryRun) {
    Print-Warning "This was a DRY RUN"
    Write-Host ""
    Write-Host "To actually perform the migration, run:"
    Write-Host "  .\docs\migrate.ps1 -Execute" -ForegroundColor Green
} else {
    if ($success) {
        Print-Success "Migration completed successfully!"
    } else {
        Print-Error "Migration completed with errors"
    }
    Write-Host ""
    Write-Host "Backup location: $BackupDir"
    Write-Host ""
    Write-Host "To rollback if needed, run:"
    Write-Host "  .\docs\migrate.ps1 -Rollback" -ForegroundColor Green
}

Write-Host ""
Print-Info "Next steps:"
Write-Host "  1. Review the new structure"
Write-Host "  2. Update any documentation links"
Write-Host "  3. Test the documentation build"
Write-Host "  4. Commit the changes"
Write-Host ""
