import { Truck } from "./truck.interface";
import { User } from "./user.interface";

export interface Driver extends User {
    truck: Truck;
}