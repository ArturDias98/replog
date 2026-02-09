import { MuscleItem } from './muscle-item';

export type MuscleGroup = {
    id: string;
    workoutId: string;
    title: string;
    date: string;
    muscleItem: MuscleItem[];
};

export * from './muscle-group/index';
