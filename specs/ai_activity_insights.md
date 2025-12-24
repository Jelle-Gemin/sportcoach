# AI Activity Analysis Specification

## Overview

This document specifies the AI-powered activity analysis feature that provides intelligent insights into running and cycling activities using GPT-4o via Puter.js. The analysis leverages detailed activity data from Strava to generate personalized performance insights across four key dimensions.

## Integration Architecture

### Puter.js Integration

```javascript
// Initialize Puter.js
import puter from "puter";

// AI Service Configuration
const AI_CONFIG = {
  model: "gpt-4o", // Free tier model via Puter.js
  temperature: 0.7,
  max_tokens: 1500,
};
```

### Model Selection Rationale

**Using GPT-4o (via Puter.js):**

- Free tier access through Puter.js platform
- Strong analytical capabilities for fitness data
- Good balance between performance and cost
- Sufficient context window for activity data

**Note:** GPT-5.2 is not currently available through Puter.js free tier. GPT-4o provides excellent analysis capabilities for this use case.

## Data Requirements

### Input Data Structure

The AI analysis requires the following activity data from MongoDB:

```typescript
interface ActivityAnalysisInput {
  // Basic metrics
  stravaId: number;
  name: string;
  type: string; // 'Run', 'VirtualRide', etc.
  date: Date;
  distance: number; // meters
  movingTime: number; // seconds
  elapsedTime: number; // seconds
  total_elevation_gain: number; // meters

  // Pace data
  averagePace: string; // mm:ss/km format
  maxPace: string; // mm:ss/km format

  // Heart rate data
  avgHR: number; // bpm
  maxHR: number; // bpm

  // Cadence data
  avgCadence?: number; // rpm

  // Lap data
  laps: Array<{
    distance: number;
    elapsedTime: number;
    averageSpeed: string;
    averageHeartrate: number;
    averageCadence?: number;
    maxHeartrate: number;
  }>;

  // Time series data (streams)
  streams: {
    time: number[]; // seconds
    distance: number[]; // meters
    heartrate?: number[]; // bpm
    pace?: number[]; // seconds per km
    cadence?: number[]; // rpm
    altitude?: number[]; // meters
    watts?: number[]; // watts (for cycling)
  };

  // User context (optional but helpful)
  userProfile?: {
    restingHR?: number;
    maxHR?: number;
    trainingZones?: {
      zone1: [number, number]; // [min, max] bpm
      zone2: [number, number];
      zone3: [number, number];
      zone4: [number, number];
      zone5: [number, number];
    };
  };
}
```

## Analysis Components

### 1. Performance Summary

**Purpose:** Provide an overall assessment of the workout quality and key achievements.

**Analysis Points:**

- Overall workout quality (excellent/good/moderate/needs improvement)
- Key achievements and milestones
- Comparison to typical workouts (if historical data available)
- Notable splits or segments
- Energy distribution throughout the activity

**Example Output:**

```
This was a strong tempo run with excellent pacing discipline. You maintained
a consistent effort throughout, with your fastest kilometer coming at the 8km
mark (4:12/km). Your average pace of 4:35/km represents a 3% improvement over
your recent runs at similar distances. The steady heart rate progression
indicates good aerobic efficiency. Notable achievement: This is your 3rd fastest
10K time this year.
```

### 2. Pace Analysis

**Purpose:** Analyze pacing strategy, consistency, and identify patterns.

**Analysis Points:**

- Pacing strategy assessment (even, negative split, positive split)
- Pace variability and consistency metrics
- Kilometer/mile splits analysis
- Comparison of first half vs second half
- Identification of surge or fade patterns
- Terrain impact on pace (if elevation data available)

**Calculations to Perform:**

```javascript
// Pace consistency score
const paceVariability = calculateStandardDeviation(lapPaces);
const consistencyScore = 100 - (paceVariability / averagePace) * 100;

// Split comparison
const firstHalfPace = calculateAveragePace(laps.slice(0, laps.length / 2));
const secondHalfPace = calculateAveragePace(laps.slice(laps.length / 2));
const splitDifference = secondHalfPace - firstHalfPace;
```

