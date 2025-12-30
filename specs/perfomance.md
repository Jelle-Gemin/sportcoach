# Performance Optimization Specification

## Overview

This document specifies performance optimization strategies for the training plan app to ensure smooth operation, minimal loading times, and an excellent user experience. The goal is to eliminate long loading screens and provide instant feedback to users.

---

## Core Performance Principles

### 1. Perceived Performance > Actual Performance

Users care about how fast the app _feels_, not just how fast it actually is.

**Strategies:**

- Show instant UI feedback (optimistic updates)
- Display skeleton screens during loads
- Progressively render content as it becomes available
- Cache aggressively
- Pre-fetch predictable data

### 2. Database Query Optimization

Minimize database round trips and optimize query performance.

### 3. Client-Side Caching

Cache data in the browser to avoid redundant API calls.

### 4. Code Splitting & Lazy Loading

Only load code that's needed for the current view.

### 5. Edge Caching

Use CDN and edge caching for static and semi-static content.

---

## Database Performance Optimization

### MongoDB Indexing Strategy

**Critical Indexes:**

```javascript
// activities collection
db.activities.createIndex({ stravaId: 1 }, { unique: true });
db.activities.createIndex({ date: -1 }); // For recent activities queries
db.activities.createIndex({ type: 1, date: -1 }); // For filtered queries
db.activities.createIndex({ fetchedAt: 1 }); // For sync tracking

// Compound index for common query patterns
db.activities.createIndex({ userId: 1, date: -1 });
db.activities.createIndex({ userId: 1, type: 1, date: -1 });

// sync_metadata collection
db.sync_metadata.createIndex({ type: 1 }, { unique: true });
db.sync_metadata.createIndex({ userId: 1 });

// training_plans collection
db.training_plans.createIndex({ userId: 1, active: 1 });
db.training_plans.createIndex({ userId: 1, startDate: 1 });

// analysis cache
db.activity_analyses.createIndex({ stravaId: 1 }, { unique: true });
db.activity_analyses.createIndex({ generated_at: -1 });
db.activity_analyses.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
```

### Query Optimization Patterns

**❌ Bad: Fetching all fields**

```javascript
const activities = await db.collection("activities").find({}).toArray();
```

**✅ Good: Project only needed fields**

```javascript
const activities = await db
  .collection("activities")
  .find({})
  .project({
    stravaId: 1,
    name: 1,
    date: 1,
    distance: 1,
    movingTime: 1,
    type: 1,
    averagePace: 1,
    avgHR: 1,
  })
  .limit(30)
  .sort({ date: -1 })
  .toArray();
```

**❌ Bad: Loading full activity with streams for list view**

```javascript
const activity = await db.collection("activities").findOne({ stravaId: id });
// Streams can be 10KB+ per activity!
```

**✅ Good: Separate queries for list vs detail**

```javascript
// List view - minimal data
const summaries = await db
  .collection("activities")
  .find({})
  .project({ streams: 0, laps: 0, splits: 0 }) // Exclude heavy fields
  .toArray();

// Detail view - full data with streams
const activity = await db.collection("activities").findOne({ stravaId: id });
```

### Aggregation Pipeline Optimization

**For dashboard stats:**

```javascript
// ❌ Bad: Multiple separate queries
const runCount = await activities.countDocuments({ type: "Run" });
const runDistance = await activities
  .aggregate([
    { $match: { type: "Run" } },
    { $group: { _id: null, total: { $sum: "$distance" } } },
  ])
  .toArray();
// ... more queries

// ✅ Good: Single aggregation
const stats = await activities
  .aggregate([
    {
      $facet: {
        runs: [
          { $match: { type: "Run" } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalDistance: { $sum: "$distance" },
              totalTime: { $sum: "$movingTime" },
            },
          },
        ],
        rides: [
          { $match: { type: "Ride" } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalDistance: { $sum: "$distance" },
              totalTime: { $sum: "$movingTime" },
            },
          },
        ],
        recent: [
          { $sort: { date: -1 } },
          { $limit: 5 },
          { $project: { streams: 0, laps: 0 } }, // Exclude heavy fields
        ],
      },
    },
  ])
  .toArray();
```

