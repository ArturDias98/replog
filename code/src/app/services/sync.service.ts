import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SyncQueueService } from './sync-queue.service';
import { SyncApiService } from './sync-api.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { WorkOutGroup } from '../models/workout-group';
import { SyncPullWorkout, SyncChange } from '../models/sync';

export type SyncStatus = 'idle' | 'success' | 'error' | 'offline' | 'unauthenticated';

const SYNC_INTERVAL_MS = 1000;
const PUSH_BATCH_SIZE = 100;

@Injectable({
    providedIn: 'root',
})
export class SyncService {
    private readonly syncQueue = inject(SyncQueueService);
    private readonly syncApi = inject(SyncApiService);
    private readonly storage = inject(StorageService);
    private readonly auth = inject(AuthService);

    readonly isSyncing = signal(false);
    readonly lastSyncStatus = signal<SyncStatus>('idle');
    readonly pendingChangeCount = signal(0);

    private intervalId: ReturnType<typeof setInterval> | null = null;

    initialize(): void {
        if (this.auth.isAuthenticated() && navigator.onLine) {
            this.sync();
        }

        window.addEventListener('online', () => {
            if (this.auth.isAuthenticated()) {
                this.sync();
            }
        });

        this.intervalId = setInterval(() => {
            if (this.auth.isAuthenticated() && navigator.onLine) {
                this.sync();
            }
        }, SYNC_INTERVAL_MS);

        this.updatePendingCount();
    }

    async sync(): Promise<void> {
        if (this.isSyncing()) return;

        if (!navigator.onLine) {
            this.lastSyncStatus.set('offline');
            return;
        }

        if (!this.auth.isAuthenticated()) {
            this.lastSyncStatus.set('unauthenticated');
            return;
        }

        this.isSyncing.set(true);

        try {
            await this.ensureInitialSyncQueue();
            const isFirstSync = (await this.syncQueue.getLastSyncedAt()) === null;
            const didPush = await this.pushChanges();

            if (didPush || isFirstSync) {
                await this.pullChanges();
            }

            this.lastSyncStatus.set('success');
        } catch (error) {
            this.handleSyncError(error);
        } finally {
            this.isSyncing.set(false);
            await this.updatePendingCount();
        }
    }

    private async pushChanges(): Promise<boolean> {
        const pendingChanges = await this.syncQueue.getPendingChanges();
        if (pendingChanges.length === 0) return false;

        for (let i = 0; i < pendingChanges.length; i += PUSH_BATCH_SIZE) {
            const batch = pendingChanges.slice(i, i + PUSH_BATCH_SIZE);
            const lastSyncedAt = await this.syncQueue.getLastSyncedAt() ?? new Date(0).toISOString();

            const response = await firstValueFrom(
                this.syncApi.push({ changes: batch, lastSyncedAt }),
            );

            if (response.acknowledgedChangeIds.length > 0) {
                await this.syncQueue.removePendingChanges(response.acknowledgedChangeIds);
            }

            if (response.conflicts.length > 0) {
                await this.applyConflicts(response.conflicts, batch);
                const conflictIds = response.conflicts.map(c => c.changeId);
                await this.syncQueue.removePendingChanges(conflictIds);
            }

            await this.syncQueue.setLastSyncedAt(response.serverTimestamp);
        }

        return true;
    }

    private async pullChanges(): Promise<void> {
        const response = await firstValueFrom(this.syncApi.pull());

        const workouts = this.convertPullToClientModels(response.workouts);
        await this.storage.saveToStorage(workouts);
        await this.syncQueue.setLastSyncedAt(response.serverTimestamp);
    }

    private async applyConflicts(
        conflicts: { changeId: string; resolution: 'server_wins'; serverVersion: Record<string, unknown> }[],
        originalChanges: SyncChange[],
    ): Promise<void> {
        const workouts = await this.storage.loadFromStorage();

        for (const conflict of conflicts) {
            const originalChange = originalChanges.find(c => c.id === conflict.changeId);
            if (!originalChange) continue;

            const sv = conflict.serverVersion;

            switch (originalChange.entityType) {
                case 'workout':
                    this.applyWorkoutConflict(workouts, sv);
                    break;
                case 'muscleGroup':
                    this.applyMuscleGroupConflict(workouts, sv);
                    break;
                case 'exercise':
                    this.applyExerciseConflict(workouts, sv);
                    break;
                case 'log':
                    this.applyLogConflict(workouts, sv);
                    break;
            }
        }

        await this.storage.saveToStorage(workouts);
    }

