export type SyncEntityType = 'workout' | 'muscleGroup' | 'exercise' | 'log';

export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type SyncChange = {
    id: string;
    entityType: SyncEntityType;
    action: SyncAction;
    timestamp: string;
    data: Record<string, unknown>;
};

export type SyncPushRequest = {
    changes: SyncChange[];
    lastSyncedAt: string;
};

export type SyncPushResponse = {
    acknowledgedChangeIds: string[];
    conflicts: SyncConflict[];
    serverTimestamp: string;
};

export type SyncConflict = {
    changeId: string;
    resolution: 'server_wins';
    serverVersion: Record<string, unknown>;
};

export type SyncPullResponse = {
    workouts: SyncPullWorkout[];
    serverTimestamp: string;
};

export type SyncPullWorkout = {
    id: string;
    userId: string;
    title: string;
    date: string;
    orderIndex: number;
    muscleGroup: SyncPullMuscleGroup[];
};

export type SyncPullMuscleGroup = {
    id: string;
    workoutId: string;
    title: string;
    date: string;
    orderIndex: number;
    exercises: SyncPullExercise[];
};

export type SyncPullExercise = {
    id: string;
    muscleGroupId: string;
    title: string;
    orderIndex: number;
    log: SyncPullLog[];
};

export type SyncPullLog = {
    id: string;
    numberReps: number;
    maxWeight: number;
    date: string;
};
