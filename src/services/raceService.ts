import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import {
  Race,
  CreateRaceInput,
  UpdateRaceInput,
  EstimatedTimeParams,
  Activity,
  RACE_TYPES,
  AnalysisData
} from '@/types/race';



export class RaceService {
  private client: MongoClient;
  private db: Db;
  private racesCollection: Collection<Race>;

  constructor(mongoUri: string, dbName: string) {
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db(dbName);
    this.racesCollection = this.db.collection('races');
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async initializeIndexes(): Promise<void> {
    await this.racesCollection.createIndex({ userId: 1, raceDate: 1 });
    await this.racesCollection.createIndex({ userId: 1, status: 1 });
    await this.racesCollection.createIndex({ userId: 1, raceDate: 1, postRacePopupShown: 1 });
  }

  async createRace(userId: number, input: CreateRaceInput): Promise<Race> {
    const estimatedTime = await this.calculateEstimatedTime({
      raceType: input.raceType,
      userId,
      targetDate: new Date(input.raceDate)
    });

    const race: Omit<Race, '_id'> = {
      userId,
      raceName: input.raceName,
      raceType: input.raceType,
      raceDate: new Date(input.raceDate),
      location: input.location,
      goalTime: input.goalTime,
      estimatedTime,
      status: 'planned',
      postRacePopupShown: false,
      isTargetRace: input.isTargetRace || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await this.racesCollection.insertOne(race as Race);
    return { ...race, _id: result.insertedId };
  }

  async getRaces(userId: number, status?: string, includeEstimates: boolean = false): Promise<Race[]> {
    const query: any = { userId };

    if (status) {
      query.status = status;
    }

    const races = await this.racesCollection.find(query).sort({ raceDate: 1 }).toArray();

    // Ensure raceDate is a Date object
    races.forEach(race => {
      console.log("Looped over race with id: ", race._id)
      if (!(race.raceDate instanceof Date)) {
        race.raceDate = new Date(race.raceDate);
      }
    });

    if (includeEstimates) {
      // Recalculate estimates for planned races
      for (const race of races) {
        if (race.status === 'planned') {
          race.estimatedTime = await this.calculateEstimatedTime({
            raceType: race.raceType,
            userId,
            targetDate: race.raceDate
          });
        }
      }
    }

    return races;
  }

  async getRace(userId: number, raceId: string): Promise<Race | null> {
    try {
      const race = await this.racesCollection.findOne({
        _id: new ObjectId(raceId),
        userId
      });
      return race || null;
    } catch (error) {
      return null;
    }
  }

  async updateRace(userId: number, raceId: string, updates: UpdateRaceInput): Promise<Race | null> {
    try {
      const updateData: any = { ...updates, updatedAt: new Date() };

      // Recalculate estimated time if race type or date changed
      if (updates.raceType || updates.raceDate) {
        const existingRace = await this.getRace(userId, raceId);
        if (existingRace) {
          const raceType = updates.raceType || existingRace.raceType;
          const raceDate = updates.raceDate ? new Date(updates.raceDate) : existingRace.raceDate;

          updateData.estimatedTime = await this.calculateEstimatedTime({
            raceType,
            userId: userId,
            targetDate: raceDate
          });
        }
      }

      const result = await this.racesCollection.findOneAndUpdate(
        { _id: new ObjectId(raceId), userId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      return result || null;
    } catch (error) {
      return null;
    }
  }

  async deleteRace(userId: number, raceId: string): Promise<boolean> {
    try {
      const result = await this.racesCollection.deleteOne({
        _id: new ObjectId(raceId),
        userId
      });
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async completeRace(userId: number, raceId: string, actualFinishTime: number): Promise<Race | null> {
    try {
      const result = await this.racesCollection.findOneAndUpdate(
        { _id: new ObjectId(raceId), userId, status: 'planned' },
        {
          $set: {
            status: 'completed',
            actualFinishTime,
            completedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      return result || null;
    } catch (error) {
      return null;
    }
  }

  async skipRace(userId: number, raceId: string, skipReason?: string): Promise<Race | null> {
    try {
      const result = await this.racesCollection.findOneAndUpdate(
        { _id: new ObjectId(raceId), userId, status: 'planned' },
        {
          $set: {
            status: 'skipped',
            skipReason,
            skippedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      return result || null;
    } catch (error) {
      return null;
    }
  }

  async checkPostRacePopup(userId: number): Promise<Race | null> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find planned races where:
    // - Race date has passed
    // - Race date is within last 7 days
    // - Popup hasn't been shown yet
    const race = await this.racesCollection.findOne({
      userId,
      status: 'planned',
      raceDate: {
        $lt: now,
        $gte: sevenDaysAgo,
      },
      postRacePopupShown: false,
    });

    return race;
  }

  async dismissPostRacePopup(userId: number, raceId: string): Promise<boolean> {
    try {
      const result = await this.racesCollection.updateOne(
        { _id: new ObjectId(raceId), userId },
        {
          $set: {
            postRacePopupShown: true,
            postRacePopupShownAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async calculateEstimatedTime(params: EstimatedTimeParams): Promise<number> {
    const { raceType, userId, targetDate } = params;

    // Get user's recent activities (last 90 days for better analysis)
    const recentActivities = await this.getRecentActivities(userId, 90);

    // Prepare data for AI analysis
    const analysisData = this.prepareAnalysisData(recentActivities, RACE_TYPES[raceType as keyof typeof RACE_TYPES], targetDate);

    // Use AI to generate realistic estimate
    const aiEstimate = await this.getAIEstimate(analysisData);

    return aiEstimate;
  }

  private async getRecentActivities(userId: number, days: number): Promise<Activity[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Import the stravaSync service to get activities
    const { StravaSync } = await import('./stravaSync');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB_NAME || 'strava_data';

    const stravaSync = new StravaSync(mongoUri, dbName);
    await stravaSync.connect();

    try {
      const result = await stravaSync.getActivities(Number(userId), 200, 0, undefined, cutoffDate);
      return result.activities.map(activity => this.mapActivityToInterface(activity));
    } finally {
      await stravaSync.disconnect();
    }
  }

  private mapActivityToInterface(activity: any): Activity {
    return {
      id: activity.stravaId,
      type: activity.type,
      distance: activity.distance || 0,
      movingTime: activity.movingTime || 0,
      startDate: activity.date.toISOString(),
      averageSpeed: activity.average_speed,
      hasHeartrate: !!(activity.avgHR || activity.maxHR),
      averageHeartrate: activity.avgHR,
      maxHeartrate: activity.maxHR,
      totalElevationGain: activity.total_elevation_gain
    };
  }

  private prepareAnalysisData(activities: Activity[], raceConfig: any, targetDate: Date) {
    // Calculate time until race
    const daysUntilRace = Math.floor((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Get sport-specific activities
    const relevantActivities = activities.filter((a) => {
      if (raceConfig.sport === "run") return a.type === "Run";
      if (raceConfig.sport === "ride") return a.type === "Ride" || a.type === "VirtualRide";
      if (raceConfig.sport === "triathlon") return ["Run", "Ride", "VirtualRide", "Swim"].includes(a.type);
      return false;
    });

    // Calculate training metrics
    const metrics = {
      // Volume metrics
      totalDistance: relevantActivities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000, // km
      totalTime: relevantActivities.reduce((sum, a) => sum + a.movingTime, 0) / 3600, // hours
      averageWeeklyDistance: this.calculateWeeklyAverage(relevantActivities, "distance"),

      // Pace/speed metrics
      averagePace: this.calculateAveragePace(relevantActivities.filter((a) => a.type === "Run")),
      bestRecentPace: this.getBestPace(relevantActivities.filter((a) => a.type === "Run"), 30),

      // Consistency metrics
      activitiesCount: relevantActivities.length,
      averageActivitiesPerWeek: relevantActivities.length / 12, // last ~90 days = ~12 weeks

      // Performance metrics
      longestDistance: Math.max(...relevantActivities.map((a) => (a.distance || 0) / 1000)),
      recentPRs: this.findRecentPRs(relevantActivities),

      // Heart rate metrics (if available)
      averageHR: this.calculateAverageHR(relevantActivities),
      hrTrend: this.calculateHRTrend(relevantActivities),
    };

    return {
      raceType: raceConfig,
      daysUntilRace,
      trainingMetrics: metrics,
      activityCount: relevantActivities.length,
    };
  }

  private async getAIEstimate(data: any): Promise<number> {
    const prompt = `You are an expert running and triathlon coach. Analyze this athlete's training data and provide a realistic race time estimate.

Race Details:
- Type: ${data.raceType.sport === "run" ? `${data.raceType.distance}km run` : data.raceType.sport}
- Days until race: ${data.daysUntilRace}

Athlete's Training Data (last 90 days):
- Total distance: ${data.trainingMetrics.totalDistance.toFixed(1)}km
- Total training time: ${data.trainingMetrics.totalTime.toFixed(1)} hours
- Weekly average distance: ${data.trainingMetrics.averageWeeklyDistance.toFixed(1)}km
- Average pace: ${data.trainingMetrics.averagePace || "N/A"}
- Best recent pace (30 days): ${data.trainingMetrics.bestRecentPace || "N/A"}
- Longest single distance: ${data.trainingMetrics.longestDistance.toFixed(1)}km
- Activities per week: ${data.trainingMetrics.averageActivitiesPerWeek.toFixed(1)}
- Activity count: ${data.activityCount}

Provide ONLY a realistic finish time estimate in seconds as a single integer. Consider:
1. Current fitness level based on recent training
2. Time available for additional training before race
3. Race day performance typically being 3-5% better than training
4. Proper pacing strategy for the distance
5. Whether they have adequate training volume for this race

Response format: Just the number of seconds (e.g., "12600" for 3:30:00) DO NOT INCLUDE ANY OTHER TEXT`;

    console.log("Prompt for: " + prompt)

    try {
      const response = await fetch("http://localhost:12434/engines/llama.cpp/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "ai/qwen3:4B-UD-Q4_K_XL",
          "prompt": prompt,
          "max_tokens": 20,
        })
      });
      const result = await response.json();
      const estimateText = result.choices[0].text.trim();
      const estimateSeconds = parseInt(estimateText);

      // Validate the estimate is reasonable
      if (isNaN(estimateSeconds) || estimateSeconds < 0 || estimateSeconds > 86400) {
        // Fallback to calculation-based estimate
        console.warn("AI estimate invalid, using fallback calculation");
        return this.fallbackEstimate(data);
      }

      return estimateSeconds;
    } catch (error) {
      console.error("AI estimate failed, using fallback:", error);
      return this.fallbackEstimate(data);
    }
  }

  private fallbackEstimate(data: any): number {
    const { raceType, trainingMetrics } = data;

    if (raceType.sport === "run") {
      // Use simple pace extrapolation
      const avgPaceSecondsPerKm = this.parsePace(trainingMetrics.averagePace);
      const raceDayFactor = 0.97; // Assume 3% improvement on race day
      return Math.round(avgPaceSecondsPerKm * raceType.distance * raceDayFactor);
    }

    // For other sports, provide conservative estimates
    return this.getConservativeEstimate(raceType.sport, raceType.distance);
  }

  private calculateWeeklyAverage(activities: Activity[], metric: string): number {
    if (activities.length === 0) return 0;
    const total = activities.reduce((sum, a) => sum + (a[metric as keyof Activity] as number || 0), 0);
    return total / 12; // 12 weeks in 90 days
  }

  private calculateAveragePace(runs: Activity[]): string {
    if (runs.length === 0) return "";
    const totalTime = runs.reduce((sum, r) => sum + r.movingTime, 0);
    const totalDistance = runs.reduce((sum, r) => sum + (r.distance || 0), 0) / 1000; // km
    const avgPaceSecondsPerKm = totalTime / totalDistance;
    const minutes = Math.floor(avgPaceSecondsPerKm / 60);
    const seconds = Math.round(avgPaceSecondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private getBestPace(runs: Activity[], days: number): string {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentRuns = runs.filter(r => new Date(r.startDate) > cutoff);

    if (recentRuns.length === 0) return "";

    const bestPace = Math.min(...recentRuns.map(r => {
      const distanceKm = (r.distance || 0) / 1000;
      return r.movingTime / distanceKm;
    }));

    const minutes = Math.floor(bestPace / 60);
    const seconds = Math.round(bestPace % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private findRecentPRs(activities: Activity[]): any[] {
    // Simple PR detection - could be enhanced
    return [];
  }

  private calculateAverageHR(activities: Activity[]): number {
    const withHR = activities.filter(a => a.hasHeartrate && a.averageHeartrate);
    if (withHR.length === 0) return 0;
    return withHR.reduce((sum, a) => sum + (a.averageHeartrate || 0), 0) / withHR.length;
  }

  private calculateHRTrend(activities: Activity[]): string {
    // Simple trend calculation - could be enhanced
    return "stable";
  }

  private parsePace(paceString: string): number {
    if (!paceString) return 360; // Default 6:00/km
    const [min, sec] = paceString.split(":").map(Number);
    return min * 60 + sec;
  }

  private estimateRunTime(activities: Activity[], distanceKm: number): number {
    // Filter running activities
    const runs = activities.filter((a) => a.type === "Run");

    if (runs.length === 0) {
      // No data, return conservative estimate
      return this.getConservativeEstimate("run", distanceKm);
    }

    // Calculate average pace from recent runs
    const totalDistance = runs.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalTime = runs.reduce((sum, r) => sum + r.movingTime, 0);
    const avgPaceSecondsPerKm = totalTime / (totalDistance / 1000);

    // Apply race day factor (people usually run faster in races)
    const raceDayFactor = 0.95; // 5% faster
    const estimatedPace = avgPaceSecondsPerKm * raceDayFactor;

    // Calculate estimated time for race distance
    return Math.round(estimatedPace * distanceKm);
  }

  private estimateTriathlonTime(activities: Activity[], config: any): number {
    // Get activities by sport type
    const swims = activities.filter((a) => a.type === "Swim");
    const bikes = activities.filter(
      (a) => a.type === "Ride" || a.type === "VirtualRide"
    );
    const runs = activities.filter((a) => a.type === "Run");

    // Calculate estimates for each leg
    const swimTime = this.estimateSwimTime(swims, config.swim);
    const bikeTime = this.estimateRideTime(bikes, config.bike);
    const runTime = this.estimateRunTime(runs, config.run);

    // Add transition times (estimates)
    const t1 = 180; // 3 minutes
    const t2 = 120; // 2 minutes

    return swimTime + t1 + bikeTime + t2 + runTime;
  }

  private estimateRideTime(activities: Activity[], distanceKm: number): number {
    const rides = activities.filter((a) => a.type === "Ride" || a.type === "VirtualRide");

    if (rides.length === 0) {
      return this.getConservativeEstimate("ride", distanceKm);
    }

    // Calculate average speed from recent rides
    const totalDistance = rides.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalTime = rides.reduce((sum, r) => sum + r.movingTime, 0);
    const avgSpeedMps = totalDistance / totalTime; // meters per second

    // Apply race day factor
    const raceDayFactor = 0.98; // 2% faster for cycling races
    const estimatedSpeed = avgSpeedMps * raceDayFactor;

    return Math.round(distanceKm * 1000 / estimatedSpeed);
  }

  private estimateSwimTime(activities: Activity[], distanceKm: number): number {
    const swims = activities.filter((a) => a.type === "Swim");

    if (swims.length === 0) {
      return this.getConservativeEstimate("swim", distanceKm);
    }

    // Calculate average pace from recent swims (seconds per 100m)
    const totalDistance = swims.reduce((sum, s) => sum + (s.distance || 0), 0);
    const totalTime = swims.reduce((sum, s) => sum + s.movingTime, 0);
    const avgPaceSecondsPer100m = (totalTime / (totalDistance / 100)) * 100;

    // Apply race day factor
    const raceDayFactor = 0.96; // 4% faster for swim races
    const estimatedPace = avgPaceSecondsPer100m * raceDayFactor;

    return Math.round(estimatedPace * (distanceKm * 10)); // distanceKm * 10 = number of 100m units
  }

  private getConservativeEstimate(sport: string, distance: number): number {
    const conservativePaces = {
      run: 300, // 5:00/km (conservative for untrained)
      ride: 8.33, // 12 km/h (conservative)
      swim: 120 // 2:00/100m (conservative)
    };

    const pace = conservativePaces[sport as keyof typeof conservativePaces] || 300;

    if (sport === "run" || sport === "ride") {
      return Math.round(distance * pace);
    } else if (sport === "swim") {
      return Math.round(distance * 10 * pace); // distance in km * 10 * pace per 100m
    }

    return 7200; // Default 2 hours
  }
}
