import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { WorkOutGroup } from '../models/workout-group';

@Component({
    selector: 'app-workout',
    imports: [DatePipe],
    templateUrl: './workout.html',
    styleUrl: './workout.css'
})
export class Workout implements OnInit {
    private readonly router = inject(Router);
    private readonly http = inject(HttpClient);

    protected readonly items = signal<WorkOutGroup[]>([]);

    ngOnInit(): void {
        this.http.get<WorkOutGroup[]>('sample-data.json').subscribe(data => {
            this.items.set(data);
        });
    }

    protected navigateToMuscleGroups(workoutId: string): void {
        const workout = this.items().find(item => item.id === workoutId);
        this.router.navigate(['workout', workoutId, 'muscle-groups'], {
            state: { muscleGroups: workout?.muscleGroup || [] }
        });
    }
}
