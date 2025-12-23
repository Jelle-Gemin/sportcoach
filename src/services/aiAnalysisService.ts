import { MongoClient, Db, Collection } from 'mongodb';

// @ts-ignore - puter library doesn't have TypeScript definitions
import puter from 'puter';

// TypeScript interfaces
export interface ActivityAnalysisInput {
  stravaId: number;
  name: string;
  type: string;
  date: Date;
  distance: number; // meters
  movingTime: number; // seconds
  elapsedTime: number; // seconds
  total_elevation_gain: number; // meters
  averagePace: string; // mm:ss/km format
  maxPace: string; // mm:ss/km format
  avgHR: number; // bpm
  maxHR: number; // bpm
  avgCadence?: number; // rpm
  laps: Array<{
    distance: number;
    elapsedTime: number;
    averageSpeed: string;
    averageHeartrate: number;
    averageCadence?: number;
    maxHeartrate: number;
  }>;
  streams: {
    time: number[]; // seconds
    distance: number[]; // meters
    heartrate?: number[]; // bpm
    pace?: number[]; // seconds per km
    cadence?: number[]; // rpm
    altitude?: number[]; // meters
    watts?: number[]; // watts (for cycling)
  };
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

export interface ActivityAnalysis {
  performance_summary: string;
  pace_analysis: string;
  heart_rate: string;
  consistency: string;
  generated_at: Date;
  model_used: string;
}

export type AnalysisSection = keyof Omit<ActivityAnalysis, 'generated_at' | 'model_used'>;

interface CachedAnalysis {
  _id?: any;
  stravaId: number;
  analysis: ActivityAnalysis;
  metadata: {
    model: string;
    version: string;
    generated_at: Date;
    generation_time_ms: number;
    tokens_used?: number;
  };
  activity_hash: string;
  last_accessed: Date;
}

interface RateLimiter {
  throttle<T>(fn: () => Promise<T>): Promise<T>;
}

// AI Configuration
const AI_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 400,
  prompt_version: '1.0.0'
};

// Rate limiter implementation
class SimpleRateLimiter implements RateLimiter {
  private lastCall: number = 0;
  private readonly minDelay: number = 1000; // 1 second between calls

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;

    if (timeSinceLastCall < this.minDelay) {
      await this.sleep(this.minDelay - timeSinceLastCall);
    }

