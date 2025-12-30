import { Db } from 'mongodb';
import { Migration } from './runner';

export const performanceIndexesMigration: Migration = {
    name: '001_performance_indexes',
    up: async (db: Db) => {
        // Activities collection indexes
        const activities = db.collection('activities');

        // Primary lookup index (unique)
        await activities.createIndex({ stravaId: 1 }, { unique: true, background: true });

        // User activity queries - most common query pattern
        await activities.createIndex({ athleteId: 1, date: -1 }, { background: true });

        // Filtered activity queries by type
        await activities.createIndex({ athleteId: 1, type: 1, date: -1 }, { background: true });

        // Recent activities across all users
        await activities.createIndex({ date: -1 }, { background: true });

        // Activity type filtering
        await activities.createIndex({ type: 1, date: -1 }, { background: true });

        // Sync tracking
        await activities.createIndex({ fetchedAt: 1 }, { background: true });

        // Athletes collection indexes
        const athletes = db.collection('athletes');
        await athletes.createIndex({ stravaId: 1 }, { unique: true, background: true });

        // Sync metadata collection indexes
        const syncMetadata = db.collection('sync_metadata');
        await syncMetadata.createIndex({ type: 1 }, { unique: true, background: true });
        await syncMetadata.createIndex(
            { 'type': 1, 'continuous_sync_status': 1 },
            { background: true }
        );

        // Races collection indexes
        const races = db.collection('races');
        await races.createIndex({ athleteId: 1, status: 1 }, { background: true });
        await races.createIndex({ athleteId: 1, date: -1 }, { background: true });

        console.log('Performance indexes created successfully');
    },
};
