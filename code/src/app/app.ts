import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatePipe } from '@angular/common';
import { WorkOutGroup } from './models/workout-group';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly items = signal<WorkOutGroup[]>([
    { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', title: 'Upper/Lower', date: '2026-01-20', userId: 'google-oauth-user-12345', muscleGroup: [] },
    { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', title: 'Full Body', date: '2026-01-22', userId: 'google-oauth-user-12345', muscleGroup: [] },
    { id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', title: 'ABCDE', date: '2026-01-25', userId: 'google-oauth-user-12345', muscleGroup: [] },
  ]);
}
