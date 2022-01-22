// Angular Core Modules
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';

// Application modules
import { AppRoutingModule } from './app-routing.module';

// Main component
import { AppComponent } from './app.component';

// Angular Material Modules
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatPaginatorIntl } from '@angular/material/paginator';

// Core components
import { OkSnackComponent } from './core/alerts/ok-snack.component';
import { BadRequestSnackComponent } from './core/alerts/bad-request-snack.component';
import { HttpErrorSnackComponent } from './core/alerts/http-error-snack.component';
import { HttpDownSnackComponent } from './core/alerts/http-down-snack.component';
import { InvalidRequestSnackComponent } from './core/alerts/invalid-request-snack.component';
import { ConflictSnackComponent } from './core/alerts/conflict-snack.component';
import { NotFoundSnackComponent } from './core/alerts/not-found-snack.component';
import { WarningDialogComponent } from './core/warning-dialog/warning-dialog.component';
import { CustomMatPaginatorIntl } from './core/custom.mat.paginator.intl';
import { CustomMaterialModule } from './core/material.module';

// Firebase
import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireDatabaseModule } from '@angular/fire/database';
import { environment } from '../environments/environment';

// Pipes
import {
  DateFormatPipe,
  DateTimeFormatPipe,
  YearDateFormatPipe,
  TimeFormatPipe,
} from './core/date-formatter/date-formatter';
import { ArraySortPipe } from './core/sort.pipe';

// Shared presentation components and supporting services
import { LoginComponent } from './login/login.component';
import { LoginFormComponent } from './login/login-form/login-form.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const CUSTOM_DATE_FORMAT = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@NgModule({
  declarations: [
    WarningDialogComponent,
    InvalidRequestSnackComponent,
    ConflictSnackComponent,
    NotFoundSnackComponent,
    OkSnackComponent,
    BadRequestSnackComponent,
    HttpDownSnackComponent,
    HttpErrorSnackComponent,
    ArraySortPipe,
    DateFormatPipe,
    YearDateFormatPipe,
    DateTimeFormatPipe,
    TimeFormatPipe,
    AppComponent,
    LoginComponent,
    LoginFormComponent,
    DashboardComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    CustomMaterialModule,
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFirestoreModule, // imports firebase/firestore, only needed for database features
    AngularFireAuthModule, // imports firebase/auth, only needed for auth features
    AngularFireDatabaseModule,
    AppRoutingModule,
  ],
  entryComponents: [
    OkSnackComponent,
    BadRequestSnackComponent,
    HttpDownSnackComponent,
    HttpErrorSnackComponent,
    InvalidRequestSnackComponent,
    ConflictSnackComponent,
    NotFoundSnackComponent,
    WarningDialogComponent,
  ],
  providers: [
    ArraySortPipe,
    DateFormatPipe,
    YearDateFormatPipe,
    DateTimeFormatPipe,
    TimeFormatPipe,
    DatePipe,
    { provide: MAT_DATE_LOCALE, useValue: 'he' },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMAT },
    { provide: MatPaginatorIntl, useClass: CustomMatPaginatorIntl },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
