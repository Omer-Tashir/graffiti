import { UserPermission } from "./user-permission.enum";
import { UserType } from "./user-type.enum";

export interface User {
    uid: string;
    email: string;
    displayName: string;
    phoneNumber: string;

    type: UserType;
    permissions: UserPermission[];
}