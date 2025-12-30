import { Db } from 'mongodb';
import { getDb } from '../mongodb';

export interface Migration {
    name: string;
    up: (db: Db) => Promise<void>;
}

interface MigrationDocument {
    name: string;
    appliedAt: Date;
}

const MIGRATIONS_COLLECTION = '_migrations';

export async function runMigrations(migrations: Migration[]): Promise<{
    applied: string[];
    skipped: string[];
}> {
    const db = await getDb();
    const migrationsCollection = db.collection<MigrationDocument>(MIGRATIONS_COLLECTION);

    // Ensure migrations collection has an index on name
    await migrationsCollection.createIndex({ name: 1 }, { unique: true });

    const appliedMigrations = await migrationsCollection.find({}).toArray();
    const appliedNames = new Set(appliedMigrations.map((m) => m.name));

    const applied: string[] = [];
    const skipped: string[] = [];

    for (const migration of migrations) {
        if (appliedNames.has(migration.name)) {
            skipped.push(migration.name);
            continue;
        }

        console.log(`Running migration: ${migration.name}`);
        try {
            await migration.up(db);
            await migrationsCollection.insertOne({
                name: migration.name,
                appliedAt: new Date(),
            });
            applied.push(migration.name);
            console.log(`Migration applied: ${migration.name}`);
        } catch (error) {
            console.error(`Migration failed: ${migration.name}`, error);
            throw error;
        }
    }

    return { applied, skipped };
}

export async function getMigrationStatus(): Promise<MigrationDocument[]> {
    const db = await getDb();
    const migrationsCollection = db.collection<MigrationDocument>(MIGRATIONS_COLLECTION);
    return migrationsCollection.find({}).sort({ appliedAt: 1 }).toArray();
}
