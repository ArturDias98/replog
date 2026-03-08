import { Injectable, inject } from '@angular/core';
import { WorkOutGroup, CreateWorkoutModel, UpdateWorkoutModel } from '@replog/shared';
import { WorkoutRepository, StoragePort } from '@replog/application';

@Injectable()
export class WorkoutRepositoryImpl extends WorkoutRepository {
    private readonly storage = inject(StoragePort);

    async getAll(): Promise<WorkOutGroup[]> {
        try {
            const storedData = await this.storage.loadAll();
            return storedData.length > 0 ? [...storedData] : [];
        } catch (error) {
            console.error('Error loading workouts:', error);
            return [];
        }
    }

    async getById(id: string): Promise<WorkOutGroup | undefined> {
        try {
            const workouts = await this.storage.loadAll();
            return workouts.find(w => w.id === id);
        } catch (error) {
            console.error('Error loading workout:', error);
            return undefined;
        }
    }

    async add(model: CreateWorkoutModel): Promise<WorkOutGroup> {
        const workouts = await this.storage.loadAll();
        const newWorkout: WorkOutGroup = {
            id: crypto.randomUUID(),
            title: model.title.trim(),
            date: model.date,
            userId: model.userId,
            muscleGroup: []
        };
        workouts.push(newWorkout);
        await this.storage.saveAll(workouts);
        return newWorkout;
    }

    async update(model: UpdateWorkoutModel): Promise<void> {
        const workouts = await this.storage.loadAll();
        const index = workouts.findIndex(w => w.id === model.id);
        if (index !== -1) {
            workouts[index] = {
                ...workouts[index],
                title: model.title.trim(),
                date: model.date
            };
            await this.storage.saveAll(workouts);
        }
    }

    async delete(id: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        const filteredWorkouts = workouts.filter(w => w.id !== id);
        await this.storage.saveAll(filteredWorkouts);
    }

    async clearAll(): Promise<void> {
        await this.storage.saveAll([]);
    }

    async reorder(previousIndex: number, currentIndex: number): Promise<void> {
        const workouts = await this.storage.loadAll();
        const [moved] = workouts.splice(previousIndex, 1);
        workouts.splice(currentIndex, 0, moved);
        await this.storage.saveAll(workouts);
    }
}
