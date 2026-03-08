import { Injectable, inject } from '@angular/core';
import { Exercise } from '@replog/shared';
import { ExerciseRepository } from '../../ports/exercise.repository';
import { SyncQueuePort } from '../../ports/sync-queue.port';
import { StoragePort } from '../../ports/storage.port';

@Injectable({ providedIn: 'root' })
export class ExerciseUseCase {
    private readonly repository = inject(ExerciseRepository);
    private readonly syncQueue = inject(SyncQueuePort);
    private readonly storage = inject(StoragePort);

    async getExercisesByMuscleGroupId(muscleGroupId: string): Promise<Exercise[]> {
        return this.repository.getByMuscleGroupId(muscleGroupId);
    }

    async addExercise(muscleGroupId: string, title: string): Promise<Exercise> {
        const exercise = await this.repository.add(muscleGroupId, title);
        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.muscleGroup.some(mg => mg.id === muscleGroupId));
        if (workout) {
            const mg = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
            await this.syncQueue.recordChange('exercise', 'CREATE', {
                id: exercise.id,
                workoutId: workout.id,
                muscleGroupId,
                title: exercise.title,
                orderIndex: mg ? mg.exercises.length - 1 : 0,
            });
        }
        return exercise;
    }

    async addExercises(muscleGroupId: string, titles: string[]): Promise<Exercise[]> {
        if (titles.length === 0) return [];
        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.muscleGroup.some(mg => mg.id === muscleGroupId));
        const mg = workout?.muscleGroup.find(mg => mg.id === muscleGroupId);
        const existingCount = mg ? mg.exercises.length : 0;

        const exercises = await this.repository.addMany(muscleGroupId, titles);

        if (workout) {
            for (let i = 0; i < exercises.length; i++) {
                await this.syncQueue.recordChange('exercise', 'CREATE', {
                    id: exercises[i].id,
                    workoutId: workout.id,
                    muscleGroupId,
                    title: exercises[i].title,
                    orderIndex: existingCount + i,
                });
            }
        }
        return exercises;
    }

    async updateExercise(exerciseId: string, title: string): Promise<Exercise> {
        const exercise = await this.repository.update(exerciseId, title);
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const mg = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === exerciseId));
            if (mg) {
                const idx = mg.exercises.findIndex(ex => ex.id === exerciseId);
                await this.syncQueue.recordChange('exercise', 'UPDATE', {
                    id: exerciseId,
                    workoutId: workout.id,
                    muscleGroupId: mg.id,
                    title: title.trim(),
                    orderIndex: idx,
                });
                break;
            }
        }
        return exercise;
    }

    async deleteExercise(exerciseId: string): Promise<void> {
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
        await this.repository.delete(exerciseId);
        await this.syncQueue.recordChange('exercise', 'DELETE', {
            id: exerciseId,
            workoutId,
            muscleGroupId,
        });
    }

    async clearAllExercises(muscleGroupId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.muscleGroup.some(mg => mg.id === muscleGroupId));
        const mg = workout?.muscleGroup.find(mg => mg.id === muscleGroupId);
        if (workout && mg) {
            for (const ex of mg.exercises) {
                await this.syncQueue.recordChange('exercise', 'DELETE', {
                    id: ex.id,
                    workoutId: workout.id,
                    muscleGroupId,
                });
            }
        }
        await this.repository.clearAll(muscleGroupId);
    }

    async reorderExercises(muscleGroupId: string, previousIndex: number, currentIndex: number): Promise<void> {
        await this.repository.reorder(muscleGroupId, previousIndex, currentIndex);
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const mg = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
            if (mg) {
                const start = Math.min(previousIndex, currentIndex);
                const end = Math.max(previousIndex, currentIndex);
                for (let i = start; i <= end; i++) {
                    await this.syncQueue.recordChange('exercise', 'UPDATE', {
                        id: mg.exercises[i].id,
                        workoutId: workout.id,
                        muscleGroupId,
                        title: mg.exercises[i].title,
                        orderIndex: i,
                    });
                }
                break;
            }
        }
    }

    async getExerciseById(exerciseId: string): Promise<Exercise | undefined> {
        return this.repository.getById(exerciseId);
    }
}
