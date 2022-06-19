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
import { DatabaseService } from '../services/database.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AlgorithemService {

  private cities: any[] = [];
  private allStreets: any[] = [];
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
    public db: DatabaseService,
    private sessionStorageService: SessionStorageService,
  ) {
    this.db.getCitiesJSON().subscribe(data => {
      this.cities = data;
    });

    this.db.getStreetsJSON().subscribe(data => {
      this.allStreets = data;
    });
  }

  async run(orders: Order[], runningInalys: RunningInaly[]): Promise<RunningInaly[]> {
    const drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
    const routes = JSON.parse(this.sessionStorageService.getItem('routes'));
    
    //debugger;

    // שלב א׳ - מסלולים קבועים בימים קבועים
    //for (let d = new Date().getDay(); d < this.days.length; d++) {
    let d = moment().add(1, 'days').toDate().getDay();
    let dailyRoutes: Route[] = routes
      .filter((r: Route) => r.distributionDays.includes(this.days[d]));
      
    let dailyOrders: Order[] = orders
      .filter(o => ![OrderStatus.DELIVERD, OrderStatus.INLAY].includes(o.orderStatus));
    //.filter(o => this.days[moment(o.deliveryDate).toDate().getDay()] === this.days[d]);
      
    // // דילוג על ימים שבהם אין הזמנות
    // if (dailyOrders.length === 0) {
    //   continue;
    // }
    
    let dailyRoutesDriver = dailyRoutes.map((dr: Route) => {
      const availableDrivers = drivers
        .filter((driver: Driver) => dr.licenseType === driver.licenseType)
        .filter((driver: Driver) => this.isDriverAvailable(driver, moment().add(1, 'days').toDate()))
        .filter((driver: Driver) => !runningInalys.map(i => i.driver.uid).includes(driver.uid));
        
      return {
        route: dr,
        driver: availableDrivers[Math.floor(Math.random() * availableDrivers.length)] // random driver
      };
    }).filter(res => !!res.driver);

    for (let i = 0; i < dailyRoutesDriver.length; i++) {
      const selectedDailyRouteDriver: any = dailyRoutesDriver[i];
      selectedDailyRouteDriver.orders = this.getDriverSelectedOrders(selectedDailyRouteDriver, dailyOrders);

      // const areas = dailyOrders.map((o: Order) => o.deliveryCity);
      // const selectedDailyRouteDriver = dailyRoutesDriver
      //   .filter(drd => drd.route.distributionAreas
      //     .every((area: string) => areas.includes(area)));
        
      if (selectedDailyRouteDriver.orders.length) {
        // sort orders by weight
        selectedDailyRouteDriver.orders = selectedDailyRouteDriver.orders
          .sort((o1: Order, o2: Order) => o1.orderWeight - o2.orderWeight)
          .sort((o1: Order, o2: Order) => Number(o2.important) - Number(o1.important))

        // remove orders until weight is ok
        while (this.isOverweight(selectedDailyRouteDriver.orders, selectedDailyRouteDriver.driver)) {
          selectedDailyRouteDriver.orders.pop();
        }
        
        if (selectedDailyRouteDriver.orders?.length) {
          // סימון כשובץ
          selectedDailyRouteDriver.orders.forEach((order: Order) => {
            order.orderStatus = OrderStatus.INLAY;
          });

          // ביצוע אלגוריתם לקבלת מסלול אופטימלי בין נקודות
          const res = await this.getOptimizedRoute(selectedDailyRouteDriver.orders, selectedDailyRouteDriver.driver, selectedDailyRouteDriver.route);

          runningInalys.push({
            date: moment().add(1, 'days').toDate(),
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
    //}

    return runningInalys;
  }

  private getDriverSelectedOrders(selectedDailyRouteDriver: any, dailyOrders: Order[]): Order[] {
    return dailyOrders.filter((o: Order) => selectedDailyRouteDriver.route.distributionAreas.map((d: string) => d).includes(this.getCityByArea(o.deliveryCity)));
  }

  private getCityByArea(area: string): string {
    return this.cities.find((c: any) => c.name === area)?.lishka;
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
