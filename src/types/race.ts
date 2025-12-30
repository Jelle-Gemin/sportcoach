// Race Types and Interfaces
import { ObjectId } from 'mongodb';

export interface Race {
  _id?: ObjectId;
  userId: number;

  // Race details
  raceName: string;
  raceType: string;
  raceDate: Date;
  location?: string;

  // Goals and estimates
  goalTime: number; // seconds
  estimatedTime: number; // seconds

  // Status tracking
  status: 'planned' | 'completed' | 'skipped';

  // Completion data (only for completed races)
  actualFinishTime?: number; // seconds
  completedAt?: Date;

  // Skip data (only for skipped races)
  skipReason?: string;
  skippedAt?: Date;

  // Post-race popup tracking
  postRacePopupShown: boolean;
  postRacePopupShownAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Training plan integration
  linkedTrainingPlanId?: string;
  isTargetRace: boolean;
}

// API response version with string IDs
export interface RaceResponse extends Omit<Race, '_id' | 'userId'> {
  _id: string;
  userId: number;
}

export interface CreateRaceInput {
  raceName: string;
  raceType: string;
  raceDate: string; // ISO 8601
  location?: string;
  goalTime: number; // seconds
  isTargetRace?: boolean;
}

export interface UpdateRaceInput {
  raceName?: string;
  raceType?: string;
  raceDate?: string;
  location?: string;
  goalTime?: number;
  isTargetRace?: boolean;
}

export interface RaceStats {
  totalPlanned: number;
  totalCompleted: number;
  totalSkipped: number;
  upcomingRace?: Race;
}

export interface RacesResponse {
  races: RaceResponse[];
  stats: RaceStats;
}

export interface RaceWithEstimate extends Race {
  estimatedTime: number;
}

export interface CompleteRaceInput {
  actualFinishTime: number;
}

export interface SkipRaceInput {
  skipReason?: string;
}

export interface RaceComparison {
  goalTime: number;
  actualTime: number;
  difference: number; // positive = beat goal, negative = missed goal
  percentageDifference: number;
}

export interface CompleteRaceResponse {
  success: boolean;
  race: Race;
  comparison: RaceComparison;
}

export interface CheckPostRaceResponse {
  hasPostRacePopup: boolean;
  race?: Race;
}

// Race Type Constants
export const RACE_TYPES = {
  // Running
  "5K": { distance: 5, unit: "km", sport: "run" },
  "10K": { distance: 10, unit: "km", sport: "run" },
  HALF_MARATHON: { distance: 21.0975, unit: "km", sport: "run" },
  MARATHON: { distance: 42.195, unit: "km", sport: "run" },
  ULTRA_50K: { distance: 50, unit: "km", sport: "run" },
  ULTRA_100K: { distance: 100, unit: "km", sport: "run" },

  // Triathlon
  TRIATHLON_SPRINT: {
    swim: 0.75,
    bike: 20,
    run: 5,
    sport: "triathlon",
  },
  TRIATHLON_OLYMPIC: {
    swim: 1.5,
    bike: 40,
    run: 10,
    sport: "triathlon",
  },
  TRIATHLON_HALF: {
    swim: 1.9,
    bike: 90,
    run: 21.0975,
    sport: "triathlon",
  },
  TRIATHLON_FULL: {
    swim: 3.8,
    bike: 180,
    run: 42.195,
    sport: "triathlon",
  },

  // Cycling
  CENTURY_RIDE: { distance: 100, unit: "mi", sport: "ride" },
  GRAN_FONDO: { distance: 120, unit: "km", sport: "ride" },

  // Other
  CUSTOM: { distance: null, unit: null, sport: "custom" },
} as const;

export type RaceType = keyof typeof RACE_TYPES;

// Race Status Types
export type RaceStatus = 'planned' | 'completed' | 'skipped';

// Activity interface for AI estimation (subset of StravaActivity)
export interface Activity {
  id: number;
  type: string;
  distance: number;
  movingTime: number;
  startDate: string;
  averageSpeed?: number;
  hasHeartrate?: boolean;
  averageHeartrate?: number;
  maxHeartrate?: number;
  totalElevationGain?: number;
}

// AI Estimation Parameters
export interface EstimatedTimeParams {
  raceType: string;
  userId: number;
  targetDate: Date;
}

// AI Estimation Data
export interface AnalysisData {
  raceType: any;
  daysUntilRace: number;
  trainingMetrics: {
    totalDistance: number;
    totalTime: number;
    averageWeeklyDistance: number;
    averagePace?: string;
    bestRecentPace?: string;
    activitiesCount: number;
    averageActivitiesPerWeek: number;
    longestDistance: number;
    recentPRs: any[];
    averageHR?: number;
    hrTrend?: number;
  };
  activityCount: number;
}
