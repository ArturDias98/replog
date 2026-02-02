import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
