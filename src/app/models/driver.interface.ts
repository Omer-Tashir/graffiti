import { LicenseType } from "./license-type.enum";
import { Truck } from "./truck.interface";
import { User } from "./user.interface";

export interface Driver extends User {
    workingStartDate: Date;
    licenseType: LicenseType; // סוג רישיון
    truck: Truck; // משאית
}