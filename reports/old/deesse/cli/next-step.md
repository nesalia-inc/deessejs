# CLI Next Step: Implement Drizzle Commands

## Current State Summary

- **Package**: `@deessejs/cli@0.6.45` published to npm
- **Local Source**: `packages/cli/src/` with brocli framework set up
- **DB Command**: Stub at `commands/db/index.ts` logs "coming soon"
- **Config Loader**: Stub at `utils/config.ts` throws "not implemented yet"
- **Version discrepancy**: `package.json` shows `0.6.45`, but `src/index.ts` shows `0.6.44`

The init step (CLI framework with placeholder) is complete. The actual `db:generate`, `db:migrate`, and `db:push` commands are not implemented.

## Next Step Recommendation

**Implement the three core drizzle commands** (`db:generate`, `db:migrate`, `db:push`) using the execSync wrapper pattern documented in `reports/deesse/cli/drizzle-integration/integration-patterns.md`.

The pattern is:
```typescript
import { execSync } from 'child_process';

export const runGenerate = (options?: string[]) => {
  const args = ['drizzle-kit', 'generate', ...(options || [])];
  execSync(args.join(' '), { stdio: 'inherit' });
};
```

## Files to Create

### `packages/cli/src/commands/db/generate.ts`
- Exports `generateCommand` using brocli's `command()`
- Handler calls `execSync('drizzle-kit generate', { stdio: 'inherit' })`
- Forward any brocli options as CLI args

### `packages/cli/src/commands/db/migrate.ts`
- Exports `migrateCommand` using brocli's `command()`
- Handler calls `execSync('drizzle-kit migrate', { stdio: 'inherit' })`

### `packages/cli/src/commands/db/push.ts`
- Exports `pushCommand` using brocli's `command()`
- Handler calls `execSync('drizzle-kit push', { stdio: 'inherit' })`
- Support `--force`, `--strict`, `--verbose` options

## Files to Modify

### `packages/cli/src/commands/db/index.ts`
- Replace stub with subcommand that uses brocli's `subcommand()` or command collection
- Register `generateCommand`, `migrateCommand`, `pushCommand`
- Add help text describing the commands

### `packages/cli/src/utils/config.ts`
- Either implement config loader or remove (drizzle-kit auto-discovers config)
- If kept, implement to find and validate `drizzle.config.ts`

### `packages/cli/src/index.ts`
- Fix version to `0.6.45` to match `package.json`

## Implementation Order

1. Create `generate.ts` with execSync wrapper
2. Create `migrate.ts` with execSync wrapper
3. Create `push.ts` with execSync wrapper
4. Modify `db/index.ts` to wire up subcommands
5. Test locally: `node packages/cli/bin/deesse.js db:generate --help`
6. Verify version discrepancy is resolved
7. Publish new version to npm

## References

- `reports/deesse/cli/drizzle-integration/integration-patterns.md` - execSync pattern
- `reports/deesse/cli/drizzle-integration/drizzle-commands.md` - command documentation
- `reports/deesse/cli/implementation-plan.md` - previous step (init complete)