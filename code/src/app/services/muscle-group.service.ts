import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { SyncQueueService } from './sync-queue.service';
import { CreateMuscleGroupModel, UpdateMuscleGroupModel, CreateExerciseModel } from '../models/muscle-group';
import { MuscleGroup } from '../models/muscle-group';
import { Exercise } from '../models/exercise';

@Injectable({
    providedIn: 'root'
})
export class MuscleGroupService {
    private storage = inject(StorageService);
    private syncQueue = inject(SyncQueueService);

    async addMuscleGroup(model: CreateMuscleGroupModel): Promise<MuscleGroup> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workoutIndex = workouts.findIndex(w => w.id === model.workoutId);
            if (workoutIndex === -1) {
                throw new Error('Workout not found');
            }

            const muscleGroupId = crypto.randomUUID();

            const newMuscleGroup: MuscleGroup = {
                id: muscleGroupId,
                workoutId: model.workoutId,
                title: model.title.trim(),
                date: model.date,
                exercises: model.exercises.map((item: CreateExerciseModel) => ({
                    id: crypto.randomUUID(),
                    muscleGroupId: muscleGroupId,
                    title: item.title.trim(),
                    log: []
                }))
            };

            workouts[workoutIndex].muscleGroup.push(newMuscleGroup);
            await this.storage.saveToStorage(workouts);

            const mgOrderIndex = workouts[workoutIndex].muscleGroup.length - 1;
            await this.syncQueue.recordChange('muscleGroup', 'CREATE', {
                id: muscleGroupId,
                workoutId: model.workoutId,
                title: newMuscleGroup.title,
                date: newMuscleGroup.date,
                orderIndex: mgOrderIndex,
            });

            for (let i = 0; i < newMuscleGroup.exercises.length; i++) {
                const ex = newMuscleGroup.exercises[i];
                await this.syncQueue.recordChange('exercise', 'CREATE', {
                    id: ex.id,
                    workoutId: model.workoutId,
                    muscleGroupId: muscleGroupId,
                    title: ex.title,
                    orderIndex: i,
                });
            }

            return newMuscleGroup;
        } catch (error) {
            console.error('Error adding muscle group:', error);
            throw error;
        }
    }

    async addMuscleGroups(models: CreateMuscleGroupModel[]): Promise<MuscleGroup[]> {
        try {
            if (models.length === 0) {
                return [];
            }

            const workouts = await this.storage.loadFromStorage();
            const workoutId = models[0].workoutId;

            const workoutIndex = workouts.findIndex(w => w.id === workoutId);
            if (workoutIndex === -1) {
                throw new Error('Workout not found');
            }

            const existingCount = workouts[workoutIndex].muscleGroup.length;

            const newMuscleGroups: MuscleGroup[] = models.map(model => {
                const muscleGroupId = crypto.randomUUID();

                return {
                    id: muscleGroupId,
                    workoutId: model.workoutId,
                    title: model.title.trim(),
                    date: model.date,
                    exercises: model.exercises.map((item: CreateExerciseModel) => ({
                        id: crypto.randomUUID(),
                        muscleGroupId: muscleGroupId,
                        title: item.title.trim(),
                        log: []
                    }))
                };
            });

            workouts[workoutIndex].muscleGroup.push(...newMuscleGroups);
            await this.storage.saveToStorage(workouts);

            for (let mgIdx = 0; mgIdx < newMuscleGroups.length; mgIdx++) {
                const mg = newMuscleGroups[mgIdx];
                await this.syncQueue.recordChange('muscleGroup', 'CREATE', {
                    id: mg.id,
                    workoutId: workoutId,
                    title: mg.title,
                    date: mg.date,
                    orderIndex: existingCount + mgIdx,
                });

                for (let exIdx = 0; exIdx < mg.exercises.length; exIdx++) {
                    const ex = mg.exercises[exIdx];
                    await this.syncQueue.recordChange('exercise', 'CREATE', {
                        id: ex.id,
                        workoutId: workoutId,
                        muscleGroupId: mg.id,
                        title: ex.title,
                        orderIndex: exIdx,
                    });
                }
            }

            return newMuscleGroups;
        } catch (error) {
            console.error('Error adding muscle groups:', error);
            throw error;
        }
    }

    async updateMuscleGroup(model: UpdateMuscleGroupModel): Promise<MuscleGroup> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === model.muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            const muscleGroupIndex = workout.muscleGroup.findIndex(
                mg => mg.id === model.muscleGroupId
            );

            workout.muscleGroup[muscleGroupIndex] = {
                ...workout.muscleGroup[muscleGroupIndex],
                title: model.title.trim(),
                date: model.date
            };

            await this.storage.saveToStorage(workouts);

            await this.syncQueue.recordChange('muscleGroup', 'UPDATE', {
                id: model.muscleGroupId,
                workoutId: workout.muscleGroup[muscleGroupIndex].workoutId,
                title: model.title.trim(),
                date: model.date,
                orderIndex: muscleGroupIndex,
            });

            return workout.muscleGroup[muscleGroupIndex];
        } catch (error) {
            console.error('Error updating muscle group:', error);
            throw error;
        }
    }

    async deleteMuscleGroup(muscleGroupId: string): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            workout.muscleGroup = workout.muscleGroup.filter(
                mg => mg.id !== muscleGroupId
            );

            await this.storage.saveToStorage(workouts);

            await this.syncQueue.recordChange('muscleGroup', 'DELETE', {
                id: muscleGroupId,
                workoutId: workout.id,
            });
        } catch (error) {
            console.error('Error deleting muscle group:', error);
            throw error;
        }
    }

    async reorderMuscleGroups(workoutId: string, previousIndex: number, currentIndex: number): Promise<void> {
        const workouts = await this.storage.loadFromStorage();
        const workout = workouts.find(w => w.id === workoutId);
        if (!workout) {
            throw new Error('Workout not found');
        }
        const [moved] = workout.muscleGroup.splice(previousIndex, 1);
        workout.muscleGroup.splice(currentIndex, 0, moved);
        await this.storage.saveToStorage(workouts);

        const start = Math.min(previousIndex, currentIndex);
        const end = Math.max(previousIndex, currentIndex);
        for (let i = start; i <= end; i++) {
            const mg = workout.muscleGroup[i];
            await this.syncQueue.recordChange('muscleGroup', 'UPDATE', {
                id: mg.id,
                workoutId: workoutId,
                title: mg.title,
                date: mg.date,
                orderIndex: i,
            });
        }
    }

    async getMuscleGroupsByWorkoutId(workoutId: string): Promise<MuscleGroup[]> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w => w.id === workoutId);
            return workout?.muscleGroup ?? [];
        } catch (error) {
            console.error('Error loading muscle groups:', error);
            return [];
        }
    }

    async clearAllMuscleGroups(workoutId: string): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w => w.id === workoutId);
            if (!workout) {
                throw new Error('Workout not found');
            }

            for (const mg of workout.muscleGroup) {
                await this.syncQueue.recordChange('muscleGroup', 'DELETE', {
                    id: mg.id,
                    workoutId: workoutId,
                });
            }

            workout.muscleGroup = [];

            await this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error clearing muscle groups:', error);
            throw error;
        }
    }

    async getMuscleGroupById(muscleGroupId: string): Promise<MuscleGroup | undefined> {
        try {
            const workouts = await this.storage.loadFromStorage();

            for (const workout of workouts) {
                const muscleGroup = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
                if (muscleGroup) {
                    return muscleGroup;
                }
            }

            return undefined;
        } catch (error) {
            console.error('Error loading muscle group:', error);
            return undefined;
        }
    }
}
