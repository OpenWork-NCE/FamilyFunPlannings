import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { GroupsComponent } from './components/groups/groups.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { ActivityDetailComponent } from './components/activity-detail/activity-detail.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { LikedActivitiesComponent } from './components/liked-activities/liked-activities.component';
import { WeatherComponent } from './components/weather/weather.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ResetPasswordConfirmComponent } from './components/reset-password-confirm/reset-password-confirm.component';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

// Auth guard function to protect routes
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if the user is authenticated and not in guest mode
  if (authService.isAuthenticated() && !authService.isGuest()) {
    console.log('[AuthGuard] User authenticated and not a guest');
    return true;
  }

  console.log('[AuthGuard] User not authenticated or is a guest, redirecting to login');
  // If user is not authenticated, redirect to login
  return router.parseUrl('/login');
};

export const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'reset-password-confirm', component: ResetPasswordConfirmComponent },
  { path: 'activities/:id', component: ActivityDetailComponent },
  {
    path: 'user-profile',
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
    path: 'profile',
    component: UserProfileComponent,
    canActivate: [() => authGuard()],
  },
  {
    path: 'favorites',
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