### Pagination Strategy

**Cursor-based pagination for infinite scroll:**

```javascript
// ❌ Bad: Offset pagination (slow for large datasets)
const activities = await db
  .collection("activities")
  .find({})
  .skip(page * 50)
  .limit(50)
  .toArray();

// ✅ Good: Cursor-based pagination
const activities = await db
  .collection("activities")
  .find({
    date: { $lt: lastActivityDate }, // Use indexed field
  })
  .sort({ date: -1 })
  .limit(50)
  .toArray();
```

### Connection Pooling

```javascript
// lib/mongodb.ts
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = {
  maxPoolSize: 10, // Maintain up to 10 connections
  minPoolSize: 2,  // Keep at least 2 connections open
  maxIdleTimeMS: 30000, // Close idle connections after 30s
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to preserve connection across hot reloads
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
```

---

## API Route Optimization

### Implement Response Caching

**Using Next.js App Router with revalidation:**

```typescript
// app/api/activities/route.ts
import { NextResponse } from "next/server";

export const revalidate = 300; // Revalidate every 5 minutes

export async function GET(request: Request) {
  const activities = await fetchActivities();

  return NextResponse.json(activities, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
```

**Redis caching for expensive operations:**

```typescript
// lib/cache.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache for next time
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}

// Usage in API route
export async function GET(request: Request) {
  const stats = await getCached(
    "dashboard:stats:user123",
    () => fetchDashboardStats(),
    300 // 5 minutes
  );

  return NextResponse.json(stats);
}
```

### Parallel Data Fetching

```typescript
// ❌ Bad: Sequential fetching (slow)
const user = await fetchUser();
const activities = await fetchActivities();
const stats = await fetchStats();
const plan = await fetchTrainingPlan();

// ✅ Good: Parallel fetching
const [user, activities, stats, plan] = await Promise.all([
  fetchUser(),
  fetchActivities(),
  fetchStats(),
  fetchTrainingPlan(),
]);
```

### API Response Compression

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Enable compression for JSON responses
  if (request.headers.get("accept")?.includes("application/json")) {
    response.headers.set("Content-Encoding", "gzip");
  }

  return response;
}
```

---

## Client-Side Performance

### React Query for Data Management

**Setup:**

```typescript
// lib/react-query-provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Usage in components:**

```typescript
// hooks/useActivities.ts
import { useQuery } from "@tanstack/react-query";

export function useActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const res = await fetch("/api/activities");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

// hooks/useActivity.ts
export function useActivity(stravaId: number) {
  return useQuery({
    queryKey: ["activity", stravaId],
    queryFn: async () => {
      const res = await fetch(`/api/activities/${stravaId}`);
      return res.json();
    },
    enabled: !!stravaId, // Only fetch if stravaId exists
  });
}
```

**Optimistic updates for instant feedback:**

```typescript
// hooks/useMarkWorkoutComplete.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useMarkWorkoutComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workoutId: string) => {
      const res = await fetch(`/api/workouts/${workoutId}/complete`, {
        method: "POST",
      });
      return res.json();
    },
    // Optimistic update
    onMutate: async (workoutId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["training-plan"] });

      // Snapshot previous value
      const previousPlan = queryClient.getQueryData(["training-plan"]);

      // Optimistically update
      queryClient.setQueryData(["training-plan"], (old: any) => {
        return {
          ...old,
          workouts: old.workouts.map((w: any) =>
            w.id === workoutId ? { ...w, completed: true } : w
          ),
        };
      });

      return { previousPlan };
    },
    // Rollback on error
    onError: (err, workoutId, context) => {
      queryClient.setQueryData(["training-plan"], context?.previousPlan);
    },
    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plan"] });
    },
  });
}
```

### Data Pre-fetching

**Pre-fetch on hover:**

