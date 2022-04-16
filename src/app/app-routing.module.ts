import { NgModule } from '@angular/core';
import { Router, RouterModule, Routes } from '@angular/router';

import { isDistManagerGuard, isDistManagerOrManageGuard, isDriverGuard, isDriverOrDistManagerGuard, isLoggedInGuard, isManagerGuard } from './services/auth.guard';
import { AuthService } from './services/auth.service';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProfileComponent } from './dashboard/dashboard-driver/profile/profile.component';
import { SchedulingComponent } from './dashboard/dashboard-dist-manager/scheduling/scheduling.component';
import { ViewUpdateRoutesComponent } from './dashboard/dashboard-dist-manager/view-update-routes/view-update-routes.component';
import { DriverConstraintsComponent } from './dashboard/dashboard-driver/driver-constraints/driver-constraints.component';
import { DriverRoutesComponent } from './dashboard/dashboard-driver/driver-routes/driver-routes.component';
import { DriversComponent } from './dashboard/dashboard-manager/drivers/drivers.component';
import { OrdersComponent } from './dashboard/dashboard-manager/orders/orders.component';
import { OrdersTrackerComponent } from './dashboard/dashboard-manager/orders-tracker/orders-tracker.component';
import { ReportsComponent } from './dashboard/dashboard-manager/reports/reports.component';

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
    canActivate: [isLoggedInGuard],
    children: [
      {
        path: '',
        component: DashboardComponent,
        canActivate: [isLoggedInGuard],
      },
      {
        path: 'view-update-routes',
        component: ViewUpdateRoutesComponent,
        canActivate: [isLoggedInGuard, isDistManagerOrManageGuard]
      },
      {
        path: 'scheduling',
        component: SchedulingComponent,
        canActivate: [isLoggedInGuard, isDistManagerGuard]
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [isLoggedInGuard, isDriverGuard]
      },
      {
        path: 'driver-constraints',
        component: DriverConstraintsComponent,
        canActivate: [isLoggedInGuard, isDriverOrDistManagerGuard]
      },
      {
        path: 'drivers',
        component: DriversComponent,
        canActivate: [isLoggedInGuard, isManagerGuard]
      },
      {
        path: 'orders',
        component: OrdersComponent,
        canActivate: [isLoggedInGuard, isManagerGuard]
      },
      {
        path: 'reports',
        component: ReportsComponent,
        canActivate: [isLoggedInGuard, isDistManagerOrManageGuard]
      },
      {
        path: 'orders-tracker',
        component: OrdersTrackerComponent,
        canActivate: [isLoggedInGuard, isDistManagerOrManageGuard]
      },
      {
        path: 'driver-routes/:type',
        component: DriverRoutesComponent,
        canActivate: [isLoggedInGuard, isDriverGuard],
      },
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
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
