import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { catchError, first, map, switchMap, tap } from 'rxjs/operators';
import { forkJoin, from, Observable, of } from 'rxjs';

import * as moment from 'moment/moment';

import { SessionStorageService } from '../core/session-storage-service';
import { Manager } from '../models/manager.interface';
import { Driver } from '../models/driver.interface';
import { DistManager } from '../models/dist-manager.interface';
import { UserType } from '../models/user-type.enum';


@Injectable({
    providedIn: 'root',
})
export class DatabaseService {

    constructor(
        private db: AngularFirestore,
        private SessionStorageService: SessionStorageService
    ) { }

    init(): Observable<boolean> {
        return forkJoin([
            this.getManagers().pipe(first()),
            this.getDrivers().pipe(first()),
            this.getDistManagers().pipe(first()),
        ]).pipe(
            map(results => !!results)
        );
    }

    login(email: string, userType: UserType): Observable<boolean> {
        switch (userType) {
            case UserType.MANAGER:
                return this.db.collection(`manager`, ref => ref.where('email', '==', email).limit(1)).get().pipe(
                    first(),
                    map(res => !res.empty)
                );
            
            case UserType.DRIVER:
                return this.db.collection(`driver`, ref => ref.where('email', '==', email).limit(1)).get().pipe(
                    first(),
                    map(res => !res.empty)
                );
            
            case UserType.DIST_MANAGER:
                return this.db.collection(`dist-manager`, ref => ref.where('email', '==', email).limit(1)).get().pipe(
                    first(),
                    map(res => !res.empty)
                );
        }
    }

    private getManagers(): Observable<Manager[]> {
        if (!this.SessionStorageService.getItem('managers')) {
            return this.db.collection(`manager`).get().pipe(
                map(result => result.docs.map(doc => {
                    return <Manager>doc.data();
                })),
                tap(result => this.SessionStorageService.setItem('managers', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('managers')));
        }
    }

    private getDrivers(): Observable<Driver[]> {
        if (!this.SessionStorageService.getItem('drivers')) {
            return this.db.collection(`driver`).get().pipe(
                map(result => result.docs.map(doc => {
                    return <Driver>doc.data();
                })),
                tap(result => this.SessionStorageService.setItem('drivers', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('drivers')));
        }
    }

    private getDistManagers(): Observable<DistManager[]> {
        if (!this.SessionStorageService.getItem('dist-managers')) {
            return this.db.collection(`dist-manager`).get().pipe(
                map(result => result.docs.map(doc => {
                    return <DistManager>doc.data();
                })),
                tap(result => this.SessionStorageService.setItem('dist-managers', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('dist-managers')));
        }
    }
}