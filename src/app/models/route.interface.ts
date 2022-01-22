export interface Route {
    id: string;
    area: string; //אזור המסלול
    distributionArea: string; //אזור חלוקה
    trackLength: number; //אורך מסלול
    numPoint: number; //מספר נקודות ציון לפריקה
}