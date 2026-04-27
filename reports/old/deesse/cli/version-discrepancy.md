# CLI Version Discrepancy Investigation

## The Discrepancy

The user sees different output depending on how they invoke the CLI:

| Aspect | `npx @deessejs/cli --help` | Local Build |
|--------|---------------------------|-------------|
| **Version** | `0.6.40` (global) | `0.6.44` (local) |
| **Entry point** | Custom implementation | Uses `@drizzle-team/brocli` |
| **Commands** | `help`, `init`, `db`, `admin` | `db` only (stub) |

## Root Cause

**`npx @deessejs/cli` uses the GLOBAL installation, NOT the local source.**

The global installation is at:
```
C:\Users\dpereira\tools\node\node-v22.22.0-win-x64\node-v22.22.0-win-x64\node_modules\@deessejs\cli
```

Version `0.6.40` is installed globally and takes precedence over the local source code.

## What Happens When Running `npx @deessejs/cli`

1. npx checks for a global `@deessejs/cli` installation
2. Finds `0.6.40` in Node.js installation path
3. Executes `./bin/deesse.js` → `./dist/index.js`
4. The dist/index.js has a **custom CLI implementation** with full commands

## The Local Build (After Our Implementation)

- Uses `@drizzle-team/brocli` as CLI framework
- Only has a `db` command stub that logs "coming soon"
- Is version `0.6.44`
- Located at `packages/cli/` (not published to npm yet)

## To Test the Local Build

```bash
# Run directly from local dist
node packages/cli/bin/deesse.js --help

# Or link locally (one-time setup)
cd packages/cli && npm link
deesse --help
```

## Key Finding: Separate `deesse` Package

There is a **separate package** named `deesse@0.2.11` on npm (Type-safe configuration for DeesseJS). This is a dependency of `@deessejs/cli` but is NOT the CLI itself.

## Conclusion

The global installation (`0.6.40`) has a full implementation with `help`, `init`, `db`, `admin` commands.

The local source code (`0.6.44`) has only a stub `db` command that we just created.

To see our local changes, either:
1. Use `node packages/cli/bin/deesse.js --help` directly
2. Run `npm link` in packages/cli to override global
3. Publish the local build to npm

## Next Steps

To update the published CLI with our changes:
1. Increment version (e.g., `0.6.45`)
2. Run `pnpm changeset add`
3. Run `pnpm release`
4. The new version will be published to npm