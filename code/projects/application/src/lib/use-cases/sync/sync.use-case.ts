import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WorkOutGroup, SyncPullWorkout, SyncChange } from '@replog/shared';
import { SyncQueuePort } from '../../ports/sync-queue.port';
import { SyncApiPort } from '../../ports/sync-api.port';
import { StoragePort } from '../../ports/storage.port';

export type SyncStatus = 'idle' | 'success' | 'error' | 'unauthenticated';

const PUSH_BATCH_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class SyncUseCase {
    private readonly syncQueue = inject(SyncQueuePort);
    private readonly syncApi = inject(SyncApiPort);
    private readonly storage = inject(StoragePort);

    private isSyncing = false;

    async sync(): Promise<SyncStatus> {
        if (this.isSyncing) return 'idle';

        this.isSyncing = true;

        try {
            const isFirstSync = (await this.syncQueue.getLastSyncedAt()) === null;
            const didPush = await this.pushChanges();

            if (didPush || isFirstSync) {
                await this.pullChanges();
            }

            return 'success';
        } catch (error) {
            return this.handleSyncError(error);
        } finally {
            this.isSyncing = false;
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
        await this.storage.saveAll(workouts);
        await this.syncQueue.setLastSyncedAt(response.serverTimestamp);
    }

    private async applyConflicts(
        conflicts: { changeId: string; resolution: 'server_wins'; serverVersion: Record<string, unknown> }[],
        originalChanges: SyncChange[],
    ): Promise<void> {
        const workouts = await this.storage.loadAll();

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

        await this.storage.saveAll(workouts);
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
                                log: [...ex.log]
                                .sort((a, b) => a.orderIndex - b.orderIndex)
                                .map(l => ({
                                    id: l.id,
                                    numberReps: l.numberReps,
                                    maxWeight: l.maxWeight,
                                    date: new Date(l.date),
                                })),
                            })),
                    })),
            }));
    }

    private handleSyncError(error: unknown): SyncStatus {
        if (error instanceof Object && 'status' in error) {
            const httpError = error as { status: number };
            if (httpError.status === 401) {
                return 'unauthenticated';
            }
        }

        console.error('Sync failed:', error);
        return 'error';
    }
}
