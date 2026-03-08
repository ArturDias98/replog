import { Injectable } from '@angular/core';
import { SyncChange, SyncEntityType, SyncAction, WorkOutGroup } from '@replog/shared';
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

    async ensureInitialQueue(workouts: WorkOutGroup[]): Promise<void> {
        const lastSyncedAt = await this.getLastSyncedAt();
        if (lastSyncedAt !== null) return;

        const pendingChanges = await this.getPendingChanges();
        if (pendingChanges.length > 0) return;

        if (workouts.length === 0) return;

        for (let wi = 0; wi < workouts.length; wi++) {
            const workout = workouts[wi];
            await this.recordChange('workout', 'CREATE', {
                id: workout.id,
                userId: workout.userId,
                title: workout.title,
                date: workout.date,
                orderIndex: wi,
            });

            for (let mgi = 0; mgi < workout.muscleGroup.length; mgi++) {
                const mg = workout.muscleGroup[mgi];
                await this.recordChange('muscleGroup', 'CREATE', {
                    id: mg.id,
                    workoutId: workout.id,
                    title: mg.title,
                    date: mg.date,
                    orderIndex: mgi,
                });

                for (let exi = 0; exi < mg.exercises.length; exi++) {
                    const ex = mg.exercises[exi];
                    await this.recordChange('exercise', 'CREATE', {
                        id: ex.id,
                        workoutId: workout.id,
                        muscleGroupId: mg.id,
                        title: ex.title,
                        orderIndex: exi,
                    });

                    for (const log of ex.log) {
                        const dateStr = log.date instanceof Date
                            ? log.date.toISOString().split('T')[0]
                            : String(log.date);
                        await this.recordChange('log', 'CREATE', {
                            id: log.id,
                            workoutId: workout.id,
                            muscleGroupId: mg.id,
                            exerciseId: ex.id,
                            numberReps: log.numberReps,
                            maxWeight: log.maxWeight,
                            date: dateStr,
                        });
                    }
                }
            }
        }
    }

    async clearAll(): Promise<void> {
        const db = await getDb();
        const tx = db.transaction(['sync_queue', 'sync_meta'], 'readwrite');
        tx.objectStore('sync_queue').clear();
        tx.objectStore('sync_meta').clear();
        await tx.done;
    }
}
