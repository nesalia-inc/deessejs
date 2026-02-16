# Connection & Dynamic Rendering

## Overview

Using Next.js `connection()` for dynamic rendering control in DeesseJS applications.

## Features

### Connection()
- Wait for user request before rendering
- Exclude from prerendering
- Non-dynamic API alternative
- Replace unstable_noStore

### Use Cases
- Real-time data (timestamps, random values)
- User-specific content
- Time-sensitive data
- External APIs that change per request

## Basic Usage

### Wait for Request
```typescript
// app/page.tsx
import { connection } from 'next/server'

export default async function Page() {
  await connection()

  // Everything below is excluded from prerendering
  const now = new Date()

  return <div>Current time: {now.toLocaleString()}</div>
}
```

### Random Values
```typescript
import { connection } from 'next/server'

export default async function Page() {
  await connection()

  const randomValue = Math.random()

  return <div>Random: {randomValue}</div>
}
```

## Time-Based Content

### Current Timestamp
```typescript
// app/page.tsx
import { connection } from 'next/server'

export default async function Page() {
  await connection()

  const now = new Date()

  return (
    <main>
      <h1>Welcome</h1>
      <p>Generated at: {now.toLocaleString()}</p>
    </main>
  )
}
```

### Countdown Timer
```typescript
// app/giveaway/page.tsx
import { connection } from 'next/server'

export default async function GiveawayPage() {
  await connection()

  const endsAt = new Date('2025-12-31')
  const now = new Date()
  const timeLeft = endsAt.getTime() - now.getTime()

  return (
    <div>
      <h1>Giveaway ends in:</h1>
      <p>{Math.floor(timeLeft / (1000 * 60 * 60 * 24))} days</p>
    </div>
  )
}
```

## User-Specific Content

### Personalized Greeting
```typescript
// app/page.tsx
import { connection } from 'next/server'
import { getUser } from '@deessejs/auth'

export default async function Page() {
  await connection()

  const user = await getUser()

  return (
    <main>
      <h1>{user ? `Welcome, ${user.name}!` : 'Welcome!'}</h1>
    </main>
  )
}
```

### User Stats
```typescript
// app/dashboard/page.tsx
import { connection } from 'next/server'
import { db } from '@deessejs/db'

export default async function Dashboard() {
  await connection()

  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const stats = await db.userStats.findUnique({
    where: { userId: session.user.id }
  })

  return <DashboardStats stats={stats} />
}
```

## External API Data

### Real-Time API
```typescript
// app/stocks/page.tsx
import { connection } from 'next/server'

export default async function StocksPage() {
  await connection()

  const stocks = await fetch('https://api.stocks.com/realtime')
    .then(res => res.json())

  return <StockList stocks={stocks} />
}
```

### Weather Data
```typescript
// app/weather/page.tsx
import { connection } from 'next/server'

export default async function WeatherPage() {
  await connection()

  const weather = await fetch(
    `https://api.weather.com/current?${new Date().toISOString()}`
  ).then(res => res.json())

  return <WeatherDisplay weather={weather} />
}
```

## Collection-Based Dynamic Content

### Per-Collection Connection
```typescript
// app/posts/[slug]/page.tsx
import { connection } from 'next/server'

export default async function PostPage(props: PageProps<'/posts/[slug]'>) {
  const { isEnabled } = await getDraftMode()

  if (isEnabled) {
    await connection() // Dynamic in draft mode
  }

  const { slug } = await props.params
  const post = await db.posts.findBySlug(slug)

  return <PostDetail post={post} />
}
```

### Configuration
```typescript
// deesse.config.ts
export const config = defineConfig({
  collections: [{
    name: 'posts',
    dynamic: {
      draftMode: true,      // Dynamic in draft mode
      published: false,     // Static when published
      personalized: false,  // Static for all users
    }
  }]
})
```

## Conditional Dynamic Rendering

### Check Before Connection
```typescript
// app/page.tsx
import { connection } from 'next/server'
import { headers } from 'next/headers'

export default async function Page() {
  const headersList = await headers()
  const hasDraftCookie = headersList.get('cookie')?.includes('draft')

  if (hasDraftCookie) {
    await connection() // Dynamic for draft mode
  }

  return <PageContent />
}
```

### Feature Flag Dynamic
```typescript
// app/page.tsx
import { connection } from 'next/server'
import { getFeatureFlag } from '@deessejs/features'

export default async function Page() {
  const showDynamic = await getFeatureFlag('dynamic-content')

  if (showDynamic) {
    await connection()
  }

  return showDynamic ? <DynamicContent /> : <StaticContent />
}
```

## Performance Considerations

### When to Use connection()
- Need dynamic content per request
- Using Math.random(), new Date(), etc.
- User-specific data without auth cookies
- Time-sensitive content

### When NOT to Use connection()
- Can use headers() or cookies() instead
- Static content is acceptable
- Can use revalidation instead
- Auth cookies present (already dynamic)

## Comparison with Other APIs

### vs headers()
```typescript
// Using headers() - automatically dynamic
import { headers } from 'next/headers'

export default async function Page() {
  const headersList = await headers()
  const userAgent = headersList.get('user-agent')
  return <div>User Agent: {userAgent}</div>
}
```

### vs cookies()
```typescript
// Using cookies() - automatically dynamic
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')
  return <div>Theme: {theme?.value}</div>
}
```

### vs connection()
```typescript
// Using connection() - explicitly dynamic
import { connection } from 'next/server'

export default async function Page() {
  await connection()

  const random = Math.random()
  return <div>Random: {random}</div>
}
```

## Best Practices

### Prefer Dynamic APIs Over connection()
- Use headers() when possible
- Use cookies() when possible
- Use connection() only when needed

### Use for Non-Dynamic APIs
- Math.random()
- new Date()
- External changing data
- User request context

### Document Why
```typescript
// Use connection() for non-Dynamic APIs
await connection() // Required for Math.random() - time-based random seed
```

## Benefits

- **Control**: Explicit dynamic rendering
- **Simple**: Easy to use
- **Performance**: Only use when needed
- **Clear**: Shows intent for dynamic rendering
