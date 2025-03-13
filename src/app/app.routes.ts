import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { GroupsComponent } from './components/groups/groups.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { ActivityComponent } from './components/activity/activity.component';
import { ActivityDetailComponent } from './components/activity-detail/activity-detail.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { UserPreferencesComponent } from './components/user-preferences/user-preferences.component';
import { LikedActivitiesComponent } from './components/liked-activities/liked-activities.component';
import { WeatherComponent } from './components/weather/weather.component';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

// Auth guard function to protect routes
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && !authService.isGuest()) {
    return true;
  }

  return router.parseUrl('/login');
};

export const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent },
  { path: 'activities', component: ActivityComponent },
  { path: 'activities/:id', component: ActivityDetailComponent },
  {
    path: 'profile',
    component: UserProfileComponent,
    canActivate: [() => authGuard()],
  },
  {
    path: 'groups',
    component: GroupsComponent,
    canActivate: [() => authGuard()],
  },
  {
    path: 'groups/:id',
    component: GroupsComponent,
    canActivate: [() => authGuard()],
  },
  {
    path: 'calendar',
    component: CalendarComponent,
    canActivate: [() => authGuard()],
  },
  {
    path: 'user-preferences',
    component: UserPreferencesComponent,
    canActivate: [() => authGuard()],
  },
  {
    path: 'liked-activities',
    component: LikedActivitiesComponent,
    canActivate: [() => authGuard()],
  },
  { path: 'dashboard', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'weather',
    component: WeatherComponent,
    canActivate: [() => authGuard()],
  },
  { path: '**', redirectTo: 'welcome' }, // Catch-all route for 404
];
