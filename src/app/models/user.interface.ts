import { FirebaseUser } from "./firebase-user.interface";
import { UserPermission } from "./user-permission.enum";
import { UserType } from "./user-type.enum";

export interface User extends FirebaseUser {
    email: string;
    password: string;
    phoneNumber: string;

    type: UserType;
    permissions: UserPermission[];
}