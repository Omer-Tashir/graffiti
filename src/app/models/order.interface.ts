import { Route } from "./route.interface";
import { Driver } from "./driver.interface";
import { Customer } from "./customer.interface";

export interface Order {
    id: string;
    deliveryAddress: string; //כתובת מחסן מקבל
    deliveryDate: Date; //תאריך אספקה
    orderWeight: number; //משקל הזמנה

    route: Route;
    driver: Driver;
    customer: Customer;
}