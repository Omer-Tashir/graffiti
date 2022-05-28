import { Driver } from "./driver.interface";
import { Order } from "./order.interface";
import { Route } from "./route.interface";

export interface Inlay {
    uid: string;
    orderDate: any;
    date: any;
    order: Order; // הזמנה
    driver: Driver; // נהג מקושר למשאית
    route: Route; // מסלול
}