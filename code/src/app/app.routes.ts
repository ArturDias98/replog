import { Routes } from '@angular/router';
import { Workout } from './workout/workout';
import { MuscleGroupComponent } from './muscle-group/muscle-group';

export const routes: Routes = [
    { path: '', component: Workout },
    { path: 'workout/:id/muscle-groups', component: MuscleGroupComponent }
];
