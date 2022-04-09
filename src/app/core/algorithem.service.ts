import { Injectable } from '@angular/core';
import { Globals } from '../app.globals';
import { Inlay } from '../models/inlay.interfcae';
import { Order } from '../models/order.interface';
import { SessionStorageService } from './session-storage-service';

import * as moment from "moment/moment";

import { Route } from '../models/route.interface';
import { OrderStatus } from '../models/order-status.enum';
import { DatabaseService } from '../services/database.service';
import { Driver } from '../models/driver.interface';
import { DriverConstraint } from '../models/driver-constraint';
import { LicenseType } from '../models/license-type.enum';
import { RunningInaly } from '../models/running-inlay.interface';

@Injectable({
  providedIn: 'root',
})
export class AlgorithemService {
  private readonly IMPORTANT_SCORE = Number.MAX_SAFE_INTEGER;
  private cities: any[] = [];
  private days: string[] = [
    'ראשון',
    'שני',
    'שלישי',
    'רביעי',
    'חמישי',
    'שישי',
    'שבת'
  ];

  constructor(
    public globals: Globals,
    private db: DatabaseService,
    private sessionStorageService: SessionStorageService,
  ) {
    this.db.getCitiesJSON().subscribe(data => {
      this.cities = data;
    });
  }

  run(orders: Order[]): RunningInaly[] {
    let inlays: Inlay[] = [];
    let runningInalys: RunningInaly[] = [];

    const drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
    const routes = JSON.parse(this.sessionStorageService.getItem('routes'));
    
    // שלב מקדים - סידור לפי חשיבות הזמנה
    orders.sort(function(x, y) {
        // true values first
        return (x.important === y.important) ? 0 : x.important ? -1 : 1;
        // false values first
        // return (x.important === y.important) ? 0 : x.important ? 1 : -1;
    });
    
    // שלב א׳ - מסלולים קבועים בימים קבועים
    for (let d = 0; d < this.days.length; d++) {
      let dailyRoutes: Route[] = routes.filter((r: Route) => r.distributionDays.includes(this.days[d]));
      let dailyOrders: Order[] = orders
        .filter(o => ![OrderStatus.DELIVERD, OrderStatus.INLAY].includes(o.orderStatus))
        .filter(o => this.days[moment(o.deliveryDate).toDate().getDay()] === this.days[d]);
      
      for (let i = 0; i < dailyOrders.length; i++) {
        let order = dailyOrders[i];
        let dailyRoute = dailyRoutes
          .find(d => d.distributionAreas.includes(this.getLishkaByCity(order.deliveryCity)));
          
        if (dailyRoute) {
          let date = this.getAvailableDateForOrder(dailyRoute);
          let driver = drivers
            .filter((d: Driver) => !!this.isDriverAvailable(d, date) && d.licenseType === dailyRoute?.licenseType)
            .find((d: Driver) => d.licenseType === dailyRoute?.licenseType);
          
          if (order && driver) {
            inlays.push({
              uid: this.globals.randomAlphaNumeric(20),
              date: date,
              orderDate: order.deliveryDate,
              route: dailyRoute,
              order: order,
              driver: driver
            } as Inlay);
  
            // שינוי סטטוס הזמנה לשובצה
            order.orderStatus = OrderStatus.INLAY;
          }
        }
      }
    }

    // שלב ב׳ - בדיקת חריגות משקל ומסלול

    // קיבוץ לפי מסלול, נהג ותאריך זהים
    var runningInalysObj: object = inlays.reduce(function (r, a) {
      const uid = `${a.date}-${a.driver.uid}-${a.route.uid}`;
        r[uid] = r[uid] || [];
        r[uid].push(a);
        return r;
    }, Object.create(null));

    // סידור נקודות ההפצה לפי מרחקים
    for (let [key, inlays] of Object.entries(runningInalysObj)) {
      this.sortByDistances(runningInalysObj, key);
    }

    for (let [key, inlays] of Object.entries(runningInalysObj)) {
      const driver: Driver = inlays[0].driver;
      
      // בדיקה אם יש חריגת משקל וביצוע איזון
      while (this.isOverweight(inlays, driver)) {
        const inlay: Inlay = inlays.find((i: Inlay) => this.isOverweight([i], driver)); // בדיקה אולי יש הזמנה בודדת שחורגת מהמשקל הכולל
        if (inlay) {
          inlays = inlays.filter((i: Inlay) => i.uid !== inlay.uid);
        }
        else {
          inlays.pop(); // מחיקת האחרונה
        }
      }

      runningInalys.push({
        date: inlays[0].date,
        driver: inlays[0].driver,
        route: inlays[0].route,
        orders: inlays.map((i: Inlay) => i.order)
      } as RunningInaly);
    }

    console.log(runningInalys);
    return runningInalys;
  }

  private isOverweight(inlays: Inlay[], driver: Driver): boolean {
    const totalWeight: number = inlays?.reduce((p: number, c: Inlay) => p + c.order.orderWeight, 0) ?? 0;
    
    if (driver.licenseType === LicenseType.TON3 && totalWeight > 3) {
      return true;
    }
    else if (driver.licenseType === LicenseType.TON4 && totalWeight > 4) {
      return true;
    }
    else if (driver.licenseType === LicenseType.TON8 && totalWeight > 8) {
      return true;
    }
    else if (driver.licenseType === LicenseType.TON12 && totalWeight > 12) {
      return true;
    }
    
    return false;
  }

  private sortByDistances(runningInalys: any, key: string) {
    return runningInalys[key].sort((i1: Inlay, i2: Inlay) =>
      (+this.cities.find((c: any) => c.name === i1.order.deliveryCity)?.marlog_distance) -
      (+this.cities.find((c: any) => c.name === i2.order.deliveryCity)?.marlog_distance));
  }

  private getAvailableDateForOrder(route: Route): Date {
    let today = new Date();
    const routeDeliveryDays = route.distributionDays.map(d=>this.days.indexOf(d)).sort();
    const thisWeekPossibleDay = routeDeliveryDays.find(d => d >= today.getDay());
    
    if (thisWeekPossibleDay) {
      return moment().day(thisWeekPossibleDay).toDate();
    }
    else {
      return moment().add(1, 'weeks').startOf('week').add(Math.min(...routeDeliveryDays), 'days').toDate();
    }
  }

  private isDriverAvailable(driver: Driver, date: Date): boolean {
    let driverConstraints: DriverConstraint[] = JSON.parse(this.sessionStorageService.getItem('driver-constraints'));
    driverConstraints = driverConstraints.filter(c => c.driver === driver.uid);
    return !driverConstraints.find(c => moment(c.date).isSame(date, 'day'));
  }

  private getLishkaByCity(city: string): any {
    const c = this.cities.find((c: any) => c.name === city);
    return c ? c['lishka'] : '';
  }
}
