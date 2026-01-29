#!/bin/bash

###############################################################################
# DeesseJS Documentation Migration Script
###############################################################################
# This script reorganizes the docs/ directory structure according to the new
# documentation structure defined in NEW-STRUCTURE.md
#
# Usage:
#   chmod +x docs/migrate.sh
#   ./docs/migrate.sh
#
# Safety features:
#   - Dry run mode (default)
#   - Backup creation
#   - Rollback capability
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$DOCS_DIR/../docs-backup-$(date +%Y%m%d-%H%M%S)"
DRY_RUN=true
VERBOSE=false

###############################################################################
# Functions
###############################################################################

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log() {
    if [ "$VERBOSE" = true ]; then
        echo "  $1"
    fi
}

# Create backup
create_backup() {
    print_header "Creating Backup"
    print_info "Backup location: $BACKUP_DIR"

    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would create backup at $BACKUP_DIR"
        return
    fi

    mkdir -p "$BACKUP_DIR"
    cp -r "$DOCS_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
    print_success "Backup created successfully"
}

# Create new directory structure
create_directories() {
    print_header "Creating New Directory Structure"

    local dirs=(
        "01-getting-started"
        "02-core-concepts"
        "03-features/content-management"
        "03-features/admin-dashboard"
        "03-features/visual-editor"
        "03-features/api"
        "03-features/plugins"
        "04-nextjs-integration/app-router"
        "04-nextjs-integration/layouts"
        "04-nextjs-integration/routing-advanced"
        "04-nextjs-integration/data-fetching"
        "04-nextjs-integration/caching"
        "04-nextjs-integration/authentication"
        "04-nextjs-integration/metadata"
        "04-nextjs-integration/error-handling"
        "04-nextjs-integration/advanced"
        "05-enhancements/error-handling"
        "05-enhancements/authentication"
        "05-enhancements/caching"
        "05-enhancements/navigation"
        "05-enhancements/api"
        "05-enhancements/server-actions"
        "06-api-reference"
        "07-guides/deployment"
        "07-guides/testing"
        "07-guides/migration"
        "07-guides/best-practices"
        "08-resources/examples"
        "08-resources/tutorials"
    )

    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would create directories"
        for dir in "${dirs[@]}"; do
            log "mkdir -p $DOCS_DIR/$dir"
        done
        return
    fi

    for dir in "${dirs[@]}"; do
        mkdir -p "$DOCS_DIR/$dir"
        log "Created: $dir"
    done

    print_success "Created ${#dirs[@]} directories"
}

# Move file
move_file() {
    local source="$1"
    local target="$2"

    if [ ! -f "$source" ]; then
        print_warning "Source file not found: $source"
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        log "mv \"$source\" \"$target\""
        return
    fi

    mv "$source" "$target"
    log "Moved: $(basename "$source")"
}

# Phase 1: Move Getting Started files
phase1_getting_started() {
    print_header "Phase 1: Getting Started"

    move_file "$DOCS_DIR/overview.md" "$DOCS_DIR/01-getting-started/overview.md"
    move_file "$DOCS_DIR/philosophy.md" "$DOCS_DIR/01-getting-started/philosophy.md"

    print_success "Getting Started files moved"
}

# Phase 2: Move Core Concepts files
phase2_core_concepts() {
    print_header "Phase 2: Core Concepts"

    move_file "$DOCS_DIR/technical-architecture.md" "$DOCS_DIR/02-core-concepts/architecture.md"
    move_file "$DOCS_DIR/collections.md" "$DOCS_DIR/02-core-concepts/collections.md"
    move_file "$DOCS_DIR/configuration.md" "$DOCS_DIR/02-core-concepts/configuration.md"
    move_file "$DOCS_DIR/cache-and-reactivity.md" "$DOCS_DIR/02-core-concepts/cache-and-reactivity.md"
    move_file "$DOCS_DIR/native-features.md" "$DOCS_DIR/02-core-concepts/native-features.md"
    move_file "$DOCS_DIR/additional-core-features.md" "$DOCS_DIR/02-core-concepts/additional-features.md"

    print_success "Core Concepts files moved"
}

