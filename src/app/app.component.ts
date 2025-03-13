import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WelcomeComponent } from './components/welcome/welcome.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WelcomeComponent],
  templateUrl: './app.component.html',
  standalone: true,
})
export class AppComponent {
  title = 'familyfunplannings';
}
