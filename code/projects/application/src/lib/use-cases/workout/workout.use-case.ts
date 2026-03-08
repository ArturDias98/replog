import { Injectable, inject } from '@angular/core';
import { WorkOutGroup, CreateWorkoutModel, UpdateWorkoutModel } from '@replog/shared';
import { WorkoutRepository } from '../../ports/workout.repository';
import { SyncQueuePort } from '../../ports/sync-queue.port';

@Injectable({ providedIn: 'root' })
export class WorkoutUseCase {
    private readonly repository = inject(WorkoutRepository);
    private readonly syncQueue = inject(SyncQueuePort);

    async getWorkouts(): Promise<WorkOutGroup[]> {
        return this.repository.getAll();
    }

    async addWorkout(model: CreateWorkoutModel): Promise<WorkOutGroup> {
        const workout = await this.repository.add(model);
        const all = await this.repository.getAll();
        await this.syncQueue.recordChange('workout', 'CREATE', {
            id: workout.id,
            userId: workout.userId,
            title: workout.title,
            date: workout.date,
            orderIndex: all.length - 1,
        });
        return workout;
    }

    async updateWorkout(model: UpdateWorkoutModel): Promise<void> {
        await this.repository.update(model);
        const all = await this.repository.getAll();
        const index = all.findIndex(w => w.id === model.id);
        await this.syncQueue.recordChange('workout', 'UPDATE', {
            id: model.id,
            title: model.title.trim(),
            date: model.date,
            orderIndex: index,
        });
    }

    async deleteWorkout(id: string): Promise<void> {
        await this.repository.delete(id);
        await this.syncQueue.recordChange('workout', 'DELETE', { id });
    }

    async clearAllWorkouts(): Promise<void> {
        const workouts = await this.repository.getAll();
        for (const workout of workouts) {
            await this.syncQueue.recordChange('workout', 'DELETE', { id: workout.id });
        }
        await this.repository.clearAll();
    }

    async reorderWorkouts(previousIndex: number, currentIndex: number): Promise<void> {
        await this.repository.reorder(previousIndex, currentIndex);
        const workouts = await this.repository.getAll();
        const start = Math.min(previousIndex, currentIndex);
        const end = Math.max(previousIndex, currentIndex);
        for (let i = start; i <= end; i++) {
            await this.syncQueue.recordChange('workout', 'UPDATE', {
                id: workouts[i].id,
                title: workouts[i].title,
                date: workouts[i].date,
                orderIndex: i,
            });
        }
    }

    async getWorkoutById(id: string): Promise<WorkOutGroup | undefined> {
        return this.repository.getById(id);
    }
}