    this.lastCall = Date.now();
    return fn();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class AIAnalysisService {
  private client: MongoClient;
  private db: Db;
  private analysesCollection: Collection<CachedAnalysis>;
  private puter: typeof puter;
  private rateLimiter: RateLimiter;

  constructor(mongoUri: string, dbName: string) {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.analysesCollection = this.db.collection('activity_analyses');
    this.puter = puter;
    this.rateLimiter = new SimpleRateLimiter();
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.initializeIndexes();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  private async initializeIndexes(): Promise<void> {
    await this.analysesCollection.createIndex({ stravaId: 1 }, { unique: true });
    await this.analysesCollection.createIndex({ 'metadata.generated_at': -1 });
    await this.analysesCollection.createIndex({ last_accessed: -1 });
    // TTL index for auto-deletion of old analyses (30 days)
    await this.analysesCollection.createIndex(
      { 'metadata.generated_at': 1 },
      { expireAfterSeconds: 30 * 24 * 60 * 60 }
    );
  }

  async generateAnalysis(
    activity: ActivityAnalysisInput,
    sections: AnalysisSection[] = ['performance_summary', 'pace_analysis', 'heart_rate', 'consistency'],
    forceRegenerate: boolean = false
  ): Promise<ActivityAnalysis> {
    const startTime = Date.now();

    // Check cache first unless force regenerate
    if (!forceRegenerate) {
      const cached = await this.getCachedAnalysis(activity.stravaId);
      if (cached && !this.isStale(cached)) {
        // Update last accessed
        await this.analysesCollection.updateOne(
          { stravaId: activity.stravaId },
          { $set: { last_accessed: new Date() } }
        );
        return cached.analysis;
      }
    }

    // Generate new analysis
    const analysis: Partial<ActivityAnalysis> = {
      generated_at: new Date(),
      model_used: AI_CONFIG.model
    };

    // Generate each requested section
    for (const section of sections) {
      try {
        analysis[section] = await this.generateSection(activity, section);
      } catch (error) {
        console.error(`Error generating ${section}:`, error);
        analysis[section] = this.getFallbackContent(section, activity);
      }
    }

    const completeAnalysis = analysis as ActivityAnalysis;
    const generationTime = Date.now() - startTime;

    // Cache the analysis
    await this.cacheAnalysis(activity.stravaId, completeAnalysis, generationTime, this.hashActivity(activity));

    return completeAnalysis;
  }

  private async generateSection(activity: ActivityAnalysisInput, section: AnalysisSection): Promise<string> {
    const prompt = this.generatePrompt(activity, section);

    return this.rateLimiter.throttle(async () => {
      const response = await this.puter.ai.chat({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert running and cycling coach providing detailed workout analysis. Be encouraging but honest. Focus on patterns, improvements, and coaching advice.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.max_tokens
      });

      return response.choices[0].message.content || this.getFallbackContent(section, activity);
    });
  }

  private generatePrompt(activity: ActivityAnalysisInput, section: AnalysisSection): string {
    const baseContext = `
Activity: ${activity.name}
Type: ${activity.type}
Date: ${activity.date.toLocaleDateString()}
Distance: ${(activity.distance / 1000).toFixed(2)}km
Duration: ${this.formatDuration(activity.movingTime)}
Average Pace: ${activity.averagePace}/km
Average HR: ${activity.avgHR} bpm
`;

    const sectionPrompts = {
      performance_summary: `
${baseContext}

Lap splits:
${this.formatLapData(activity.laps)}

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
${this.formatDetailedLapData(activity.laps)}

Pace stream data: ${activity.streams.pace ? 'Available' : 'Not available'}
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
${activity.userProfile?.restingHR ? `- Resting: ${activity.userProfile.restingHR} bpm` : ''}
${activity.userProfile?.maxHR ? `- Estimated Max: ${activity.userProfile.maxHR} bpm` : ''}

HR stream: ${activity.streams.heartrate ? 'Available' : 'Not available'}

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
${this.formatLapData(activity.laps)}

${activity.avgCadence ? `Average Cadence: ${activity.avgCadence} rpm` : ''}

Analyze workout consistency (150-200 words) addressing:
1. Lap-to-lap variation (pace, HR, cadence)
2. Overall consistency score
3. When consistency was best/worst
4. Form maintenance under fatigue
5. Mental discipline indicators

Calculate specific variation metrics and highlight the most consistent segments.
`
    };

    return sectionPrompts[section];
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private formatLapData(laps: ActivityAnalysisInput['laps']): string {
    return laps.map((lap, index) =>
      `Km ${index + 1}: ${this.formatDuration(lap.elapsedTime)} (${lap.averageSpeed}/km, ${lap.averageHeartrate} bpm)`
    ).join('\n');
  }

  private formatDetailedLapData(laps: ActivityAnalysisInput['laps']): string {
    return laps.map((lap, index) =>
      `Km ${index + 1}: ${lap.distance.toFixed(0)}m in ${this.formatDuration(lap.elapsedTime)} - Pace: ${lap.averageSpeed}/km, HR: ${lap.averageHeartrate} bpm${lap.averageCadence ? `, Cadence: ${lap.averageCadence} rpm` : ''}`
    ).join('\n');
  }

  private getFallbackContent(section: AnalysisSection, activity: ActivityAnalysisInput): string {
    const fallbacks = {
      performance_summary: `You completed ${(activity.distance / 1000).toFixed(2)}km in ${this.formatDuration(activity.movingTime)} with an average pace of ${activity.averagePace}/km. This represents a solid effort for a ${activity.type.toLowerCase()} workout.`,

      pace_analysis: `Your average pace was ${activity.averagePace}/km across ${(activity.distance / 1000).toFixed(1)}km. ${this.calculateBasicPaceAnalysis(activity)}`,

      heart_rate: `Average heart rate was ${activity.avgHR} bpm with a maximum of ${activity.maxHR} bpm during this effort. This indicates a ${activity.avgHR > 160 ? 'high-intensity' : activity.avgHR > 140 ? 'moderate' : 'lower-intensity'} workout.`,

      consistency: `You maintained a relatively ${this.calculateBasicConsistency(activity)} effort throughout this workout. ${activity.avgCadence ? `Average cadence was ${activity.avgCadence} rpm.` : ''}`
    };
    return fallbacks[section];
  }

  private calculateBasicPaceAnalysis(activity: ActivityAnalysisInput): string {
    if (activity.laps.length < 2) return 'Pace analysis requires more lap data.';

    const paces = activity.laps.map(lap => parseFloat(lap.averageSpeed));
    const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
    const variation = Math.sqrt(paces.reduce((sum, pace) => sum + Math.pow(pace - avgPace, 2), 0) / paces.length);

    if (variation < 0.1) return 'Your pacing was remarkably consistent throughout.';
    if (variation < 0.3) return 'Your pacing showed moderate consistency.';
    return 'Your pacing varied significantly across the workout.';
  }

  private calculateBasicConsistency(activity: ActivityAnalysisInput): string {
    const hrVariation = activity.laps.length > 1 ?
      this.calculateVariation(activity.laps.map(l => l.averageHeartrate)) : 0;

    if (hrVariation < 5) return 'consistent';
    if (hrVariation < 15) return 'moderately consistent';
    return 'variable';
  }

  private calculateVariation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private async getCachedAnalysis(stravaId: number): Promise<CachedAnalysis | null> {
    return await this.analysesCollection.findOne({ stravaId });
  }

  private async cacheAnalysis(
    stravaId: number,
    analysis: ActivityAnalysis,
    generationTimeMs: number,
    activityHash: string
  ): Promise<void> {
    await this.analysesCollection.updateOne(
      { stravaId },
      {
        $set: {
          analysis,
          metadata: {
            model: AI_CONFIG.model,
            version: AI_CONFIG.prompt_version,
            generated_at: new Date(),
            generation_time_ms: generationTimeMs
          },
          activity_hash: activityHash,
          last_accessed: new Date()
        }
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

  private hashActivity(activity: ActivityAnalysisInput): string {
    const relevantData = {
      distance: activity.distance,
      movingTime: activity.movingTime,
      avgHR: activity.avgHR,
      avgPace: activity.averagePace,
      laps: activity.laps.length
    };
    return require('crypto').createHash('md5').update(JSON.stringify(relevantData)).digest('hex');
  }

  async getAnalysis(stravaId: number): Promise<ActivityAnalysis | null> {
    const cached = await this.getCachedAnalysis(stravaId);
    if (cached) {
      // Update last accessed
      await this.analysesCollection.updateOne(
        { stravaId },
        { $set: { last_accessed: new Date() } }
      );
      return cached.analysis;
    }
    return null;
  }

  async deleteAnalysis(stravaId: number): Promise<boolean> {
    const result = await this.analysesCollection.deleteOne({ stravaId });
    return result.deletedCount > 0;
  }

  async getAnalysisStats(): Promise<{
    totalAnalyses: number;
    averageGenerationTime: number;
    oldestAnalysis: Date | null;
    newestAnalysis: Date | null;
  }> {
    const stats = await this.analysesCollection.aggregate([
      {
        $group: {
          _id: null,
          totalAnalyses: { $sum: 1 },
          averageGenerationTime: { $avg: '$metadata.generation_time_ms' },
          oldestAnalysis: { $min: '$metadata.generated_at' },
          newestAnalysis: { $max: '$metadata.generated_at' }
        }
      }
    ]).toArray();

    if (stats.length === 0) {
      return {
        totalAnalyses: 0,
        averageGenerationTime: 0,
        oldestAnalysis: null,
        newestAnalysis: null
      };
    }

    return stats[0] as {
      totalAnalyses: number;
      averageGenerationTime: number;
      oldestAnalysis: Date | null;
      newestAnalysis: Date | null;
    };
  }
}

// Export singleton instance
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

export const aiAnalysisService = new AIAnalysisService(mongoUri, dbName);
