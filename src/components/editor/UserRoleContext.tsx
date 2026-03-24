import { createContext, useContext } from "react";

export type UserRole = "owner" | "editor" | "viewer";

const UserRoleContext = createContext<UserRole>("viewer");

export const UserRoleProvider = UserRoleContext.Provider;

export const useUserRole = () => useContext(UserRoleContext);
