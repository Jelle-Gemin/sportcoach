import { MongoClient } from 'mongodb';
import { StravaSync } from '../../services/stravaSync';

// Mock MongoDB
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    close: jest.fn(),
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        createIndex: jest.fn(),
        findOne: jest.fn(),
        updateOne: jest.fn(),
        countDocuments: jest.fn(),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          toArray: jest.fn(),
        }),
      }),
    }),
  })),
}));

// Mock stravaApi
jest.mock('../../services/stravaApi', () => ({
  fetchActivities: jest.fn(),
  fetchActivityDetail: jest.fn(),
  fetchActivityStreams: jest.fn(),
  RateLimitError: jest.fn().mockImplementation((message, retryAfter) => {
    const error = new Error(message);
    error.name = 'RateLimitError';
    (error as any).retryAfter = retryAfter;
    return error;
  }),
}));

import { fetchActivities, fetchActivityDetail, fetchActivityStreams, RateLimitError } from '../../services/stravaApi';

const mockFetchActivities = fetchActivities as jest.MockedFunction<typeof fetchActivities>;
const mockFetchActivityDetail = fetchActivityDetail as jest.MockedFunction<typeof fetchActivityDetail>;
const mockFetchActivityStreams = fetchActivityStreams as jest.MockedFunction<typeof fetchActivityStreams>;

