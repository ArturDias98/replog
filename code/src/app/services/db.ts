import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WorkOutGroup } from '../models/workout-group';

interface RepLogDB extends DBSchema {
    data: {
        key: string;
        value: {
            id: string;
            workouts: WorkOutGroup[];
        };
    };
}

const DB_NAME = 'replog-db';
const DB_VERSION = 1;

export const DATA_RECORD_KEY = 'workouts';

let dbPromise: Promise<IDBPDatabase<RepLogDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<RepLogDB>> {
    if (!dbPromise) {
        dbPromise = openDB<RepLogDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                db.createObjectStore('data', { keyPath: 'id' });
            },
        });
    }
    return dbPromise;
}
