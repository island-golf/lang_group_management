import {Component, signal} from '@angular/core';
import {RouterModule} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatCard} from '@angular/material/card';
import {MatLabel, MatFormField} from '@angular/material/form-field';
import {MatInput} from '@angular/material/input';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [RouterModule],
  styleUrl: './app.scss'
})
export class AppComponent {
  protected readonly title = signal('lang_group_management');
  sidebarOpen = true;
}
