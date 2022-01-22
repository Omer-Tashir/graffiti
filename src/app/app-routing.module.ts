import { NgModule } from '@angular/core';
import { Router, RouterModule, Routes } from '@angular/router';

import { isLoggedInGuard } from './services/auth.guard';
import { AuthService } from './services/auth.service';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [isLoggedInGuard]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload', scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { 
  constructor(private router: Router, private authService: AuthService) {
    this.router.errorHandler = (error: any) => {
      console.log(error);
      this.authService.logout();
    };
  }
}