describe('StravaSync', () => {
  let stravaSync: StravaSync;
  let mockClient: any;
  let mockActivitiesCollection: any;
  let mockSyncMetadataCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      connect: jest.fn(),
      close: jest.fn(),
      db: jest.fn().mockReturnValue({
        collection: jest.fn(),
      }),
    };

    mockActivitiesCollection = {
      createIndex: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn(),
      }),
    };

    mockSyncMetadataCollection = {
      createIndex: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };

    (MongoClient as jest.Mock).mockImplementation(() => mockClient);
    mockClient.db.mockReturnValue({
      collection: jest.fn()
        .mockReturnValueOnce(mockActivitiesCollection)
        .mockReturnValueOnce(mockSyncMetadataCollection),
    });

    stravaSync = new StravaSync('mongodb://test', 'testdb');
  });

  describe('connect', () => {
    it('should connect to MongoDB', async () => {
      await stravaSync.connect();
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from MongoDB', async () => {
      await stravaSync.disconnect();
      expect(mockClient.close).toHaveBeenCalled();
    });
  });

  describe('initializeIndexes', () => {
    it('should create required indexes', async () => {
      await stravaSync.initializeIndexes();

      expect(mockActivitiesCollection.createIndex).toHaveBeenCalledWith(
        { stravaId: 1 },
        { unique: true }
      );
      expect(mockActivitiesCollection.createIndex).toHaveBeenCalledWith({ date: -1 });
      expect(mockActivitiesCollection.createIndex).toHaveBeenCalledWith({ type: 1 });
      expect(mockSyncMetadataCollection.createIndex).toHaveBeenCalledWith(
        { type: 1 },
        { unique: true }
      );
    });
  });

  describe('shouldFetchActivity', () => {
    beforeEach(async () => {
      await stravaSync.connect();
    });

    it('should return false for activities older than 24 hours', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      mockActivitiesCollection.findOne.mockResolvedValue({
        stravaId: 123,
        fetchedAt: oldDate,
      });

      const result = await (stravaSync as any).shouldFetchActivity(123);
      expect(result).toBe(false);
    });

    it('should return true for recent activities', async () => {
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      mockActivitiesCollection.findOne.mockResolvedValue({
        stravaId: 123,
        fetchedAt: recentDate,
      });

      const result = await (stravaSync as any).shouldFetchActivity(123);
      expect(result).toBe(true);
    });

    it('should return true for new activities', async () => {
      mockActivitiesCollection.findOne.mockResolvedValue(null);
      mockSyncMetadataCollection.findOne.mockResolvedValue({
        fetchedActivityIds: [456],
      });

      const result = await (stravaSync as any).shouldFetchActivity(123);
      expect(result).toBe(true);
    });

    it('should return false for previously fetched activities', async () => {
      mockActivitiesCollection.findOne.mockResolvedValue(null);
      mockSyncMetadataCollection.findOne.mockResolvedValue({
        fetchedActivityIds: [123],
      });

      const result = await (stravaSync as any).shouldFetchActivity(123);
      expect(result).toBe(false);
    });
  });

  describe('mapStravaToMongo', () => {
    it('should map Strava activity to MongoDB document', () => {
      const stravaActivity = {
        id: 123,
        name: 'Morning Run',
        start_date_local: '2023-01-01T08:00:00Z',
        type: 'Run',
        average_speed: 4.0, // m/s
        max_speed: 5.0,
        moving_time: 1800,
        elapsed_time: 1850,
        average_cadence: 180,
        average_heartrate: 150,
        max_heartrate: 170,
        description: 'Great run!',
        laps: [],
      };

      const streams = {
        time: [0, 10, 20],
        heartrate: [120, 140, 160],
      };

      const result = (stravaSync as any).mapStravaToMongo(stravaActivity, streams);

      expect(result.stravaId).toBe(123);
      expect(result.description).toBe('Great run!');
      expect(result.type).toBe('Run');
      expect(result.averagePace).toBe('04:10'); // 4 m/s = 4:10 min/km
      expect(result.movingTime).toBe(1800);
      expect(result.streams).toEqual(streams);
    });
  });

  describe('calculatePace', () => {
    it('should calculate pace correctly', () => {
      // 4 m/s = 1000m / (4 * 60) = 4.166 min/km ≈ 4:10 min/km
      const result = (stravaSync as any).calculatePace(4.0);
      expect(result).toBe('04:10');
    });

    it('should handle zero speed', () => {
      const result = (stravaSync as any).calculatePace(0);
      expect(result).toBe('00:00');
    });
  });

  describe('getActivities', () => {
    beforeEach(async () => {
      await stravaSync.connect();
    });

    it('should return activities with pagination', async () => {
      const mockActivities = [
        { stravaId: 1, type: 'Run' },
        { stravaId: 2, type: 'Ride' },
      ];

      mockActivitiesCollection.countDocuments.mockResolvedValue(2);
      mockActivitiesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockActivities),
      });

      const result = await stravaSync.getActivities(10, 0);

      expect(result.activities).toEqual(mockActivities);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by type', async () => {
      mockActivitiesCollection.countDocuments.mockResolvedValue(1);
      mockActivitiesCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([{ stravaId: 1, type: 'Run' }]),
      });

      await stravaSync.getActivities(10, 0, 'Run');

      expect(mockActivitiesCollection.countDocuments).toHaveBeenCalledWith({ type: 'Run' });
    });
  });

  describe('getActivity', () => {
    beforeEach(async () => {
      await stravaSync.connect();
    });

    it('should return activity by stravaId', async () => {
      const mockActivity = { stravaId: 123, type: 'Run' };
      mockActivitiesCollection.findOne.mockResolvedValue(mockActivity);

      const result = await stravaSync.getActivity(123);

      expect(result).toEqual(mockActivity);
      expect(mockActivitiesCollection.findOne).toHaveBeenCalledWith({ stravaId: 123 });
    });
  });

  describe('getSyncStatus', () => {
    beforeEach(async () => {
      await stravaSync.connect();
    });

    it('should return sync status', async () => {
      const mockMetadata = {
        lastSyncDate: new Date(),
        syncStatus: 'idle',
        fetchedActivityIds: [1, 2, 3],
      };

      mockSyncMetadataCollection.findOne.mockResolvedValue(mockMetadata);
      mockActivitiesCollection.countDocuments.mockResolvedValue(3);

      const result = await stravaSync.getSyncStatus();

      expect(result).toEqual({
        lastSync: mockMetadata.lastSyncDate,
        status: 'idle',
        totalCached: 3,
        fetchedActivityIds: [1, 2, 3],
      });
    });
  });
});
