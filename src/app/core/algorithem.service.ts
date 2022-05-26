import { Injectable } from '@angular/core';
import { Globals } from '../app.globals';
import { Order } from '../models/order.interface';
import { Loader } from '@googlemaps/js-api-loader';
import { SessionStorageService } from './session-storage-service';

import * as moment from "moment/moment";

import { Route } from '../models/route.interface';
import { OrderStatus } from '../models/order-status.enum';
import { Driver } from '../models/driver.interface';
import { DriverConstraint } from '../models/driver-constraint';
import { LicenseType } from '../models/license-type.enum';
import { RunningInaly } from '../models/running-inlay.interface';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AlgorithemService {
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
    private sessionStorageService: SessionStorageService,
  ) { }

  async run(orders: Order[]): Promise<RunningInaly[]> {
    let runningInalys: RunningInaly[] = [];

    const drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
    const routes = JSON.parse(this.sessionStorageService.getItem('routes'));
    
    // שלב א׳ - מסלולים קבועים בימים קבועים
    for (let d = new Date().getDay(); d < this.days.length; d++) {
      let dailyRoutes: Route[] = routes
        .filter((r: Route) => r.distributionDays.includes(this.days[d]));
      
      let dailyOrders: Order[] = orders
        .filter(o => ![OrderStatus.DELIVERD, OrderStatus.INLAY].includes(o.orderStatus))
        .filter(o => this.days[moment(o.deliveryDate).toDate().getDay()] === this.days[d]);
      
      // דילוג על ימים שבהם אין הזמנות
      if (dailyOrders.length === 0) {
        continue;
      }
      
      let dailyRoutesDriver = dailyRoutes.map((dr: Route) => {
        const availableDrivers = drivers
          .filter((driver: Driver) => driver.licenseType == dr.licenseType)
          .filter((driver: Driver) => this.isDriverAvailable(driver, moment().startOf('week').add('days', d).toDate()));
        
        return {
          route: dr,
          driver: availableDrivers[Math.floor(Math.random() * availableDrivers.length)] // random driver
        };
      }).filter(res => !!res.driver);

      const areas = dailyOrders.map((o: Order) => o.deliveryCity);
      const selectedDailyRouteDriver = dailyRoutesDriver
        .find(drd => drd.route.distributionAreas
          .some((area: string) => areas.includes(area)));
      
      if (selectedDailyRouteDriver) {
        // sort orders by weight
        dailyOrders = dailyOrders.sort((o1, o2) => o1.orderWeight - o2.orderWeight);

        // remove orders until weight is ok
        while (this.isOverweight(dailyOrders, selectedDailyRouteDriver.driver)) {
          dailyOrders.pop();
        }
      
        if (dailyOrders?.length) {
          // סימון כשובץ
          dailyOrders.forEach(order => {
            order.orderStatus = OrderStatus.INLAY;
          });

          // ביצוע אלגוריתם לקבלת מסלול אופטימלי בין נקודות
          const res = await this.getOptimizedRoute(dailyOrders, selectedDailyRouteDriver.driver, selectedDailyRouteDriver.route);

          runningInalys.push({
            date: moment().startOf('week').add('days', d).toDate(),
            driver: selectedDailyRouteDriver.driver,
            route: selectedDailyRouteDriver.route,
            distance: res.distance ?? '',
            duration: res.duration ?? '',
            orders: res.sorted,
            tip: res.tip ?? '',
          } as RunningInaly);
        }
      }
    }

    return runningInalys;
  }

  private isOverweight(orders: Order[], driver: Driver): boolean {
    const totalWeight: number = orders?.reduce((p: number, o: Order) => p + o.orderWeight, 0) ?? 0;
    
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

  private isDriverAvailable(driver: Driver, date: Date): boolean {
    let driverConstraints: DriverConstraint[] = JSON.parse(this.sessionStorageService.getItem('driver-constraints'));
    driverConstraints = driverConstraints.filter(c => c.driver === driver.uid || c.driver.uid === driver.uid);
    return !driverConstraints.find(c => moment(c.date).isSame(date, 'day'));
  }

  async getOptimizedRoute(orders: Order[], driver: Driver, route: Route) {
    const loader = new Loader({
        apiKey: environment.googleApiKey,
        version: "weekly",
        libraries: ["places"]
    });

    let google = await loader.load();
    const directionsService = new google.maps.DirectionsService;
    const response = await directionsService.route({
      origin: "עמק האלה 250 מודיעין", // marlog
      destination: "עמק האלה 250 מודיעין", // marlog
      waypoints: orders.map(order => {
        return {
          stopover: true,
          location: `${order.deliveryAddress} ${order.deliveryAddressNumber} ${order.deliveryCity}`
        }
      }),
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING
    });

    const breakPointTime = 15 * 60;
    const optimizedRoute = response;

    let totalTime = 0;
    let totalDistance = 0;

    for (let i = 0; i < optimizedRoute.routes[0]['legs'].length; i++) {
      const leg = optimizedRoute.routes[0]['legs'][i];
      if (leg?.duration && leg.distance?.value) {
        totalTime += breakPointTime + leg.duration?.value;
        totalDistance += leg.distance?.value;
      }
    }

    return {
      duration: new Date(totalTime * 1000).toISOString().substr(11, 8),
      distance: `${totalDistance / 1000} ק״מ`,
      sorted: response.routes[0].waypoint_order.map((i: number) => orders[i]),
      tip: response.routes[0].summary
    }
  }
}
