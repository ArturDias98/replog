import { Injectable, inject } from '@angular/core';
import { AddLogModel, UpdateLogModel } from '@replog/shared';
import { LogRepository } from '../../ports/log.repository';
import { SyncQueuePort } from '../../ports/sync-queue.port';
import { StoragePort } from '../../ports/storage.port';

@Injectable({ providedIn: 'root' })
export class LogUseCase {
    private readonly repository = inject(LogRepository);
    private readonly syncQueue = inject(SyncQueuePort);
    private readonly storage = inject(StoragePort);

    async addLog(model: AddLogModel): Promise<string> {
        const id = await this.repository.add(model);
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const mg = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === model.exerciseId));
            if (mg) {
                const exercise = mg.exercises.find(ex => ex.id === model.exerciseId);
                const dateStr = model.date instanceof Date
                    ? model.date.toISOString().split('T')[0]
                    : String(model.date);
                await this.syncQueue.recordChange('log', 'CREATE', {
                    id,
                    workoutId: workout.id,
                    muscleGroupId: mg.id,
                    exerciseId: model.exerciseId,
                    numberReps: model.numberReps,
                    maxWeight: model.maxWeight,
                    date: dateStr,
                    orderIndex: exercise ? exercise.log.length - 1 : 0,
                });
                break;
            }
        }
        return id;
    }

    async updateLog(model: UpdateLogModel): Promise<void> {
        await this.repository.update(model);
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const mg = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === model.exerciseId));
            if (mg) {
                await this.syncQueue.recordChange('log', 'UPDATE', {
                    id: model.logId,
                    workoutId: workout.id,
                    muscleGroupId: mg.id,
                    exerciseId: model.exerciseId,
                    numberReps: model.numberReps,
                    maxWeight: model.maxWeight,
                });
                break;
            }
        }
    }

    async deleteLog(exerciseId: string, logId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        let workoutId = '';
        let muscleGroupId = '';
        for (const workout of workouts) {
            const mg = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === exerciseId));
            if (mg) {
                workoutId = workout.id;
                muscleGroupId = mg.id;
                break;
            }
        }
        await this.repository.delete(exerciseId, logId);
        await this.syncQueue.recordChange('log', 'DELETE', {
            id: logId,
            workoutId,
            muscleGroupId,
            exerciseId,
        });
    }

    async clearAllLogs(exerciseId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const mg = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === exerciseId));
            if (mg) {
                const exercise = mg.exercises.find(ex => ex.id === exerciseId);
                if (exercise) {
                    for (const log of exercise.log) {
                        await this.syncQueue.recordChange('log', 'DELETE', {
                            id: log.id,
                            workoutId: workout.id,
                            muscleGroupId: mg.id,
                            exerciseId,
                        });
                    }
                }
                break;
            }
        }
        await this.repository.clearAll(exerciseId);
    }
}
