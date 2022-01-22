import { Order } from "./order.interface";
import { Route } from "./route.interface";

export interface RunningRoute {
    id: string;
    date: Date;
    order: Order;
    route: Route;
}