import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WorkOutGroup } from '../models/workout-group';

@Injectable({
    providedIn: 'root'
})
export class WorkoutDataService {
    private http = inject(HttpClient);

    async getWorkouts(): Promise<WorkOutGroup[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Currently loading from static JSON file
            // In the future, replace '/sample-data.json' with backend API endpoint
            const workouts = await firstValueFrom(
                this.http.get<WorkOutGroup[]>('/sample-data.json')
            );
            return workouts;
        } catch (error) {
            console.error('Error loading workouts:', error);
            return [];
        }
    }

    async addWorkout(workout: WorkOutGroup): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // TODO: Replace with backend API call
    }

    async updateWorkout(workout: WorkOutGroup): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // TODO: Replace with backend API call
    }

    async deleteWorkout(id: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // TODO: Replace with backend API call
    }

    async getWorkoutById(id: string): Promise<WorkOutGroup | undefined> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Currently loading from static JSON file
            // In the future, replace '/sample-data.json' with backend API endpoint
            const workouts = await firstValueFrom(
                this.http.get<WorkOutGroup[]>('/sample-data.json')
            );
            return workouts.find(w => w.id === id);
        } catch (error) {
            console.error('Error loading workout:', error);
            return undefined;
        }
    }
}
