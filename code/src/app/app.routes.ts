import { Routes } from '@angular/router';
import { Workout } from './components/workout/workout';
import { MuscleGroupComponent } from './components/muscle-group/muscle-group';
import { ExercisesComponent } from './components/exercises/exercises';

export const routes: Routes = [
    { path: '', component: Workout },
    { path: 'muscle-group/:workoutId', component: MuscleGroupComponent },
    { path: 'exercises/:muscleGroupId', component: ExercisesComponent }
];
