import { MuscleGroup } from './muscle-group';

export type WorkOutGroup = {
    id: string;
    title: string;
    date: string;
    userId: string;
    muscleGroup: MuscleGroup[];
};
