// Export all migrations in order
export { performanceIndexesMigration } from './001_performance_indexes';
export { runMigrations, getMigrationStatus, type Migration } from './runner';

import { performanceIndexesMigration } from './001_performance_indexes';
import { runMigrations } from './runner';

// All migrations in order of application
export const allMigrations = [
    performanceIndexesMigration,
];

// Convenience function to run all migrations
export async function runAllMigrations() {
    return runMigrations(allMigrations);
}
