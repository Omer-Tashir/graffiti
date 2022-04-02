import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { HttpErrorResponse } from '@angular/common/http';

import { SessionStorageService } from '../core/session-storage-service';
import { AlertService } from '../core/alerts/alert.service';
import { UserType } from '../models/user-type.enum';
import { Manager } from '../models/manager.interface';
import { Driver } from '../models/driver.interface';
import { DistManager } from '../models/dist-manager.interface';
import { DatabaseService } from './database.service';
import { iif, of } from 'rxjs';
import { filter, first, map, switchMap, tap } from 'rxjs/operators';
import { User } from '../models/user.interface';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    managers: Manager[] = [];
    drivers: Driver[] = [];
    distManagers: DistManager[] = [];

    constructor(
        private db: DatabaseService,
        private afAuth: AngularFireAuth,
        private router: Router,
        private alertService: AlertService,
        private sessionStorageService: SessionStorageService,
    ) { }

    login(email: string, password: string, userType: UserType) {
        this.db.login(email, userType).pipe(
            first(),
            tap(res => {
                if (!res) {
                    this.alertService.ok('שגיאת התחברות', 'לא נמצא משתמש עבור הפרטים שהוזנו');
                }
            }),
            filter(res => res),
            map(() => this.signInWithFireAuth(email, password, userType))
        ).subscribe();
    }

    private signInWithFireAuth(email: string, password: string, userType: UserType): void {
        this.afAuth
            .signInWithEmailAndPassword(email, password)
            .then((auth) => {
                sessionStorage.setItem('user', JSON.stringify(auth.user));
                this.db.init().pipe(first()).subscribe(() => {
                    this.managers = JSON.parse(this.sessionStorageService.getItem('managers'));
                    this.drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
                    this.distManagers = JSON.parse(this.sessionStorageService.getItem('dist-managers'));
                    let user: Manager | Driver | DistManager | undefined;

                    switch (userType) {
                        case UserType.MANAGER:
                            user = this.managers.find(a => a.email === email);
                            sessionStorage.setItem('manager', JSON.stringify(user));
                            break;
                        case UserType.DRIVER:
                            user = this.drivers.find(a => a.email === email);
                            sessionStorage.setItem('driver', JSON.stringify(user));
                            break;
                        case UserType.DIST_MANAGER:
                            user = this.distManagers.find(a => a.email === email);
                            sessionStorage.setItem('dist-manager', JSON.stringify(user));
                            break;
                    }

                    if (!auth.user?.displayName) {
                        auth.user?.updateProfile({
                            displayName: user?.displayName
                        }).then(() => {
                            this.router.navigate(['dashboard']);
                        });
                    }
                    else {
                        this.router.navigate(['dashboard']);
                    }
                });
            })
            .catch((error: any) => {
                console.log(error);
                this.alertService.httpError(error);
            });
    }

    logout(error?: HttpErrorResponse | undefined) {
        if (error != undefined) {
            this.alertService.httpError(error);
        }

        this.afAuth.signOut();
        sessionStorage.clear();
        this.router.navigate(['login']);
    }
}