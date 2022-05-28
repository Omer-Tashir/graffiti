import { OrderStatus } from "./order-status.enum";

export interface Order {
    uid: string; // מפתח ראשי
    name: string; // מפתח משני - שם הלקוח
    phone: string;
    deliveryCity: string; //כתובת מחסן מקבל
    deliveryAddress: string; //כתובת מחסן מקבל
    deliveryAddressNumber: string; //כתובת מחסן מקבל
    deliveryDate: any; //תאריך אספקה
    orderWeight: number; //משקל הזמנה
    orderStatus: OrderStatus; //סטטוס הזמנה
    important: boolean; // הזמנה דחופה
    description: string;
}