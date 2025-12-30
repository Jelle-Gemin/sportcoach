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
import { getCollection } from '@/lib/mongodb';
import { getCached } from '../../lib/cache';

export class RaceService {
  private client?: MongoClient;
  private db?: Db;
  private racesCollection?: Collection<Race>;

  constructor(mongoUri?: string, dbName?: string) {
    // For backward compatibility, but prefer using shared connection
    if (mongoUri && dbName) {
      this.client = new MongoClient(mongoUri);
      this.db = this.client.db(dbName);
      this.racesCollection = this.db.collection('races');
    }
  }

  async connect(): Promise<void> {
    if (this.client) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  private async getRacesCollection(): Promise<Collection<Race>> {
    if (this.racesCollection) {
      return this.racesCollection;
    }
    return getCollection('races') as unknown as Collection<Race>;
  }

  async initializeIndexes(): Promise<void> {
    const collection = await this.getRacesCollection();
    await collection.createIndex({ userId: 1, raceDate: 1 });
    await collection.createIndex({ userId: 1, status: 1 });
    await collection.createIndex({ userId: 1, raceDate: 1, postRacePopupShown: 1 });
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

    const collection = await this.getRacesCollection();
    const result = await collection.insertOne(race as Race);
    return { ...race, _id: result.insertedId };
  }

  async getRaces(userId: number, status?: string, includeEstimates: boolean = false): Promise<Race[]> {
    const query: any = { userId };

    if (status) {
      query.status = status;
    }

    const racesCollection = await this.getRacesCollection();
    const races = await racesCollection.find(query).sort({ raceDate: 1 }).toArray();

    // Ensure raceDate is a Date object
    races.forEach(race => {
      if (!(race.raceDate instanceof Date)) {
        race.raceDate = new Date(race.raceDate);
      }
    });

    if (includeEstimates) {
      // Batch fetch activities once for all planned races
      const plannedRaces = races.filter(r => r.status === 'planned');
      if (plannedRaces.length > 0) {
        const activities = await getCached(
          `activities:${userId}:90days`,
          () => this.getRecentActivities(userId, 90),
          300 // 5 minutes cache
        );

        // Parallelize AI estimate calculations
        const estimatePromises = plannedRaces.map(race =>
          this.calculateEstimatedTimeCached({
            raceType: race.raceType,
            userId,
            targetDate: race.raceDate,
            activities: activities,
            metrics: {} // No metrics since calculations moved elsewhere
          })
        );

        const estimates = await Promise.all(estimatePromises);

        // Assign estimates back to races
        plannedRaces.forEach((race, index) => {
          race.estimatedTime = estimates[index];
        });
      }
    }

    return races;
  }

  async getRace(userId: number, raceId: string): Promise<Race | null> {
    try {
      const collection = await this.getRacesCollection();
      const race = await collection.findOne({
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

      const collection = await this.getRacesCollection();
      const result = await collection.findOneAndUpdate(
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
      const collection = await this.getRacesCollection();
      const result = await collection.deleteOne({
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
      const collection = await this.getRacesCollection();
      const result = await collection.findOneAndUpdate(
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
      const collection = await this.getRacesCollection();
      const result = await collection.findOneAndUpdate(
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
    const collection = await this.getRacesCollection();
    const race = await collection.findOne({
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
      const collection = await this.getRacesCollection();
      const result = await collection.updateOne(
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

    // Get user's recent activities (last 30 days for better analysis)
    const activities = await this.getRecentActivities(userId, 30);

    // Prepare data for AI analysis
    const analysisData = this.prepareAnalysisData(activities, RACE_TYPES[raceType as keyof typeof RACE_TYPES], targetDate);

    // Use AI to generate realistic estimate
    const aiEstimate = await this.getAIEstimate(analysisData);

    return aiEstimate;
  }

  private async calculateEstimatedTimeCached(params: EstimatedTimeParams & { activities: Activity[], metrics: any }): Promise<number> {
    const { raceType, targetDate, activities, metrics } = params;

    // Prepare data for AI analysis using pre-fetched activities
    const analysisData = this.prepareAnalysisData(activities, RACE_TYPES[raceType as keyof typeof RACE_TYPES], targetDate);

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
      const projection = {
        stravaId: 1,
        type: 1,
        distance: 1,
        moving_time: 1,
        start_date_local: 1,
        average_speed: 1,
        has_heartrate: 1,
        average_heartrate: 1,
        max_heartrate: 1,
        total_elevation_gain: 1,
        laps: 1,
        avgCadence: 1
      };

      const result = await stravaSync.getActivities(userId, 0, 0, undefined, cutoffDate, undefined, projection);
      return result.activities.map(activity => this.mapActivityToInterface(activity));
    } finally {
      await stravaSync.disconnect();
    }
  }

  private mapActivityToInterface(activity: Record<string, any>): Activity {
    return {
      id: activity.stravaId,
      type: activity.type,
      distance: activity.distance || 0,
      movingTime: activity.moving_time || 0,
      startDate: activity.start_date_local,
      averageSpeed: activity.average_speed,
      hasHeartrate: activity.has_heartrate,
      averageHeartrate: activity.average_heartrate,
      maxHeartrate: activity.max_heartrate,
      totalElevationGain: activity.total_elevation_gain,
      laps: activity.laps,
      average_cadence: activity.avgCadence
    };
  }

  private prepareAnalysisData(activities: Activity[], raceConfig: any, targetDate: Date): any[] {
    // Get sport-specific activities
    const relevantActivities = activities.filter((a) => {
      if (raceConfig.sport === "run") return a.type === "Run";
      if (raceConfig.sport === "ride") return a.type === "Ride" || a.type === "VirtualRide";
      if (raceConfig.sport === "triathlon") return ["Run", "Ride", "VirtualRide", "Swim"].includes(a.type);
      return false;
    });

    console.log("Amount of relevant activities", relevantActivities.length)

    // Transform activities to the required format
    return relevantActivities.map(activity => ({
      distance: activity.distance || 0,
      elapsed_time: activity.movingTime || 0,
      average_hr: activity.averageHeartrate || 0,
      laps: activity.laps,
      sport_type: activity.type.toLowerCase(),
      start_date: activity.startDate,
      average_cadence: activity.average_cadence
    }));
  }

  private async getAIEstimate(activities: any[]): Promise<number> {
    const prompt = `You are an expert running and triathlon coach. Analyze this athlete's training data and provide a realistic race time estimate.

Training Data (JSON format):
${JSON.stringify(activities, null, 2)}

Provide ONLY a realistic finish time estimate in seconds as a single integer. Consider:
1. Current fitness level based on recent training
2. Time available for additional training before race
3. Race day performance typically being 3-5% better than training
4. Proper pacing strategy for the distance
5. Whether they have adequate training volume for this race

IMPORTANT: Your response must be ONLY the number of seconds as an integer. Do not include any text, explanations, quotes, or other characters. Just the number (e.g., 12600)`;

    // Write prompt to file for debugging/analysis
    const fs = await import('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-prompt-${timestamp}.txt`;
    fs.writeFileSync(filename, prompt);
    console.log(`Prompt written to file: ${filename}`);
    try {
      const response = await fetch("http://localhost:12434/engines/llama.cpp/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "ai/qwen3:4B-UD-Q4_K_XL",
          "prompt": prompt,
          "max_tokens": 200,
        })
      });
      const result = await response.json();
      const estimateText = result.choices[0].text.trim();
      console.log("EstimatedText: ", estimateText)

      // Extract just the numeric part from the response
      const numericMatch = estimateText.match(/\d+/);
      const estimateSeconds = numericMatch ? parseInt(numericMatch[0]) : NaN;

      // Validate the estimate is reasonable
      if (isNaN(estimateSeconds) || estimateSeconds < 0 || estimateSeconds > 86400) {
        // Fallback to calculation-based estimate
        console.warn("AI estimate invalid, using fallback calculation");
        return this.fallbackEstimate({ activities });
      }

      return estimateSeconds;
    } catch (error) {
      console.error("AI estimate failed, using fallback:", error);
      return this.fallbackEstimate({ activities });
    }
  }

  private fallbackEstimate(data: any): number {
    // For now, return a conservative estimate since we don't have race details in this context
    // This fallback is used when AI fails, but we need race configuration to calculate properly
    return 7200; // 2 hours as default fallback
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
