export interface RunningInaly {
    uid: string;
    date: any;
    driver: any;
    route: any; // מסלול
    orders: any; // הזמנות מקושרות
    distance: string;
    duration: string;
    tip: string;
}