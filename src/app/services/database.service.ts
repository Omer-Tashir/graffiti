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
import { DriverConstraint } from '../models/driver-constraint';
import { HttpClient } from '@angular/common/http';
import { Globals } from '../app.globals';
import { Order } from '../models/order.interface';
import { Inlay } from '../models/inlay.interfcae';
import { Route } from '../models/route.interface';
import { OrderStatus } from '../models/order-status.enum';
import { RunningInaly } from '../models/running-inlay.interface';


@Injectable({
    providedIn: 'root',
})
export class DatabaseService {

    constructor(
        private http: HttpClient,
        private globals: Globals,
        private db: AngularFirestore,
        private SessionStorageService: SessionStorageService
    ) { }

    init(): Observable<boolean> {
        return forkJoin([
            this.getManagers().pipe(first()),
            this.getDrivers().pipe(first()),
            this.getDriverConstraints().pipe(first()),
            this.getDistManagers().pipe(first()),
            this.getOrders().pipe(first()),
            this.getRoutes().pipe(first()),
        ]).pipe(
            switchMap(() => this.getRunningInlays().pipe(first())),
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
                    const result = <Manager>doc.data();
                    result.uid = doc.id;
                    return result;
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
                    const result = <Driver>doc.data();
                    result.uid = doc.id;
                    return result;
                })),
                tap(result => this.SessionStorageService.setItem('drivers', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('drivers')));
        }
    }

    private getDriverConstraints(): Observable<DriverConstraint[]> {
        if (!this.SessionStorageService.getItem('driver-constraints')) {
            return this.db.collection(`driver-constraints`).get().pipe(
                map(result => result.docs.map(doc => {
                    const result = <DriverConstraint>doc.data();
                    result.date = new Date(result.date.seconds * 1000);
                    result.id = doc.id;
                    return result;
                })),
                tap(result => this.SessionStorageService.setItem('driver-constraints', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('driver-constraints')));
        }
    }

    private getDistManagers(): Observable<DistManager[]> {
        if (!this.SessionStorageService.getItem('dist-managers')) {
            return this.db.collection(`dist-manager`).get().pipe(
                map(result => result.docs.map(doc => {
                    const result = <DistManager>doc.data();
                    result.uid = doc.id;
                    return result;
                })),
                tap(result => this.SessionStorageService.setItem('dist-managers', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('dist-managers')));
        }
    }

    private getOrders(): Observable<Order[]> {
        if (!this.SessionStorageService.getItem('orders')) {
            return this.db.collection(`order`).get().pipe(
                map(result => result.docs.map(doc => {
                    const result = <Order>doc.data();
                    result.uid = doc.id;
                    result.deliveryDate = result.deliveryDate;
                    return result;
                })),
                tap(result => this.SessionStorageService.setItem('orders', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('orders')));
        }
    }

    private getRoutes(): Observable<Route[]> {
        if (!this.SessionStorageService.getItem('routes')) {
            return this.db.collection(`route`).get().pipe(
                map(result => result.docs.map(doc => {
                    const result = <Route>doc.data();
                    result.uid = doc.id;
                    return result;
                })),
                tap(result => this.SessionStorageService.setItem('routes', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('routes')));
        }
    }

    private getRunningInlays(): Observable<RunningInaly[]> {
        if (!this.SessionStorageService.getItem('running-inlays')) {
            return this.db.collection(`running-inlays`).get().pipe(
                map(result => result.docs.map(doc => {
                    const result = <RunningInaly>doc.data();
                    result.uid = doc.id;
                    result.date = new Date(result.date.seconds * 1000);
                    result.orders = JSON.parse(this.SessionStorageService.getItem('orders')).filter((o: Order) => result.orders.includes(o.uid));
                    result.driver = JSON.parse(this.SessionStorageService.getItem('drivers')).filter((d: Driver) => d.uid === result.driver)[0];
                    result.route = JSON.parse(this.SessionStorageService.getItem('routes')).filter((r: Route) => r.uid === result.route)[0];
                    return result;
                })),
                tap(result => this.SessionStorageService.setItem('running-inlays', JSON.stringify(result))),
                catchError(err => of([])),
            );
        }
        else {
            return of(JSON.parse(this.SessionStorageService.getItem('running-inlays')));
        }
    }

    updateDriver(driver: Driver): Promise<any> {
        return this.db
            .collection(`driver`)
            .doc(driver.uid)
            .set(driver).then(() => {
                let drivers = JSON.parse(this.SessionStorageService.getItem('drivers'));
                let index = drivers.findIndex((d: Driver) => d.uid === driver.uid);
                drivers[index] = driver;
                this.SessionStorageService.setItem('drivers', JSON.stringify(drivers));
            }).then(() => { return driver.uid });
    }

    putDriver(driver: Driver, isNewRecord: boolean = true): Promise<any> {
        return this.db
            .collection(`driver`)
            .doc(driver.uid)
            .set(driver).then(() => {
                let drivers = JSON.parse(this.SessionStorageService.getItem('drivers')) ?? [];
                if (isNewRecord) {
                    drivers.push(driver);
                    this.SessionStorageService.setItem('drivers', JSON.stringify(drivers));
                }
                else {
                    let index = drivers.findIndex((d: Driver) => d.uid === driver.uid);
                    if (index !== -1) {
                        drivers[index] = driver;
                        this.SessionStorageService.setItem('drivers', JSON.stringify(drivers));
                    }
                }
            }).then(() => { return driver.uid });
    }

    putOrder(order: Order, isNewRecord: boolean = true): Promise<any> {
        return this.db
            .collection(`order`)
            .doc(order.uid)
            .set(order).then(() => {
                let orders = JSON.parse(this.SessionStorageService.getItem('orders')) ?? [];
                if (isNewRecord) {
                    orders.push(order);
                    this.SessionStorageService.setItem('orders', JSON.stringify(orders));
                }
                else {
                    let index = orders.findIndex((o: Order) => o.uid === order.uid);
                    if (index !== -1) {
                        orders[index] = order;
                        this.SessionStorageService.setItem('orders', JSON.stringify(orders));
                    }
                }
            }).then(() => { return order.uid });
    }

    putRoute(route: Route, isNewRecord: boolean = true): Promise<any> {
        return this.db
            .collection(`route`)
            .doc(route.uid)
            .set(route).then(() => {
                let routes = JSON.parse(this.SessionStorageService.getItem('routes')) ?? [];
                if (isNewRecord) {
                    routes.push(route);
                    this.SessionStorageService.setItem('routes', JSON.stringify(routes));
                }
                else {
                    let index = routes.findIndex((r: Route) => r.uid === route.uid);
                    if (index !== -1) {
                        routes[index] = route;
                        this.SessionStorageService.setItem('routes', JSON.stringify(routes));
                    }
                }
            }).then(() => { return route.uid });
    }

    putDriverConstraint(id: any, date: Date, comment?: string): Promise<any> {
        const randomId = this.globals.randomAlphaNumeric(20);
        return this.db
            .collection(`driver-constraints`)
            .doc(randomId)
            .set({ driver: id, date, id: randomId, comment }).then(() => {
                let driver = JSON.parse(this.SessionStorageService.getItem('drivers')).find((d: Driver) => d.uid === id);
                let driverConstraints = JSON.parse(this.SessionStorageService.getItem('driver-constraints')) ?? [];
                driverConstraints.push({ id: randomId, driver, date, comment } as DriverConstraint);
                this.SessionStorageService.setItem('driver-constraints', JSON.stringify(driverConstraints));
            }).then(() => { return randomId});
    }

    putRunningInlay(inlay: RunningInaly, isNewRecord: boolean = true): Promise<any> {
        const randomId = this.globals.randomAlphaNumeric(20);
        inlay.uid = inlay.uid ?? randomId;
        return this.db
            .collection(`running-inlays`)
            .doc(inlay.uid)
            .set({
                uid: inlay.uid,
                date: moment(inlay.date).toDate(),
                orders: inlay.orders.map((o: Order)=>o.uid),
                driver: inlay.driver.uid,
                route: inlay.route.uid,
            }).then(() => {
                let inlays = JSON.parse(this.SessionStorageService.getItem('running-inlays')) ?? [];
                if (isNewRecord) {
                    inlays.push(inlay);
                    this.SessionStorageService.setItem('running-inlays', JSON.stringify(inlays));
                }
                else {
                    let index = inlays.findIndex((i: Inlay) => i.uid === inlay.uid);
                    if (index !== -1) {
                        inlays[index] = inlay;
                        this.SessionStorageService.setItem('running-inlays', JSON.stringify(inlays));
                    }
                }

                let orders = inlay.orders;
                for (let order of orders) {
                    this.putOrder(order, false);
                }
            })
            .then(() => { return inlay.uid });
    }

    removeDriverConstraint(id: any): Promise<any> {
        return this.db
            .collection(`driver-constraints`)
            .doc(id)
            .delete()
            .then(() => {
                let driverConstraints = JSON.parse(this.SessionStorageService.getItem('driver-constraints'))?? [];
                driverConstraints = driverConstraints.filter((d: DriverConstraint) => d.id !== id);
                this.SessionStorageService.setItem('driver-constraints', JSON.stringify(driverConstraints));
            })
    }

    removeOrder(order: Order): Promise<any> {
        return this.db
            .collection(`order`)
            .doc(order.uid)
            .delete()
            .then(() => {
                let orders = JSON.parse(this.SessionStorageService.getItem('orders'))?? [];
                orders = orders.filter((d: Order) => d.uid !== order.uid);
                this.SessionStorageService.setItem('orders', JSON.stringify(orders));
            })
    }

    removeRoute(route: Route): Promise<any> {
        return this.db
            .collection(`route`)
            .doc(route.uid)
            .delete()
            .then(() => {
                let routes = JSON.parse(this.SessionStorageService.getItem('routes'))?? [];
                routes = routes.filter((d: Route) => d.uid !== route.uid);
                this.SessionStorageService.setItem('routes', JSON.stringify(routes));
            })
    }

    removeDriver(driver: Driver): Promise<any> {
        return this.db
            .collection(`driver`)
            .doc(driver.uid)
            .delete()
            .then(() => {
                let drivers = JSON.parse(this.SessionStorageService.getItem('drivers'))?? [];
                drivers = drivers.filter((d: Driver) => d.uid !== driver.uid);
                this.SessionStorageService.setItem('drivers', JSON.stringify(drivers));
            })
    }

    removeRunningInlay(inlay: RunningInaly): Promise<any> {
        return this.db
            .collection(`running-inlays`)
            .doc(inlay.uid)
            .delete()
            .then(() => {
                let inlays = JSON.parse(this.SessionStorageService.getItem('running-inlays'))?? [];
                inlays = inlays.filter((d: RunningInaly) => d.uid !== inlay.uid);
                this.SessionStorageService.setItem('running-inlays', JSON.stringify(inlays));
            }).then(() => {
                inlay.orders.forEach((o: Order) => {
                    o.orderStatus = OrderStatus.PENDING;
                    this.putOrder(o, false);
                });
            })
    }

    getCitiesJSON(): Observable<any> {
        let response = this.http.get("./assets/israel-cities.json");
        return response
    }

    getStreetsJSON(): Observable<any> {
        let response = this.http.get("./assets/israel-streets.json");
        return response
    }
}