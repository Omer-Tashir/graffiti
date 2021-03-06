import { LicenseType } from "./license-type.enum";

export interface Truck {
    serialNumber: string; // מפתח ראשי
    weight: number; // משקל המשאית
    model: string; // סוג המשאית
    loadWeight: number; // משקל ההזמנות שמשאית יכולה להעמיס

    licenseType: LicenseType; // מפתח משני
}