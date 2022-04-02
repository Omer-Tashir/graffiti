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

  run(orders: Order[]): Inlay[] {
    let inlays: Inlay[] = [];
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
        let dailyRoute = dailyRoutes.find(d => d.distributionAreas.includes(this.getLishkaByCity(order.deliveryCity)));
        if (dailyRoute) {
          inlays.push({
            date: moment().startOf('week').add(d, 'days').add(1, 'week').toDate(),
            route: dailyRoute,
            order: order,
            driver: drivers.find((d: Driver) => d.licenseType === dailyRoute?.licenseType)
          } as Inlay);

          // שינוי סטטוס הזמנה לשובצה
          order.orderStatus = OrderStatus.INLAY;
        }
      }
    }

    console.log(inlays);
    return inlays;
  }

  private getLishkaByCity(city: string): any {
    const c = this.cities.find((c: any) => c.name === city);
    return c ? c['lishka'] : '';
  }
}
