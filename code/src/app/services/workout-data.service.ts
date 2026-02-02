import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WorkOutGroup } from '../models/workout-group';

@Injectable({
    providedIn: 'root'
})
export class WorkoutDataService {
    private http = inject(HttpClient);
    private workoutsCache: WorkOutGroup[] | null = null;

    async getWorkouts(): Promise<WorkOutGroup[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!this.workoutsCache) {
            try {
                // Currently loading from static JSON file
                // In the future, replace '/sample-data.json' with backend API endpoint
                const workouts = await firstValueFrom(
                    this.http.get<WorkOutGroup[]>('/sample-data.json')
                );
                this.workoutsCache = workouts;
            } catch (error) {
                console.error('Error loading workouts:', error);
                this.workoutsCache = [];
            }
        }
        return [...this.workoutsCache];
    }

    async addWorkout(workout: WorkOutGroup): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Ensure cache is loaded
            if (!this.workoutsCache) {
                await this.getWorkouts();
            }

            // In the future, replace with: POST /api/workouts
            this.workoutsCache?.push(workout);
        } catch (error) {
            console.error('Error adding workout:', error);
            throw error;
        }
    }

    async updateWorkout(workout: WorkOutGroup): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Ensure cache is loaded
            if (!this.workoutsCache) {
                await this.getWorkouts();
            }

            // In the future, replace with: PUT /api/workouts/:id
            const index = this.workoutsCache?.findIndex(w => w.id === workout.id) ?? -1;
            if (index !== -1 && this.workoutsCache) {
                this.workoutsCache[index] = workout;
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
            // Ensure cache is loaded
            if (!this.workoutsCache) {
                await this.getWorkouts();
            }

            // In the future, replace with: DELETE /api/workouts/:id
            this.workoutsCache = this.workoutsCache?.filter(w => w.id !== id) ?? [];
        } catch (error) {
            console.error('Error deleting workout:', error);
            throw error;
        }
    }

    async getWorkoutById(id: string): Promise<WorkOutGroup | undefined> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Ensure cache is loaded
            if (!this.workoutsCache) {
                await this.getWorkouts();
            }

            // In the future, replace with: GET /api/workouts/:id
            return this.workoutsCache?.find(w => w.id === id);
        } catch (error) {
            console.error('Error loading workout:', error);
            return undefined;
        }
    }
}
