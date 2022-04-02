import { LicenseType } from "./license-type.enum";

export interface Route {
    uid: string;
    name: string; //שם המסלול
    distributionAreas: string[]; //אזורי חלוקה
    trackLength: number; //אורך מסלול
    numPoint: number; //מספר נקודות ציון לפריקה
    distributionDays: string[]; //ימי חלוקה
    licenseType: LicenseType; //סוג משאית
}