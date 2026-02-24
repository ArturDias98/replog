import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { CreateMuscleGroupModel, UpdateMuscleGroupModel, CreateExerciseModel } from '../models/muscle-group';
import { MuscleGroup } from '../models/muscle-group';
import { Exercise } from '../models/exercise';

@Injectable({
    providedIn: 'root'
})
export class MuscleGroupService {
    private storage = inject(StorageService);

    async addMuscleGroup(model: CreateMuscleGroupModel): Promise<MuscleGroup> {
        try {
            const workouts = this.storage.loadFromStorage();

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
            this.storage.saveToStorage(workouts);

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

            const workouts = this.storage.loadFromStorage();
            const workoutId = models[0].workoutId;

            const workoutIndex = workouts.findIndex(w => w.id === workoutId);
            if (workoutIndex === -1) {
                throw new Error('Workout not found');
            }

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
            this.storage.saveToStorage(workouts);

            return newMuscleGroups;
        } catch (error) {
            console.error('Error adding muscle groups:', error);
            throw error;
        }
    }

    async updateMuscleGroup(model: UpdateMuscleGroupModel): Promise<MuscleGroup> {
        try {
            const workouts = this.storage.loadFromStorage();

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

            this.storage.saveToStorage(workouts);

            return workout.muscleGroup[muscleGroupIndex];
        } catch (error) {
            console.error('Error updating muscle group:', error);
            throw error;
        }
    }

    async deleteMuscleGroup(muscleGroupId: string): Promise<void> {
        try {
            const workouts = this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            workout.muscleGroup = workout.muscleGroup.filter(
                mg => mg.id !== muscleGroupId
            );

            this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error deleting muscle group:', error);
            throw error;
        }
    }

    async reorderMuscleGroups(workoutId: string, previousIndex: number, currentIndex: number): Promise<void> {
        const workouts = this.storage.loadFromStorage();
        const workout = workouts.find(w => w.id === workoutId);
        if (!workout) {
            throw new Error('Workout not found');
        }
        const [moved] = workout.muscleGroup.splice(previousIndex, 1);
        workout.muscleGroup.splice(currentIndex, 0, moved);
        this.storage.saveToStorage(workouts);
    }

    async getMuscleGroupsByWorkoutId(workoutId: string): Promise<MuscleGroup[]> {
        try {
            const workouts = this.storage.loadFromStorage();

            const workout = workouts.find(w => w.id === workoutId);
            return workout?.muscleGroup ?? [];
        } catch (error) {
            console.error('Error loading muscle groups:', error);
            return [];
        }
    }

    async clearAllMuscleGroups(workoutId: string): Promise<void> {
        try {
            const workouts = this.storage.loadFromStorage();

            const workout = workouts.find(w => w.id === workoutId);
            if (!workout) {
                throw new Error('Workout not found');
            }

            workout.muscleGroup = [];

            this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error clearing muscle groups:', error);
            throw error;
        }
    }

    async getMuscleGroupById(muscleGroupId: string): Promise<MuscleGroup | undefined> {
        try {
            const workouts = this.storage.loadFromStorage();

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
