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
    { id: 1, title: 'Upper/Lower', date: new Date('2026-01-20') },
    { id: 2, title: 'Full Body', date: new Date('2026-01-22') },
    { id: 3, title: 'ABCDE', date: new Date('2026-01-25') },
  ]);
}
