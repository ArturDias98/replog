import { Injectable } from '@angular/core';
import { SyncChange, SyncEntityType, SyncAction } from '@replog/shared';
import { SyncQueuePort } from '@replog/application';
import { getDb } from '../persistence/db';

const LAST_SYNCED_AT_KEY = 'lastSyncedAt';

@Injectable()
export class SyncQueueServiceImpl extends SyncQueuePort {
    async recordChange(entityType: SyncEntityType, action: SyncAction, data: Record<string, unknown>): Promise<void> {
        const change: SyncChange = {
            id: crypto.randomUUID(),
            entityType,
            action,
            timestamp: new Date().toISOString(),
            data,
        };
        const db = await getDb();
        await db.add('sync_queue', change);
    }

    async getPendingChanges(): Promise<SyncChange[]> {
        const db = await getDb();
        return db.getAll('sync_queue');
    }

    async getPendingChangeCount(): Promise<number> {
        const db = await getDb();
        return db.count('sync_queue');
    }

    async removePendingChanges(changeIds: string[]): Promise<void> {
        const idsToRemove = new Set(changeIds);
        const db = await getDb();
        const tx = db.transaction('sync_queue', 'readwrite');
        let cursor = await tx.store.openCursor();
        while (cursor) {
            if (idsToRemove.has(cursor.value.id)) {
                cursor.delete();
            }
            cursor = await cursor.continue();
        }
        await tx.done;
    }

    async getLastSyncedAt(): Promise<string | null> {
        const db = await getDb();
        const record = await db.get('sync_meta', LAST_SYNCED_AT_KEY);
        return record?.value ?? null;
    }

    async setLastSyncedAt(timestamp: string): Promise<void> {
        const db = await getDb();
        await db.put('sync_meta', { id: LAST_SYNCED_AT_KEY, value: timestamp });
    }

    async clearAll(): Promise<void> {
        const db = await getDb();
        const tx = db.transaction(['sync_queue', 'sync_meta'], 'readwrite');
        tx.objectStore('sync_queue').clear();
        tx.objectStore('sync_meta').clear();
        await tx.done;
    }
}