# Phase 3: Move Features files
phase3_features() {
    print_header "Phase 3: Features"

    # Content Management
    move_file "$DOCS_DIR/content-management.md" "$DOCS_DIR/03-features/content-management/overview.md"

    # Admin Dashboard
    move_file "$DOCS_DIR/admin-dashboard.md" "$DOCS_DIR/03-features/admin-dashboard/overview.md"

    # Visual Editor
    move_file "$DOCS_DIR/visual-page-editor.md" "$DOCS_DIR/03-features/visual-editor/overview.md"

    # API
    move_file "$DOCS_DIR/auto-generated-api.md" "$DOCS_DIR/03-features/api/auto-generated.md"
    move_file "$DOCS_DIR/deessejs-functions.md" "$DOCS_DIR/06-api-reference/functions.md"

    # Plugins
    move_file "$DOCS_DIR/extensions-vs-plugins.md" "$DOCS_DIR/03-features/plugins/extensions-vs-plugins.md"
    move_file "$DOCS_DIR/plugin-examples.md" "$DOCS_DIR/03-features/plugins/plugin-examples.md"

    # Hot Reload
    move_file "$DOCS_DIR/hot-reload.md" "$DOCS_DIR/03-features/hot-reload.md"

    print_success "Features files moved"
}

# Phase 4: Move Next.js Integration files
phase4_nextjs_integration() {
    print_header "Phase 4: Next.js Integration"

    local next_dir="$DOCS_DIR/next"
    if [ ! -d "$next_dir" ]; then
        print_warning "Next.js directory not found, skipping"
        return
    fi

    # App Router
    move_file "$next_dir/route-groups.md" "$DOCS_DIR/04-nextjs-integration/app-router/route-groups.md"
    move_file "$next_dir/parallel-routes-intercepts.md" "$DOCS_DIR/04-nextjs-integration/app-router/parallel-routes.md"
    move_file "$next_dir/parallel-routes-advanced.md" "$DOCS_DIR/04-nextjs-integration/app-router/parallel-routes-advanced.md"
    move_file "$next_dir/generateStaticParams.md" "$DOCS_DIR/04-nextjs-integration/app-router/dynamic-routes.md"

    # Layouts
    move_file "$next_dir/advanced-layouts.md" "$DOCS_DIR/04-nextjs-integration/layouts/layouts.md"
    move_file "$next_dir/templates-state-reset.md" "$DOCS_DIR/04-nextjs-integration/layouts/templates.md"
    move_file "$next_dir/loading-states.md" "$DOCS_DIR/04-nextjs-integration/layouts/loading-states.md"
    move_file "$next_dir/advanced-error-handling.md" "$DOCS_DIR/04-nextjs-integration/layouts/error-handling.md"
    move_file "$next_dir/not-found-handling.md" "$DOCS_DIR/04-nextjs-integration/layouts/not-found.md"

    # Routing Advanced
    move_file "$next_dir/intercepting-routes-advanced.md" "$DOCS_DIR/04-nextjs-integration/routing-advanced/intercepting-routes.md"
    move_file "$next_dir/modals-implementation.md" "$DOCS_DIR/04-nextjs-integration/routing-advanced/modals.md"
    move_file "$next_dir/route-handlers.md" "$DOCS_DIR/04-nextjs-integration/routing-advanced/route-handlers.md"
    move_file "$next_dir/route-handlers-advanced.md" "$DOCS_DIR/04-nextjs-integration/routing-advanced/route-handlers-advanced.md"
    move_file "$next_dir/proxy-integration.md" "$DOCS_DIR/04-nextjs-integration/routing-advanced/middleware.md"

    # Data Fetching
    move_file "$next-dir/suspense-cache-patterns.md" "$DOCS_DIR/04-nextjs-integration/data-fetching/suspense-cache.md"
    move_file "$next_dir/fetch-caching.md" "$DOCS_DIR/04-nextjs-integration/data-fetching/fetch-caching.md"
    move_file "$next_dir/connection-dynamic.md" "$DOCS_DIR/04-nextjs-integration/data-fetching/connection.md"
    move_file "$next_dir/page-typesafety.md" "$DOCS_DIR/04-nextjs-integration/data-fetching/type-safety.md"

    # Caching
    move_file "$next_dir/cache-management.md" "$DOCS_DIR/04-nextjs-integration/caching/cache-management.md"
    move_file "$next_dir/advanced-static-generation.md" "$DOCS_DIR/04-nextjs-integration/caching/incremental-static-regeneration.md"

    # Authentication
    move_file "$next_dir/cookies-sessions.md" "$DOCS_DIR/04-nextjs-integration/authentication/cookies-sessions.md"
    move_file "$next_dir/draft-mode.md" "$DOCS_DIR/04-nextjs-integration/authentication/draft-mode.md"
    move_file "$next_dir/auth-status-pages.md" "$DOCS_DIR/04-nextjs-integration/authentication/auth-pages.md"
    move_file "$next_dir/forbidden-permissions.md" "$DOCS_DIR/04-nextjs-integration/authentication/authorization.md"

    # Metadata
    move_file "$next_dir/generateMetadata.md" "$DOCS_DIR/04-nextjs-integration/metadata/metadata-api.md"
    move_file "$next_dir/generateImageMetadata.md" "$DOCS_DIR/04-nextjs-integration/metadata/metadata-api.md"
    move_file "$next_dir/opengraph-twitter-images.md" "$DOCS_DIR/04-nextjs-integration/metadata/open-graph.md"
    move_file "$next_dir/metadata-icons-manifest.md" "$DOCS_DIR/04-nextjs-integration/metadata/icons-manifest.md"
    move_file "$next_dir/robots-sitemap.md" "$DOCS_DIR/04-nextjs-integration/metadata/robots-sitemap.md"
    move_file "$next_dir/viewport-config.md" "$DOCS_DIR/04-nextjs-integration/metadata/viewport-config.md"

    # Advanced
    move_file "$next_dir/instrumentation.md" "$DOCS_DIR/04-nextjs-integration/advanced/instrumentation.md"
    move_file "$next_dir/route-segment-config.md" "$DOCS_DIR/04-nextjs-integration/advanced/route-segment-config.md"
    move_file "$next_dir/headers-reading.md" "$DOCS_DIR/04-nextjs-integration/advanced/headers.md"
    move_file "$next_dir/mdx-support.md" "$DOCS_DIR/04-nextjs-integration/advanced/mdx.md"
    move_file "$next_dir/after-hooks.md" "$DOCS_DIR/04-nextjs-integration/advanced/after-hooks.md"

    print_success "Next.js Integration files moved"
}

