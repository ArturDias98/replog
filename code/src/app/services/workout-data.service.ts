import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WorkOutGroup } from '../models/workout-group';
import { CreateWorkoutModel, UpdateWorkoutModel } from '../models/workout';
import { CreateMuscleGroupModel, UpdateMuscleGroupModel, CreateExerciseModel } from '../models/muscle-group';
import { MuscleGroup } from '../models/muscle-group';
import { Exercise } from '../models/exercise';
import { AddLogModel, UpdateLogModel } from '../models/log';

@Injectable({
    providedIn: 'root'
})
export class WorkoutDataService {
    private http = inject(HttpClient);
    private readonly STORAGE_KEY = 'replog_workouts';

    async getWorkouts(): Promise<WorkOutGroup[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load from local storage
            const storedData = this.loadFromStorage();

            if (storedData && storedData.length > 0) {
                // Sort by date descending (most recent first)
                return [...storedData].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );
            }

            // Return empty array if no data
            return [];
        } catch (error) {
            console.error('Error loading workouts:', error);
            return [];
        }
    }

    private loadFromStorage(): WorkOutGroup[] | null {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from local storage:', error);
            return null;
        }
    }

    private saveToStorage(workouts: WorkOutGroup[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workouts));
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }

    async addWorkout(model: CreateWorkoutModel): Promise<WorkOutGroup> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Create new workout with generated ID
            const newWorkout: WorkOutGroup = {
                id: crypto.randomUUID(),
                title: model.title,
                date: model.date,
                userId: model.userId,
                muscleGroup: []
            };

            workouts.push(newWorkout);
            // Save to local storage
            this.saveToStorage(workouts);

            return newWorkout;
        } catch (error) {
            console.error('Error adding workout:', error);
            throw error;
        }
    }

    async updateWorkout(model: UpdateWorkoutModel): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const index = workouts.findIndex(w => w.id === model.id);
            if (index !== -1) {
                workouts[index] = {
                    ...workouts[index],
                    title: model.title,
                    date: model.date
                };
                // Save to local storage
                this.saveToStorage(workouts);
            }
        } catch (error) {
            console.error('Error updating workout:', error);
            throw error;
        }
    }

    async deleteWorkout(id: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const filteredWorkouts = workouts.filter(w => w.id !== id);
            // Save to local storage
            this.saveToStorage(filteredWorkouts);
        } catch (error) {
            console.error('Error deleting workout:', error);
            throw error;
        }
    }

    async clearAllWorkouts(userId?: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Clear all workouts from local storage
            // Note: userId parameter is kept for API consistency but not used in local storage implementation
            this.saveToStorage([]);
        } catch (error) {
            console.error('Error clearing workouts:', error);
            throw error;
        }
    }

    async getWorkoutById(id: string): Promise<WorkOutGroup | undefined> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            return workouts.find(w => w.id === id);
        } catch (error) {
            console.error('Error loading workout:', error);
            return undefined;
        }
    }

    async addMuscleGroup(model: CreateMuscleGroupModel): Promise<MuscleGroup> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const workoutIndex = workouts.findIndex(w => w.id === model.workoutId);
            if (workoutIndex === -1) {
                throw new Error('Workout not found');
            }

            const muscleGroupId = crypto.randomUUID();

            // Create new muscle group with generated ID
            const newMuscleGroup: MuscleGroup = {
                id: muscleGroupId,
                workoutId: model.workoutId,
                title: model.title,
                date: model.date,
                exercises: model.exercises.map((item: CreateExerciseModel) => ({
                    id: crypto.randomUUID(),
                    muscleGroupId: muscleGroupId,
                    title: item.title,
                    log: []
                }))
            };

            workouts[workoutIndex].muscleGroup.push(newMuscleGroup);
            // Save to local storage
            this.saveToStorage(workouts);

            return newMuscleGroup;
        } catch (error) {
            console.error('Error adding muscle group:', error);
            throw error;
        }
    }

    async updateMuscleGroup(model: UpdateMuscleGroupModel): Promise<MuscleGroup> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === model.muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            const muscleGroupIndex = workout.muscleGroup.findIndex(
                mg => mg.id === model.muscleGroupId
            );

            workout.muscleGroup[muscleGroupIndex] = {
                ...workout.muscleGroup[muscleGroupIndex],
                title: model.title,
                date: model.date
            };

            // Save to local storage
            this.saveToStorage(workouts);

            return workout.muscleGroup[muscleGroupIndex];
        } catch (error) {
            console.error('Error updating muscle group:', error);
            throw error;
        }
    }

    async deleteMuscleGroup(muscleGroupId: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            workout.muscleGroup = workout.muscleGroup.filter(
                mg => mg.id !== muscleGroupId
            );

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error deleting muscle group:', error);
            throw error;
        }
    }

    async getMuscleGroupsByWorkoutId(workoutId: string): Promise<MuscleGroup[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const workout = workouts.find(w => w.id === workoutId);
            return workout?.muscleGroup ?? [];
        } catch (error) {
            console.error('Error loading muscle groups:', error);
            return [];
        }
    }

    async clearAllMuscleGroups(workoutId: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            const workout = workouts.find(w => w.id === workoutId);
            if (!workout) {
                throw new Error('Workout not found');
            }

            // Clear all muscle groups from the workout
            workout.muscleGroup = [];

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error clearing muscle groups:', error);
            throw error;
        }
    }

    async getMuscleGroupById(muscleGroupId: string): Promise<MuscleGroup | undefined> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            for (const workout of workouts) {
                const muscleGroup = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
                if (muscleGroup) {
                    return muscleGroup;
                }
            }

            return undefined;
        } catch (error) {
            console.error('Error loading muscle group:', error);
            return undefined;
        }
    }

    async getExercisesByMuscleGroupId(muscleGroupId: string): Promise<Exercise[]> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const muscleGroup = await this.getMuscleGroupById(muscleGroupId);
            return muscleGroup?.exercises ?? [];
        } catch (error) {
            console.error('Error loading exercises:', error);
            return [];
        }
    }

    async addExercise(muscleGroupId: string, title: string): Promise<Exercise> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the muscle group
            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            const muscleGroupIndex = workout.muscleGroup.findIndex(
                mg => mg.id === muscleGroupId
            );

            // Create new exercise with generated ID
            const newExercise: Exercise = {
                id: crypto.randomUUID(),
                muscleGroupId: muscleGroupId,
                title: title,
                log: []
            };

            workout.muscleGroup[muscleGroupIndex].exercises.push(newExercise);

            // Save to local storage
            this.saveToStorage(workouts);

            return newExercise;
        } catch (error) {
            console.error('Error adding exercise:', error);
            throw error;
        }
    }

    async deleteExercise(exerciseId: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the exercise
            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            // Find the muscle group containing the exercise
            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            // Remove the exercise
            muscleGroup.exercises = muscleGroup.exercises.filter(ex => ex.id !== exerciseId);

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error deleting exercise:', error);
            throw error;
        }
    }

    async updateExercise(exerciseId: string, title: string): Promise<Exercise> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the exercise
            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            // Find the muscle group containing the exercise
            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            // Find and update the exercise
            const exerciseIndex = muscleGroup.exercises.findIndex(ex => ex.id === exerciseId);

            if (exerciseIndex === -1) {
                throw new Error('Exercise not found');
            }

            muscleGroup.exercises[exerciseIndex] = {
                ...muscleGroup.exercises[exerciseIndex],
                title: title
            };

            // Save to local storage
            this.saveToStorage(workouts);

            return muscleGroup.exercises[exerciseIndex];
        } catch (error) {
            console.error('Error updating exercise:', error);
            throw error;
        }
    }

    async clearAllExercises(muscleGroupId: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the muscle group
            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            // Find the muscle group
            const muscleGroup = workout.muscleGroup.find(mg => mg.id === muscleGroupId);

            if (!muscleGroup) {
                throw new Error('Muscle group not found');
            }

            // Clear all exercises from the muscle group
            muscleGroup.exercises = [];

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error clearing exercises:', error);
            throw error;
        }
    }

    async getExerciseById(exerciseId: string): Promise<Exercise | undefined> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the exercise
            for (const workout of workouts) {
                for (const muscleGroup of workout.muscleGroup) {
                    const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);
                    if (exercise) {
                        return exercise;
                    }
                }
            }

            return undefined;
        } catch (error) {
            console.error('Error loading exercise:', error);
            return undefined;
        }
    }

    async addLog(model: AddLogModel): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the exercise
            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === model.exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            // Find the muscle group containing the exercise
            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === model.exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            // Find the exercise
            const exercise = muscleGroup.exercises.find(ex => ex.id === model.exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            // Add new log entry
            exercise.log.push({
                id: crypto.randomUUID(),
                numberReps: model.numberReps,
                maxWeight: model.maxWeight
            });

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error adding log:', error);
            throw error;
        }
    }

    async updateLog(model: UpdateLogModel): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the exercise
            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === model.exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            // Find the muscle group containing the exercise
            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === model.exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            // Find the exercise
            const exercise = muscleGroup.exercises.find(ex => ex.id === model.exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            // Find and update the log entry
            const logIndex = exercise.log.findIndex(log => log.id === model.logId);

            if (logIndex === -1) {
                throw new Error('Log not found');
            }

            exercise.log[logIndex] = {
                ...exercise.log[logIndex],
                numberReps: model.numberReps,
                maxWeight: model.maxWeight
            };

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error updating log:', error);
            throw error;
        }
    }

    async deleteLog(exerciseId: string, logId: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the exercise
            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            // Find the muscle group containing the exercise
            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            // Find the exercise
            const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            // Remove the log entry
            exercise.log = exercise.log.filter(log => log.id !== logId);

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error deleting log:', error);
            throw error;
        }
    }

    async clearAllLogs(exerciseId: string): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Load current workouts from storage
            const workouts = this.loadFromStorage() ?? [];

            // Find the workout containing the exercise
            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            // Find the muscle group containing the exercise
            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            // Find the exercise
            const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            // Clear all log entries
            exercise.log = [];

            // Save to local storage
            this.saveToStorage(workouts);
        } catch (error) {
            console.error('Error clearing logs:', error);
            throw error;
        }
    }
}