```typescript
// components/ActivityCard.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export function ActivityCard({ activity }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const prefetchActivity = () => {
    queryClient.prefetchQuery({
      queryKey: ["activity", activity.stravaId],
      queryFn: async () => {
        const res = await fetch(`/api/activities/${activity.stravaId}`);
        return res.json();
      },
    });
  };

  return (
    <div
      onMouseEnter={prefetchActivity} // Pre-fetch on hover
      onClick={() => router.push(`/activities/${activity.stravaId}`)}
    >
      {/* Card content */}
    </div>
  );
}
```

**Pre-fetch on mount:**

```typescript
// app/dashboard/page.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export default function Dashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Pre-fetch likely next pages
    queryClient.prefetchQuery({
      queryKey: ["activities"],
      queryFn: () => fetch("/api/activities").then((r) => r.json()),
    });

    queryClient.prefetchQuery({
      queryKey: ["training-plan"],
      queryFn: () => fetch("/api/training-plan").then((r) => r.json()),
    });
  }, [queryClient]);

  return <div>{/* Dashboard content */}</div>;
}
```

### Virtualization for Long Lists

**Using react-window for activity lists:**

```typescript
// components/VirtualActivityList.tsx
"use client";

import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

export function VirtualActivityList({ activities }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ActivityCard activity={activities[index]} />
    </div>
  );

  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          height={height}
          itemCount={activities.length}
          itemSize={120} // Height of each activity card
          width={width}
        >
          {Row}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
}
```

### Infinite Scroll with React Query

```typescript
// hooks/useInfiniteActivities.ts
import { useInfiniteQuery } from "@tanstack/react-query";

export function useInfiniteActivities() {
  return useInfiniteQuery({
    queryKey: ["activities", "infinite"],
    queryFn: async ({ pageParam = null }) => {
      const url = pageParam
        ? `/api/activities?cursor=${pageParam}`
        : "/api/activities";

      const res = await fetch(url);
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 5 * 60 * 1000,
  });
}

// Component usage
export function ActivityList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteActivities();

  return (
    <div>
      {data?.pages.map((page) =>
        page.activities.map((activity) => (
          <ActivityCard key={activity.stravaId} activity={activity} />
        ))
      )}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

---

## Component-Level Optimization

### Code Splitting & Lazy Loading

```typescript
// ❌ Bad: Import everything upfront
import { ActivityChart } from "@/components/ActivityChart";
import { AIAnalysis } from "@/components/AIAnalysis";

// ✅ Good: Lazy load heavy components
import dynamic from "next/dynamic";

const ActivityChart = dynamic(() => import("@/components/ActivityChart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Charts don't need SSR
});

const AIAnalysis = dynamic(() => import("@/components/AIAnalysis"), {
  loading: () => <AnalysisSkeleton />,
});
```

### Memoization

```typescript
// ❌ Bad: Recalculating on every render
function ActivityStats({ activities }) {
  const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
  const avgPace = calculateAvgPace(activities);

  return <div>{totalDistance} km</div>;
}

// ✅ Good: Memoize expensive calculations
import { useMemo } from "react";

function ActivityStats({ activities }) {
  const stats = useMemo(
    () => ({
      totalDistance: activities.reduce((sum, a) => sum + a.distance, 0),
      avgPace: calculateAvgPace(activities),
    }),
    [activities]
  );

  return <div>{stats.totalDistance} km</div>;
}
```

### React.memo for Pure Components

```typescript
// components/ActivityCard.tsx
import { memo } from "react";

export const ActivityCard = memo(
  function ActivityCard({ activity }) {
    return (
      <div className="activity-card">
        <h3>{activity.name}</h3>
        <p>{activity.distance} km</p>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return prevProps.activity.stravaId === nextProps.activity.stravaId;
  }
);
```

### Debouncing Search/Filters

```typescript
// hooks/useDebounce.ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchActivities() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data } = useQuery({
    queryKey: ["activities", "search", debouncedSearch],
    queryFn: () => fetchActivities(debouncedSearch),
    enabled: debouncedSearch.length > 0,
  });

  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search activities..."
    />
  );
}
```

---

## Image Optimization

### Next.js Image Component

```typescript
// ❌ Bad: Regular img tag
<img src={user.profile} alt={user.name} />;

// ✅ Good: Next.js Image with optimization
import Image from "next/image";

