import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WorkOutGroup } from '../models/workout-group';
import { CreateWorkoutModel, UpdateWorkoutModel } from '../models/workout';
import { CreateMuscleGroupModel, UpdateMuscleGroupModel, CreateMuscleItemModel } from '../models/muscle-group';
import { MuscleGroup } from '../models/muscle-group';
import { MuscleItem } from '../models/muscle-item';

@Injectable({
    providedIn: 'root'
})
export class WorkoutDataService {
    private http = inject(HttpClient);
    private readonly STORAGE_KEY = 'replog_workouts';

    async getWorkouts(): Promise<WorkOutGroup[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Try to load from local storage first
            const storedData = this.loadFromStorage();

            if (storedData && storedData.length > 0) {
                // Sort by date descending (most recent first)
                return [...storedData].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );
            }

            // If no data in local storage, load from sample data
            const workouts = await firstValueFrom(
                this.http.get<WorkOutGroup[]>('/sample-data.json')
            );
            // Save initial data to local storage
            this.saveToStorage(workouts);

            // Sort by date descending (most recent first)
            return [...workouts].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
        } catch (error) {
            console.error('Error loading workouts:', error);
            return [];
        }
    }

    private loadFromStorage(): WorkOutGroup[] | null {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from local storage:', error);
            return null;
        }
    }

    private saveToStorage(workouts: WorkOutGroup[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workouts));
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }

    async addWorkout(model: CreateWorkoutModel): Promise<WorkOutGroup> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Create new workout with generated ID
            const newWorkout: WorkOutGroup = {
                id: crypto.randomUUID(),
                title: model.title,
                date: model.date,
                userId: model.userId,
                muscleGroup: []
            };

            workouts.push(newWorkout);
            // Save to local storage
            this.saveToStorage(workouts);

            return newWorkout;
        } catch (error) {
            console.error('Error adding workout:', error);
            throw error;
        }
    }

    async updateWorkout(model: UpdateWorkoutModel): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const index = workouts.findIndex(w => w.id === model.id);
            if (index !== -1) {
                workouts[index] = {
                    ...workouts[index],
                    title: model.title,
                    date: model.date
                };
                // Save to local storage
                this.saveToStorage(workouts);
            }
        } catch (error) {
            console.error('Error updating workout:', error);
            throw error;
        }
    }

    async deleteWorkout(id: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const filteredWorkouts = workouts.filter(w => w.id !== id);
            // Save to local storage
            this.saveToStorage(filteredWorkouts);
        } catch (error) {
            console.error('Error deleting workout:', error);
            throw error;
        }
    }

    async getWorkoutById(id: string): Promise<WorkOutGroup | undefined> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            return workouts.find(w => w.id === id);
        } catch (error) {
            console.error('Error loading workout:', error);
            return undefined;
        }
    }

    async addMuscleGroup(model: CreateMuscleGroupModel): Promise<MuscleGroup> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const workoutIndex = workouts.findIndex(w => w.id === model.workoutId);
            if (workoutIndex === -1) {
                throw new Error('Workout not found');
            }

            const muscleGroupId = crypto.randomUUID();

            // Create new muscle group with generated ID
            const newMuscleGroup: MuscleGroup = {
                id: muscleGroupId,
                workoutId: model.workoutId,
                title: model.title,
                date: model.date,
                muscleItem: model.muscleItems.map((item: CreateMuscleItemModel) => ({
                    id: crypto.randomUUID(),
                    muscleGroupId: muscleGroupId,
                    title: item.title,
                    log: []
                }))
            };

            workouts[workoutIndex].muscleGroup.push(newMuscleGroup);
            // Save to local storage
            this.saveToStorage(workouts);

            return newMuscleGroup;
        } catch (error) {
            console.error('Error adding muscle group:', error);
            throw error;
        }
    }

    async updateMuscleGroup(model: UpdateMuscleGroupModel): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

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
                title: model.title,
                date: model.date
            };

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error updating muscle group:', error);
            throw error;
        }
    }

    async deleteMuscleGroup(muscleGroupId: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            workout.muscleGroup = workout.muscleGroup.filter(
                mg => mg.id !== muscleGroupId
            );

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error deleting muscle group:', error);
            throw error;
        }
    }

    async getMuscleGroupsByWorkoutId(workoutId: string): Promise<MuscleGroup[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const workout = workouts.find(w => w.id === workoutId);
            return workout?.muscleGroup ?? [];
        } catch (error) {
            console.error('Error loading muscle groups:', error);
            return [];
        }
    }
}
