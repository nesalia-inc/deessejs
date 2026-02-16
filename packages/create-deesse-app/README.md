# create-deesse-app

CLI tool to create a new DeesseJS project.

## Usage

```bash
npx create-deesse-app@latest my-app
```

## Development

```bash
# Build the package
pnpm build

# Run locally (from packages/create-deesse-app)
node bin/cli.js

# Or run from root
pnpm --filter create-deesse-app build
node packages/create-deesse-app/bin/cli.js
```

## Templates

- **minimal**: Minimal Next.js starter
- **default**: Next.js with Tailwind CSS and shadcn/ui
- **full-stack**: Full-stack template (coming soon)

## License

MIT