<Image
  src={user.profile}
  alt={user.name}
  width={150}
  height={150}
  placeholder="blur"
  blurDataURL={user.profileThumbnail}
  loading="lazy"
/>;
```

### Avatar Optimization

```typescript
// components/Avatar.tsx
import Image from "next/image";

export function Avatar({ src, name, size = 48 }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={name}
        fill
        className="rounded-full object-cover"
        sizes={`${size}px`}
        priority={size > 100} // Prioritize large avatars
      />
    </div>
  );
}
```

---

## Chart Performance

### Use Canvas-based Charts for Large Datasets

```typescript
// components/ActivityChart.tsx
"use client";

import dynamic from "next/dynamic";

// Use react-chartjs-2 (canvas-based) instead of Recharts (SVG-based) for large datasets
const Chart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export function ActivityChart({ data }) {
  // Downsample data if too many points
  const chartData = useMemo(() => {
    if (data.length > 1000) {
      // Downsample to 500 points
      return downsample(data, 500);
    }
    return data;
  }, [data]);

  return (
    <Chart
      data={{
        labels: chartData.map((d) => d.time),
        datasets: [
          {
            data: chartData.map((d) => d.heartRate),
            borderColor: "#3B82F6",
            borderWidth: 2,
            pointRadius: 0, // Hide points for performance
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // Disable animations for performance
      }}
    />
  );
}

function downsample(data: any[], targetSize: number) {
  const step = Math.ceil(data.length / targetSize);
  return data.filter((_, i) => i % step === 0);
}
```

---

## Loading States & Progressive Enhancement

### Skeleton Screens

```typescript
// components/ActivitySkeleton.tsx
export function ActivitySkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
  );
}

// Usage
import { Suspense } from "react";

<Suspense fallback={<ActivitySkeleton />}>
  <ActivityList />
</Suspense>;
```

### Progressive Loading

```typescript
// app/activities/[id]/page.tsx
export default async function ActivityPage({ params }) {
  // Fetch minimal data first (fast)
  const activitySummary = await fetchActivitySummary(params.id);

  return (
    <div>
      {/* Show summary immediately */}
      <ActivityHeader activity={activitySummary} />

      {/* Load heavy components progressively */}
      <Suspense fallback={<ChartSkeleton />}>
        <ActivityCharts activityId={params.id} />
      </Suspense>

      <Suspense fallback={<AnalysisSkeleton />}>
        <AIAnalysis activityId={params.id} />
      </Suspense>
    </div>
  );
}
```

---

## Bundle Size Optimization

### Analyze Bundle

```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

```javascript
// next.config.js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer({
  // ... config
});
```

### Tree-shaking & Dead Code Elimination

```typescript
// ❌ Bad: Import entire lodash
import _ from "lodash";
const sum = _.sum(numbers);

// ✅ Good: Import only what you need
import sum from "lodash/sum";
const total = sum(numbers);
```

### Remove Unused Dependencies

```bash
# Use depcheck to find unused dependencies
npx depcheck

# Use next-unused to find unused files
npx next-unused
```

---

## Network Optimization

### API Response Size Reduction

**Compress responses:**

```typescript
// next.config.js
module.exports = {
  compress: true, // Enable gzip compression
};
```

**Minimize payload:**

```typescript
// ❌ Bad: Sending unnecessary data
{
  activities: activities, // Full objects with all fields
}

// ✅ Good: Send only required fields
{
  activities: activities.map(a => ({
    id: a.stravaId,
    name: a.name,
    date: a.date,
    distance: a.distance,
    duration: a.movingTime,
    type: a.type
  }))
}
```

### HTTP/2 Server Push (if using custom server)

```javascript
// For critical resources
res.push("/styles/critical.css", {
  status: 200,
  method: "GET",
  request: {
    accept: "text/css",
  },
  response: {
    "content-type": "text/css",
  },
});
```

---

## Monitoring & Metrics

### Real User Monitoring (RUM)

