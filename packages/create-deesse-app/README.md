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

- **default**: Next.js with Tailwind CSS and shadcn/ui
- **without-admin**: Full-stack template without admin dashboard

## License

MIT
