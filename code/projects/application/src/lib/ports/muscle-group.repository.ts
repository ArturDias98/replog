import { MuscleGroup, CreateMuscleGroupModel, UpdateMuscleGroupModel } from '@replog/shared';

export abstract class MuscleGroupRepository {
    abstract getByWorkoutId(workoutId: string): Promise<MuscleGroup[]>;
    abstract getById(id: string): Promise<MuscleGroup | undefined>;
    abstract add(model: CreateMuscleGroupModel): Promise<MuscleGroup>;
    abstract addMany(models: CreateMuscleGroupModel[]): Promise<MuscleGroup[]>;
    abstract update(model: UpdateMuscleGroupModel): Promise<MuscleGroup>;
    abstract delete(id: string): Promise<void>;
    abstract clearAll(workoutId: string): Promise<void>;
    abstract reorder(workoutId: string, previousIndex: number, currentIndex: number): Promise<void>;
}