# Phase 5: Move Enhancements files
phase5_enhancements() {
    print_header "Phase 5: Enhancements"

    # Keep README and QUICK-REFERENCE in place
    move_file "$DOCS_DIR/recommendations/error-handling-enhancements.md" "$DOCS_DIR/05-enhancements/error-handling/error-classification.md"
    move_file "$DOCS_DIR/recommendations/error-rethrow-strategies.md" "$DOCS_DIR/05-enhancements/error-handling/error-recovery.md"

    move_file "$DOCS_DIR/recommendations/auth-integration-enhancements.md" "$DOCS_DIR/05-enhancements/authentication/auth-config.md"

    move_file "$DOCS_DIR/recommendations/cache-revalidation-enhancements.md" "$DOCS_DIR/05-enhancements/caching/smart-refresh.md"
    move_file "$DOCS_DIR/recommendations/advanced-caching.md" "$DOCS_DIR/05-enhancements/caching/progressive-caching.md"

    move_file "$DOCS_DIR/recommendations/server-actions-complete.md" "$DOCS_DIR/05-enhancements/navigation/navigation-hooks.md"
    move_file "$DOCS_DIR/recommendations/navigation-search-useragent.md" "$DOCS_DIR/05-enhancements/navigation/search-params.md"

    move_file "$DOCS_DIR/recommendations/redirect-strategies.md" "$DOCS_DIR/05-enhancements/api/redirect-strategies.md"
    move_file "$DOCS_DIR/recommendations/next-response-enhancements.md" "$DOCS_DIR/05-enhancements/api/response-utilities.md"
    move_file "$DOCS_DIR/recommendations/imageresponse-enhancements.md" "$DOCS_DIR/05-enhancements/api/image-generation.md"

    print_success "Enhancements files moved"
}

