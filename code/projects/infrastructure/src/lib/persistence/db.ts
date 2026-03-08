import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WorkOutGroup, SyncChange } from '@replog/shared';

interface RepLogDB extends DBSchema {
    data: {
        key: string;
        value: {
            id: string;
            workouts: WorkOutGroup[];
        };
    };
    sync_queue: {
        key: number;
        value: SyncChange;
    };
    sync_meta: {
        key: string;
        value: { id: string; value: string };
    };
}

const DB_NAME = 'replog-db';
const DB_VERSION = 3;

export const DATA_RECORD_KEY = 'workouts';

let dbPromise: Promise<IDBPDatabase<RepLogDB>> | null = null;

export function resetDb(): void {
    dbPromise = null;
}

export function getDb(): Promise<IDBPDatabase<RepLogDB>> {
    if (!dbPromise) {
        dbPromise = openDB<RepLogDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                    db.createObjectStore('data', { keyPath: 'id' });
                }
                if (oldVersion < 2) {
                    db.createObjectStore('sync_queue', { keyPath: 'id' });
                    db.createObjectStore('sync_meta', { keyPath: 'id' });
                }
                if (oldVersion < 3) {
                    db.deleteObjectStore('sync_queue');
                    db.createObjectStore('sync_queue', { autoIncrement: true });
                }
            },
        });
    }
    return dbPromise;
}
