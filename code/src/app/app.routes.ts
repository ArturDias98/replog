import { Routes } from '@angular/router';
import { Workout } from './components/workout/workout';
import { MuscleGroupComponent } from './components/muscle-group/muscle-group';

export const routes: Routes = [
    { path: '', component: Workout },
    { path: 'workout/:id/muscle-groups', component: MuscleGroupComponent }
];