# Phase 6: Cleanup
phase6_cleanup() {
    print_header "Phase 6: Cleanup"

    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN: Would remove empty directories"
        log "rm -rf $DOCS_DIR/next"
        return
    fi

    # Remove empty next directory if it exists
    if [ -d "$DOCS_DIR/next" ]; then
        rmdir "$DOCS_DIR/next" 2>/dev/null || true
        log "Removed: next/"
    fi

    # Remove recommendations directory if empty
    if [ -d "$DOCS_DIR/recommendations" ]; then
        # Check if it's empty (only contains README and QUICK-REFERENCE which we moved)
        if [ -z "$(ls -A "$DOCS_DIR/recommendations")" ]; then
            rmdir "$DOCS_DIR/recommendations"
            log "Removed: recommendations/"
        fi
    fi

    print_success "Cleanup complete"
}

# Verify migration
verify_migration() {
    print_header "Verification"

    local errors=0

    # Check if all directories exist
    local required_dirs=(
        "01-getting-started"
        "02-core-concepts"
        "03-features"
        "04-nextjs-integration"
        "05-enhancements"
        "06-api-reference"
    )

    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$DOCS_DIR/$dir" ]; then
            print_error "Missing directory: $dir"
            ((errors++))
        fi
    done

    # Check if key files exist
    local key_files=(
        "01-getting-started/overview.md"
        "02-core-concepts/architecture.md"
        "03-features/content-management/overview.md"
        "05-enhancements/README.md"
    )

    for file in "${key_files[@]}"; do
        if [ ! -f "$DOCS_DIR/$file" ]; then
            print_error "Missing file: $file"
            ((errors++))
        fi
    done

    if [ $errors -eq 0 ]; then
        print_success "Verification passed! All files migrated successfully."
        return 0
    else
        print_error "Verification failed with $errors error(s)"
        return 1
    fi
}

# Rollback function
rollback() {
    print_header "Rolling Back"

    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi

    print_info "Restoring from backup..."

    # Remove current docs
    rm -rf "$DOCS_DIR"/*

    # Restore from backup
    cp -r "$BACKUP_DIR"/* "$DOCS_DIR/"

    print_success "Rollback complete"
}

###############################################################################
# Main
###############################################################################

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --execute)
            DRY_RUN=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --rollback)
            rollback
            exit 0
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --execute    Actually perform the migration (default: dry run)"
            echo "  --verbose    Show detailed output"
            echo "  --rollback   Rollback to backup"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Start migration
print_header "DeesseJS Documentation Migration"
echo ""
print_info "Docs directory: $DOCS_DIR"
print_info "Mode: $([ "$DRY_RUN" = true ] && echo "DRY RUN (use --execute to apply)" || echo "EXECUTE")"
echo ""

# Confirm if not dry run
if [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}This will reorganize your documentation directory.${NC}"
    echo -e "${YELLOW}A backup will be created at: $BACKUP_DIR${NC}"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Migration cancelled"
        exit 0
    fi
fi

# Execute phases
create_backup
create_directories
phase1_getting_started
phase2_core_concepts
phase3_features
phase4_nextjs_integration
phase5_enhancements
phase6_cleanup

# Verify
echo ""
verify_migration

# Print summary
echo ""
print_header "Migration Summary"
echo ""
if [ "$DRY_RUN" = true ]; then
    print_warning "This was a DRY RUN"
    echo ""
    echo "To actually perform the migration, run:"
    echo "  $0 --execute"
else
    print_success "Migration completed successfully!"
    echo ""
    echo "Backup location: $BACKUP_DIR"
    echo ""
    echo "To rollback if needed, run:"
    echo "  $0 --rollback"
fi

echo ""
print_info "Next steps:"
echo "  1. Review the new structure"
echo "  2. Update any documentation links"
echo "  3. Test the documentation build"
echo "  4. Commit the changes"
echo ""