**Example Output:**

```
Your pacing was remarkably consistent with a 94% consistency score. You employed
a slight negative split strategy, running the second half 8 seconds per kilometer
faster than the first. This is excellent race-day execution. The fastest
kilometer came at 8km (4:12/km), showing you had energy reserves. Minor pace
variations between kilometers 3-5 (+10s/km) suggest you navigated a slight
incline. Overall, this demonstrates strong pacing maturity and race awareness.
```

### 3. Heart Rate Analysis

**Purpose:** Evaluate cardiovascular effort, training zones, and aerobic efficiency.

**Analysis Points:**

- Time spent in each heart rate zone
- Heart rate drift analysis (early vs late workout)
- Cardiac efficiency (pace relative to HR)
- Recovery indicators (HR at end, time to recover)
- Comparison to max/resting HR (if available)
- Aerobic decoupling (pace:HR relationship over time)

**Calculations to Perform:**

```javascript
// HR zones time distribution
const zoneDistribution = calculateZoneTime(
  streams.heartrate,
  userProfile.trainingZones
);

// HR drift (compare first 25% to last 25%)
const earlyHR = average(
  streams.heartrate.slice(0, streams.heartrate.length * 0.25)
);
const lateHR = average(
  streams.heartrate.slice(streams.heartrate.length * 0.75)
);
const hrDrift = ((lateHR - earlyHR) / earlyHR) * 100;

// Aerobic efficiency
const aerobicEfficiency = averagePace / avgHR; // Lower is better
```

**Example Output:**

```
Your cardiovascular response was well-controlled with 65% of time in Zone 2-3
(aerobic endurance range). Average heart rate of 152 bpm represents 78% of your
estimated max, appropriate for a tempo effort. Heart rate drift was minimal at
3.2%, indicating good cardiovascular fitness and proper pacing. Your cardiac
efficiency of 0.030 (pace/HR ratio) is excellent for this effort level. The
heart rate dropped quickly in the final kilometer, suggesting good recovery
capacity.
```

### 4. Consistency Analysis

**Purpose:** Evaluate workout execution consistency and identify patterns.

**Analysis Points:**

- Lap-to-lap consistency
- Cadence consistency (if available)
- Effort distribution
- Split variation analysis
- Comparison to workout goal/plan
- Mental fortitude indicators (maintaining pace when tired)

**Calculations to Perform:**

```javascript
// Overall consistency metrics
const lapPaceVariation = calculateCoefficientOfVariation(lapPaces);
const hrVariation = calculateCoefficientOfVariation(lapHeartRates);
const cadenceVariation = calculateCoefficientOfVariation(lapCadences);

// Effort consistency score
const effortScore =
  100 - (lapPaceVariation * 30 + hrVariation * 20 + cadenceVariation * 10);
```

**Example Output:**

```
Excellent execution consistency with a 91/100 consistency score. Your kilometer
splits varied by only ±6 seconds, demonstrating strong mental discipline.
Cadence remained stable at 168-172 spm throughout, indicating good running form
maintenance even under fatigue. The most consistent segment was kilometers 5-8,
where pace variation was just ±3 seconds. This level of consistency suggests
you ran within your capabilities and had a clear mental plan. Consider this
workout a model for future tempo efforts.
```

## AI Prompt Engineering

### Prompt Template Structure

```javascript
const generateAnalysisPrompt = (
  activity: ActivityAnalysisInput,
  section: AnalysisSection
): string => {
  const baseContext = `
You are an expert running and cycling coach analyzing an athlete's workout data. 
Provide specific, actionable insights based on the data. Be encouraging but honest. 
Focus on patterns, improvements, and coaching advice.

