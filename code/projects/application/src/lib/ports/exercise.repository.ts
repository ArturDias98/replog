import { Exercise } from '@replog/shared';

export abstract class ExerciseRepository {
    abstract getByMuscleGroupId(muscleGroupId: string): Promise<Exercise[]>;
    abstract getById(exerciseId: string): Promise<Exercise | undefined>;
    abstract add(muscleGroupId: string, title: string): Promise<Exercise>;
    abstract addMany(muscleGroupId: string, titles: string[]): Promise<Exercise[]>;
    abstract update(exerciseId: string, title: string): Promise<Exercise>;
    abstract delete(exerciseId: string): Promise<void>;
    abstract clearAll(muscleGroupId: string): Promise<void>;
    abstract reorder(muscleGroupId: string, previousIndex: number, currentIndex: number): Promise<void>;
}