```typescript
// lib/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch("/api/analytics", {
    method: "POST",
    body: JSON.stringify(metric),
    headers: { "Content-Type": "application/json" },
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

```typescript
// app/layout.tsx
"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric);
    // Send to analytics
  });
}
```

### Performance Budgets

```javascript
// next.config.js
module.exports = {
  // Set performance budgets
  experimental: {
    optimizeCss: true,
  },
  // Warn if bundles exceed limits
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};
```

---

## Performance Checklist

### Database

- [ ] All frequently-queried fields are indexed
- [ ] Compound indexes for common query patterns
- [ ] Connection pooling configured
- [ ] Query projections limit returned fields
- [ ] Aggregation pipelines optimized
- [ ] Pagination uses cursor-based approach

### API

- [ ] Response caching implemented
- [ ] Parallel data fetching where possible
- [ ] API responses compressed
- [ ] Redis/memory caching for expensive operations
- [ ] Rate limiting to prevent abuse

### Client

- [ ] React Query for data management
- [ ] Optimistic updates for instant feedback
- [ ] Pre-fetching on predictable navigation
- [ ] Code splitting with dynamic imports
- [ ] Virtualization for long lists
- [ ] Infinite scroll instead of pagination

### Components

- [ ] Heavy components lazy loaded
- [ ] Expensive calculations memoized
- [ ] Pure components wrapped in React.memo
- [ ] Search/filters debounced
- [ ] Charts downsampled for large datasets

### Images

- [ ] Next.js Image component used
- [ ] Lazy loading enabled
- [ ] Proper sizing specified
- [ ] Blur placeholders for above-fold images

### Loading States

- [ ] Skeleton screens for all async content
- [ ] Progressive loading of heavy components
- [ ] Suspense boundaries at appropriate levels
- [ ] Optimistic UI updates

### Bundle

- [ ] Bundle analysis performed
- [ ] Tree-shaking verified
- [ ] Unused dependencies removed
- [ ] Critical CSS inlined
- [ ] Fonts optimized

### Monitoring

- [ ] Web Vitals tracked
- [ ] Error monitoring setup
- [ ] Performance budgets defined
- [ ] Regular performance audits scheduled

---

## Target Performance Metrics

**Goal: Sub-second perceived load times**

### Core Web Vitals

- **LCP (Largest Contentful Paint)**: < 1.5s ⭐ (good), < 2.5s ✅ (needs improvement)
- **FID (First Input Delay)**: < 50ms ⭐, < 100ms ✅
- **CLS (Cumulative Layout Shift)**: < 0.05 ⭐, < 0.1 ✅

### Custom Metrics

- **Dashboard Load**: < 500ms (perceived)
- **Activity List Render**: < 200ms
- **Activity Detail Load**: < 800ms
- **Chart Render**: < 300ms
- **Search Response**: < 100ms (debounced)
- **Filter Application**: < 50ms

### API Response Times

- **GET /api/activities**: < 200ms
- **GET /api/activities/[id]**: < 300ms
- **POST /api/sync**: < 100ms (async operation)
- **GET /api/dashboard/stats**: < 150ms (cached)

---

## Implementation Priority

### Phase 1: Critical Performance (Week 1)

1. Implement database indexes
2. Add React Query for data management
3. Optimize API projections
4. Add loading skeletons
5. Implement basic caching

### Phase 2: Advanced Optimization (Week 2)

1. Add Redis caching layer
2. Implement code splitting
3. Add virtualization for lists
4. Optimize images with Next.js Image
5. Implement optimistic updates

### Phase 3: Polish & Monitoring (Week 3)

1. Add performance monitoring
2. Implement pre-fetching
3. Optimize bundle size
4. Add progressive loading
5. Performance testing & tuning

---

## Success Criteria

- ✅ Dashboard loads in < 500ms (perceived)
- ✅ No loading spinners > 300ms
- ✅ Smooth scrolling (60fps)
- ✅ Instant UI feedback on all interactions
- ✅ LCP < 1.5s, FID < 50ms, CLS < 0.05
- ✅ Zero visible layout shifts
- ✅ Activity list scrolls smoothly with 1000+ items

---

This specification provides a comprehensive roadmap for optimizing your training plan app's performance. Focus on the high-impact items first (database indexes, React Query, loading states) and progressively enhance from there. This is for all the endpoints and screens.