Activity: ${activity.name}
Type: ${activity.type}
Date: ${formatDate(activity.date)}
Distance: ${(activity.distance / 1000).toFixed(2)}km
Duration: ${formatDuration(activity.movingTime)}
Average Pace: ${activity.averagePace}/km
Average HR: ${activity.avgHR} bpm
`;

  const sectionPrompts = {
    performance_summary: `
${baseContext}

Lap splits:
${formatLapData(activity.laps)}

Provide a comprehensive performance summary (150-200 words) covering:
1. Overall workout quality assessment
2. Key achievements or notable moments
3. Energy distribution and pacing discipline
4. Comparison context (if this represents improvement)
5. One actionable takeaway

Be specific with numbers and time stamps. Write in second person ("you").
`,

    pace_analysis: `
${baseContext}

Detailed lap data:
${formatDetailedLapData(activity.laps)}

Pace stream data: ${activity.streams.pace ? "Available" : "Not available"}
Elevation gain: ${activity.total_elevation_gain}m

Analyze the pacing strategy (150-200 words) including:
1. Pacing strategy type (even, negative/positive split)
2. Consistency score and variation analysis
3. Notable splits and when they occurred
4. Impact of terrain on pacing (if applicable)
5. Pacing discipline assessment

Calculate and mention specific metrics like pace variation, split differences.
`,

    heart_rate: `
${baseContext}

Heart rate data:
- Average: ${activity.avgHR} bpm
- Max: ${activity.maxHR} bpm
${
  activity.userProfile?.restingHR
    ? `- Resting: ${activity.userProfile.restingHR} bpm`
    : ""
}
${
  activity.userProfile?.maxHR
    ? `- Estimated Max: ${activity.userProfile.maxHR} bpm`
    : ""
}

HR stream: ${activity.streams.heartrate ? "Available" : "Not available"}

Analyze cardiovascular response (150-200 words) covering:
1. Time in different effort zones
2. Heart rate drift throughout workout
3. Cardiac efficiency (pace relative to HR)
4. Recovery indicators
5. Aerobic fitness insights

Be specific about percentages, HR drift calculations, and zone distribution.
`,

    consistency: `
${baseContext}

Lap-by-lap breakdown:
${formatLapData(activity.laps)}

${activity.avgCadence ? `Average Cadence: ${activity.avgCadence} rpm` : ""}

Analyze workout consistency (150-200 words) addressing:
1. Lap-to-lap variation (pace, HR, cadence)
2. Overall consistency score
3. When consistency was best/worst
4. Form maintenance under fatigue
5. Mental discipline indicators

Calculate specific variation metrics and highlight the most consistent segments.
`,
  };

  return sectionPrompts[section];
};
```

### Prompt Enhancement Strategies

1. **Include calculated metrics in prompt:**

```javascript
// Pre-calculate metrics to guide AI analysis
const metrics = {
  paceConsistency: calculatePaceConsistency(laps),
  hrDrift: calculateHRDrift(streams),
  splitType: determineSplitType(laps),
  effortScore: calculateEffortScore(activity),
};

// Include in prompt
const enhancedPrompt = `${basePrompt}

Pre-calculated metrics for context:
- Pace Consistency Score: ${metrics.paceConsistency}/100
- HR Drift: ${metrics.hrDrift}%
- Split Strategy: ${metrics.splitType}
- Overall Effort Score: ${metrics.effortScore}/100

Use these metrics to provide specific, data-driven insights.
`;
```

2. **Provide comparison context when available:**

```javascript
// If we have historical data
if (historicalActivities.length > 0) {
  prompt += `
Recent similar workouts for context:
${historicalActivities
  .map(
    (a) => `
- ${formatDate(a.date)}: ${(a.distance / 1000).toFixed(
      1
    )}km in ${formatDuration(a.movingTime)} 
  (avg pace: ${a.averagePace}/km, avg HR: ${a.avgHR} bpm)
`
  )
  .join("")}

Compare this workout to recent similar efforts.
`;
}
```

## API Endpoint Design

### POST `/api/activities/:stravaId/analyze`

