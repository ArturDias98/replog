import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MuscleGroup } from '../models/muscle-group';

@Component({
    selector: 'app-muscle-group',
    imports: [DatePipe],
    templateUrl: './muscle-group.html',
    styleUrl: './muscle-group.css'
})
export class MuscleGroupComponent implements OnInit {
    private readonly router = inject(Router);

    protected readonly muscleGroups = signal<MuscleGroup[]>([]);

    ngOnInit(): void {
        const state = history.state;
        if (state?.['muscleGroups']) {
            this.muscleGroups.set(state['muscleGroups']);
        }
    }
}
