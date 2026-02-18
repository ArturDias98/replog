import { Exercise } from './exercise';

export type MuscleGroup = {
    id: string;
    workoutId: string;
    title: string;
    date: string;
    exercises: Exercise[];
};

export * from './muscle-group/index';