    private applyWorkoutConflict(workouts: WorkOutGroup[], sv: Record<string, unknown>): void {
        const idx = workouts.findIndex(w => w.id === sv['id']);
        if (idx !== -1) {
            workouts[idx] = {
                ...workouts[idx],
                title: sv['title'] as string,
                date: sv['date'] as string,
            };
        }
    }

    private applyMuscleGroupConflict(workouts: WorkOutGroup[], sv: Record<string, unknown>): void {
        for (const workout of workouts) {
            const mgIdx = workout.muscleGroup.findIndex(mg => mg.id === sv['id']);
            if (mgIdx !== -1) {
                workout.muscleGroup[mgIdx] = {
                    ...workout.muscleGroup[mgIdx],
                    title: sv['title'] as string,
                    date: sv['date'] as string,
                };
                return;
            }
        }
    }

    private applyExerciseConflict(workouts: WorkOutGroup[], sv: Record<string, unknown>): void {
        for (const workout of workouts) {
            for (const mg of workout.muscleGroup) {
                const exIdx = mg.exercises.findIndex(ex => ex.id === sv['id']);
                if (exIdx !== -1) {
                    mg.exercises[exIdx] = {
                        ...mg.exercises[exIdx],
                        title: sv['title'] as string,
                    };
                    return;
                }
            }
        }
    }

    private applyLogConflict(workouts: WorkOutGroup[], sv: Record<string, unknown>): void {
        for (const workout of workouts) {
            for (const mg of workout.muscleGroup) {
                for (const ex of mg.exercises) {
                    const logIdx = ex.log.findIndex(l => l.id === sv['id']);
                    if (logIdx !== -1) {
                        ex.log[logIdx] = {
                            ...ex.log[logIdx],
                            numberReps: sv['numberReps'] as number,
                            maxWeight: sv['maxWeight'] as number,
                        };
                        return;
                    }
                }
            }
        }
    }

    private convertPullToClientModels(pullWorkouts: SyncPullWorkout[]): WorkOutGroup[] {
        return pullWorkouts
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(pw => ({
                id: pw.id,
                userId: pw.userId,
                title: pw.title,
                date: pw.date,
                muscleGroup: pw.muscleGroup
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map(mg => ({
                        id: mg.id,
                        workoutId: mg.workoutId,
                        title: mg.title,
                        date: mg.date,
                        exercises: mg.exercises
                            .sort((a, b) => a.orderIndex - b.orderIndex)
                            .map(ex => ({
                                id: ex.id,
                                muscleGroupId: ex.muscleGroupId,
                                title: ex.title,
                                log: ex.log.map(l => ({
                                    id: l.id,
                                    numberReps: l.numberReps,
                                    maxWeight: l.maxWeight,
                                    date: new Date(l.date),
                                })),
                            })),
                    })),
            }));
    }

    private async ensureInitialSyncQueue(): Promise<void> {
        const lastSyncedAt = await this.syncQueue.getLastSyncedAt();
        if (lastSyncedAt !== null) return;

        const pendingChanges = await this.syncQueue.getPendingChanges();
        if (pendingChanges.length > 0) return;

        const workouts = await this.storage.loadFromStorage();
        if (workouts.length === 0) return;

        for (let wi = 0; wi < workouts.length; wi++) {
            const workout = workouts[wi];
            await this.syncQueue.recordChange('workout', 'CREATE', {
                id: workout.id,
                userId: workout.userId,
                title: workout.title,
                date: workout.date,
                orderIndex: wi,
            });

            for (let mgi = 0; mgi < workout.muscleGroup.length; mgi++) {
                const mg = workout.muscleGroup[mgi];
                await this.syncQueue.recordChange('muscleGroup', 'CREATE', {
                    id: mg.id,
                    workoutId: workout.id,
                    title: mg.title,
                    date: mg.date,
                    orderIndex: mgi,
                });

                for (let exi = 0; exi < mg.exercises.length; exi++) {
                    const ex = mg.exercises[exi];
                    await this.syncQueue.recordChange('exercise', 'CREATE', {
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
                        await this.syncQueue.recordChange('log', 'CREATE', {
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

    private handleSyncError(error: unknown): void {
        if (error instanceof Object && 'status' in error) {
            const httpError = error as { status: number };
            if (httpError.status === 401) {
                this.lastSyncStatus.set('unauthenticated');
                return;
            }
            if (httpError.status === 429) {
                this.lastSyncStatus.set('error');
                return;
            }
        }

        if (!navigator.onLine) {
            this.lastSyncStatus.set('offline');
            return;
        }

        this.lastSyncStatus.set('error');
        console.error('Sync failed:', error);
    }

    private async updatePendingCount(): Promise<void> {
        const count = await this.syncQueue.getPendingChangeCount();
        this.pendingChangeCount.set(count);
    }
}
