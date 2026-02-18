import { Log } from './log';

export type Exercise = {
    id: string;
    muscleGroupId: string;
    title: string;
    log: Log[];
};
