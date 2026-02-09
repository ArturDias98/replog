export type CreateMuscleItemModel = {
    title: string;
};

export type CreateMuscleGroupModel = {
    title: string;
    date: string;
    workoutId: string;
    muscleItems: CreateMuscleItemModel[];
};
