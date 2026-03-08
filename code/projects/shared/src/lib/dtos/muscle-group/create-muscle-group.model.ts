export type CreateExerciseModel = {
    title: string;
};

export type CreateMuscleGroupModel = {
    title: string;
    date: string;
    workoutId: string;
    exercises: CreateExerciseModel[];
};
