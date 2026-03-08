import { WorkOutGroup, CreateWorkoutModel, UpdateWorkoutModel } from '@replog/shared';

export abstract class WorkoutRepository {
    abstract getAll(): Promise<WorkOutGroup[]>;
    abstract getById(id: string): Promise<WorkOutGroup | undefined>;
    abstract add(model: CreateWorkoutModel): Promise<WorkOutGroup>;
    abstract update(model: UpdateWorkoutModel): Promise<void>;
    abstract delete(id: string): Promise<void>;
    abstract clearAll(): Promise<void>;
    abstract reorder(previousIndex: number, currentIndex: number): Promise<void>;
}