Generate AI analysis for an activity.

```typescript
Request Body: {
  sections?: ('performance_summary' | 'pace_analysis' | 'heart_rate' | 'consistency')[];
  // If not specified, generate all sections
  forceRegenerate?: boolean; // Regenerate even if cached
}

Response: {
  success: boolean;
  analysis: {
    performance_summary: string;
    pace_analysis: string;
    heart_rate: string;
    consistency: string;
    generated_at: Date;
    model_used: string;
  };
  metadata: {
    cached: boolean;
    generation_time_ms: number;
  };
}
```

### GET `/api/activities/:stravaId/analysis`

Retrieve cached analysis.

```typescript
Response: {
  exists: boolean;
  analysis?: {
    performance_summary: string;
    pace_analysis: string;
    heart_rate: string;
    consistency: string;
    generated_at: Date;
    model_used: string;
  };
}
```

## Database Schema

### Collection: `activity_analyses`

```javascript
{
  _id: ObjectId,
  stravaId: Number,           // Reference to activity (indexed)
  analysis: {
    performance_summary: String,
    pace_analysis: String,
    heart_rate: String,
    consistency: String
  },
  metadata: {
    model: String,            // 'gpt-4o'
    version: String,          // Track prompt version
    generated_at: Date,
    generation_time_ms: Number,
    tokens_used: Number
  },
  // Cache invalidation
  activity_hash: String,      // Hash of activity data to detect changes
  expires_at: Date,           // Auto-delete old analyses (optional)
  last_accessed: Date
}

// Indexes
db.activity_analyses.createIndex({ stravaId: 1 }, { unique: true });
db.activity_analyses.createIndex({ generated_at: -1 });
db.activity_analyses.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index
```

## Implementation Flow

### Analysis Service (`services/aiAnalysisService.ts`)

```typescript
import puter from "puter";

class AIAnalysisService {
  private puter: typeof puter;

  constructor() {
    this.puter = puter;
  }

  async generateAnalysis(
    activity: ActivityAnalysisInput,
    sections: AnalysisSection[] = [
      "performance_summary",
      "pace_analysis",
      "heart_rate",
      "consistency",
    ]
  ): Promise<ActivityAnalysis> {
    // 1. Check cache first
    const cached = await this.getCachedAnalysis(activity.stravaId);
    if (cached && !this.isStale(cached)) {
      return cached.analysis;
    }

    // 2. Generate each section
    const analysis: Partial<ActivityAnalysis> = {};

    for (const section of sections) {
      const prompt = generateAnalysisPrompt(activity, section);

      try {
        const response = await this.puter.ai.chat({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an expert running and cycling coach providing detailed workout analysis.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 400, // ~200 words per section
        });

        analysis[section] = response.choices[0].message.content;
      } catch (error) {
        console.error(`Error generating ${section}:`, error);
        analysis[section] = this.getFallbackContent(section);
      }

      // Rate limiting: small delay between sections
      await this.sleep(500);
    }

    // 3. Cache the analysis
    await this.cacheAnalysis(activity.stravaId, analysis as ActivityAnalysis);

    return analysis as ActivityAnalysis;
  }

  async getCachedAnalysis(stravaId: number): Promise<CachedAnalysis | null> {
    const db = await this.getDatabase();
    return db.collection("activity_analyses").findOne({ stravaId });
  }

  async cacheAnalysis(
    stravaId: number,
    analysis: ActivityAnalysis
  ): Promise<void> {
    const db = await this.getDatabase();

    await db.collection("activity_analyses").updateOne(
      { stravaId },
      {
        $set: {
          analysis,
          metadata: {
            model: "gpt-4o",
            version: "1.0.0",
            generated_at: new Date(),
            generation_time_ms: Date.now() - this.startTime,
          },
          last_accessed: new Date(),
        },
      },
      { upsert: true }
    );
  }

  private isStale(cached: CachedAnalysis): boolean {
    // Cache for 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return cached.metadata.generated_at < thirtyDaysAgo;
  }

  private getFallbackContent(section: AnalysisSection): string {
    const fallbacks = {
      performance_summary:
        "Analysis temporarily unavailable. Please try again later.",
      pace_analysis:
        "Pace analysis temporarily unavailable. Please try again later.",
      heart_rate:
        "Heart rate analysis temporarily unavailable. Please try again later.",
      consistency:
        "Consistency analysis temporarily unavailable. Please try again later.",
    };
    return fallbacks[section];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const aiAnalysisService = new AIAnalysisService();
```

