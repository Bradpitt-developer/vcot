import type { NavigatorScreenParams } from "@react-navigation/native";

import type { Department } from "../types";

export type AuthStackParamList = {
  Welcome: undefined;
  RoleSelect: undefined;
  ManagerLogin: { department: Department };
  AdminLogin: undefined;
};

export type ManagerTabParamList = {
  Entry: undefined;
  History: undefined;
  Account: undefined;
};

export type AdminTabParamList = {
  Home: undefined;
  Staff: undefined;
  Entries: undefined;
  Setup: undefined;
};

export type AdminStackParamList = {
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  AddManager: undefined;
  AddEmployee: undefined;
  AddOperation: undefined;
};