## React Component Integration

### ActivityDetailPage with AI Analysis

```typescript
// components/activities/AIAnalysisSection.tsx
import { useState, useEffect } from "react";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";

interface AIAnalysisSectionProps {
  stravaId: number;
}

export function AIAnalysisSection({ stravaId }: AIAnalysisSectionProps) {
  const [analysis, setAnalysis] = useState<ActivityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadAnalysis();
  }, [stravaId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached analysis first
      const cached = await fetch(`/api/activities/${stravaId}/analysis`);
      const cachedData = await cached.json();

      if (cachedData.exists) {
        setAnalysis(cachedData.analysis);
        setLoading(false);
      } else {
        // Generate new analysis
        await generateAnalysis();
      }
    } catch (err) {
      setError("Failed to load analysis");
      setLoading(false);
    }
  };

  const generateAnalysis = async () => {
    try {
      const response = await fetch(`/api/activities/${stravaId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRegenerate: regenerating }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError("Failed to generate analysis");
      }
    } catch (err) {
      setError("Failed to generate analysis");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await generateAnalysis();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Generating AI insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadAnalysis}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">AI Analysis</h2>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`}
          />
          Regenerate
        </button>
      </div>

      <div className="grid gap-6">
        <AnalysisCard
          title="Performance Summary"
          content={analysis?.performance_summary}
          icon="📊"
        />

        <AnalysisCard
          title="Pace Analysis"
          content={analysis?.pace_analysis}
          icon="⚡"
        />

        <AnalysisCard
          title="Heart Rate Analysis"
          content={analysis?.heart_rate}
          icon="❤️"
        />

        <AnalysisCard
          title="Consistency"
          content={analysis?.consistency}
          icon="🎯"
        />
      </div>

      <p className="text-xs text-gray-500 text-center">
        Analysis generated by AI •{" "}
        {new Date(analysis?.generated_at || "").toLocaleDateString()}
      </p>
    </div>
  );
}

function AnalysisCard({
  title,
  content,
  icon,
}: {
  title: string;
  content?: string;
  icon: string;
}) {
  return (
    <div className="bg-card rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
        {content || "Analysis not available"}
      </p>
    </div>
  );
}
```

## Caching Strategy

### Cache Levels

1. **Database Cache** (Primary)

   - Store all generated analyses in MongoDB
   - TTL: 30 days
   - Invalidate on activity update

2. **In-Memory Cache** (Optional)
   - Cache recent analyses for faster access
   - Use LRU cache with max 100 entries
   - TTL: 1 hour

### Cache Invalidation Rules

```typescript
async function shouldRegenerateAnalysis(
  stravaId: number,
  currentActivity: ActivityAnalysisInput
): Promise<boolean> {
  const cached = await getCachedAnalysis(stravaId);

  if (!cached) return true;

  // Regenerate if activity data changed
  const currentHash = hashActivity(currentActivity);
  if (cached.activity_hash !== currentHash) return true;

  // Regenerate if older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (cached.metadata.generated_at < thirtyDaysAgo) return true;

  // Regenerate if prompt version changed
  if (cached.metadata.version !== CURRENT_PROMPT_VERSION) return true;

  return false;
}

function hashActivity(activity: ActivityAnalysisInput): string {
  const relevantData = {
    distance: activity.distance,
    movingTime: activity.movingTime,
    avgHR: activity.avgHR,
    avgPace: activity.averagePace,
    laps: activity.laps.length,
  };
  return crypto
    .createHash("md5")
    .update(JSON.stringify(relevantData))
    .digest("hex");
}
```

## Error Handling

### Graceful Degradation

```typescript
async function generateWithFallback(
  activity: ActivityAnalysisInput,
  section: AnalysisSection
): Promise<string> {
  try {
    // Try AI generation
    return await generateAIAnalysis(activity, section);
  } catch (error) {
    console.error(`AI generation failed for ${section}:`, error);

    // Fall back to rule-based analysis
    return generateRuleBasedAnalysis(activity, section);
  }
}

function generateRuleBasedAnalysis(
  activity: ActivityAnalysisInput,
  section: AnalysisSection
): string {
  // Simple rule-based analysis as fallback
  switch (section) {
    case "performance_summary":
      return `You completed ${(activity.distance / 1000).toFixed(
        2
      )}km in ${formatDuration(activity.movingTime)} with an average pace of ${
        activity.averagePace
      }/km.`;

    case "pace_analysis":
      const paceVariation = calculatePaceVariation(activity.laps);
      return `Your pace varied by ±${paceVariation}s/km across laps. ${
        paceVariation < 10
          ? "This shows good consistency."
          : "Consider working on more even pacing."
      }`;

    case "heart_rate":
      return `Average heart rate was ${activity.avgHR} bpm with a maximum of ${activity.maxHR} bpm during this effort.`;

    case "consistency":
      return `You maintained a relatively ${
        calculatePaceVariation(activity.laps) < 10 ? "consistent" : "variable"
      } effort throughout this workout.`;
  }
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requestQueue: Promise<any>[] = [];
  private maxConcurrent = 2; // Max 2 concurrent AI requests
  private minDelay = 500; // 500ms between requests

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if queue is full
    while (this.requestQueue.length >= this.maxConcurrent) {
      await Promise.race(this.requestQueue);
    }

    // Add delay
    await this.sleep(this.minDelay);

    // Execute request
    const promise = fn();
    this.requestQueue.push(promise);

    // Remove from queue when done
    promise.finally(() => {
      const index = this.requestQueue.indexOf(promise);
      if (index > -1) this.requestQueue.splice(index, 1);
    });

    return promise;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const rateLimiter = new RateLimiter();
```

## Performance Optimization

### Batch Analysis Generation

```typescript
// Generate analyses for multiple activities in background
async function batchGenerateAnalyses(activityIds: number[]): Promise<void> {
  const BATCH_SIZE = 5;

  for (let i = 0; i < activityIds.length; i += BATCH_SIZE) {
    const batch = activityIds.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map((id) =>
        rateLimiter.throttle(() => generateAnalysisForActivity(id))
      )
    );

    // Delay between batches
    await sleep(2000);
  }
}
```

### Progressive Loading

```typescript
// Load sections progressively for better UX
async function generateAnalysisProgressive(
  stravaId: number,
  onSectionComplete: (section: AnalysisSection, content: string) => void
): Promise<void> {
  const sections: AnalysisSection[] = [
    "performance_summary",
    "pace_analysis",
    "heart_rate",
    "consistency",
  ];

  for (const section of sections) {
    const content = await generateSection(stravaId, section);
    onSectionComplete(section, content);
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
describe("AIAnalysisService", () => {
  it("should generate analysis for all sections", async () => {
    const analysis = await aiAnalysisService.generateAnalysis(mockActivity);
    expect(analysis.performance_summary).toBeDefined();
    expect(analysis.pace_analysis).toBeDefined();
    expect(analysis.heart_rate).toBeDefined();
    expect(analysis.consistency).toBeDefined();
  });

  it("should cache generated analysis", async () => {
    await aiAnalysisService.generateAnalysis(mockActivity);
    const cached = await aiAnalysisService.getCachedAnalysis(
      mockActivity.stravaId
    );
    expect(cached).toBeDefined();
  });

  it("should use cached analysis when available", async () => {
    const spy = jest.spyOn(puter.ai, "chat");

    // First call generates
    await aiAnalysisService.generateAnalysis(mockActivity);
    const callCount1 = spy.mock.calls.length;

    // Second call uses cache
    await aiAnalysisService.generateAnalysis(mockActivity);
    const callCount2 = spy.mock.calls.length;

    expect(callCount2).toBe(callCount1); // No new calls
  });
});
```

### Integration Tests

```typescript
describe("Analysis API", () => {
  it("POST /api/activities/:id/analyze generates analysis", async () => {
    const response = await request(app)
      .post(`/api/activities/${testActivityId}/analyze`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.analysis).toBeDefined();
  });

  it("GET /api/activities/:id/analysis retrieves cached", async () => {
    // First generate
    await request(app).post(`/api/activities/${testActivityId}/analyze`);

    // Then retrieve
    const response = await request(app)
      .get(`/api/activities/${testActivityId}/analysis`)
      .expect(200);

    expect(response.body.exists).toBe(true);
  });
});
```

## Monitoring & Analytics

### Track Key Metrics

```typescript
interface AnalysisMetrics {
  generation_count: number;
  cache_hit_rate: number;
  average_generation_time_ms: number;
  error_rate: number;
  sections_generated: {
    performance_summary: number;
    pace_analysis: number;
    heart_rate: number;
    consistency: number;
  };
}

// Log metrics for monitoring
function logMetrics(metric: Partial<AnalysisMetrics>): void {
  // Send to monitoring service (e.g., Datadog, New Relic)
  console.log("[METRICS]", JSON.stringify(metric));
}
```

### User Feedback Loop

```typescript
// Allow users to rate analysis quality
interface AnalysisFeedback {
  stravaId: number;
  section: AnalysisSection;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  timestamp: Date;
}

// Use feedback to improve prompts over time
async function collectFeedback(feedback: AnalysisFeedback): Promise<void> {
  await db.collection("analysis_feedback").insertOne(feedback);
}
```

## Cost Management

### Token Usage Tracking

```typescript
interface TokenUsage {
  date: Date;
  model: string;
  total_tokens: number;
  estimated_cost: number;
  analyses_generated: number;
}

// Track daily token usage
async function trackTokenUsage(tokensUsed: number): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  await db.collection("token_usage").updateOne(
    { date: today, model: "gpt-4o" },
    {
      $inc: {
        total_tokens: tokensUsed,
        analyses_generated: 1,
      },
    },
    { upsert: true }
  );
}
```

### Usage Limits

```typescript
const USAGE_LIMITS = {
  analyses_per_user_per_day: 10,
  analyses_per_user_per_month: 100,
};

async function checkUsageLimit(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  const todayCount = await db.collection("activity_analyses").countDocuments({
    userId,
    "metadata.generated_at": {
      $gte: new Date(today),
    },
  });

  return todayCount < USAGE_LIMITS.analyses_per_user_per_day;
}
```

## Future Enhancements

1. **Comparative Analysis**: Compare current activity to similar past workouts
2. **Training Load Impact**: Analyze how this workout affects overall training load
3. **Injury Risk Assessment**: Flag potential injury risks based on patterns
4. **Personalized Recommendations**: Suggest specific workouts based on analysis
5. **Multi-Activity Trends**: Analyze patterns across multiple activities
6. **Voice Summary**: Generate audio summary of analysis
7. **Shareable Insights**: Create shareable cards with key insights
8. **Coach Integration**: Allow coaches to add notes to AI analysis

## Success Criteria

- ✅ Analysis generation completes in < 10 seconds
- ✅ Cache hit rate > 80% for repeated views
- ✅ Analysis quality rated 4+ stars by 75% of users
- ✅ Zero cost overruns (stay within free tier)
- ✅ Error rate < 2%
- ✅ All sections provide actionable insights
- ✅ Progressive loading provides immediate feedback
- ✅ Mobile-friendly rendering
