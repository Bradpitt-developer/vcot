import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  ClipboardList,
  Home,
  Settings,
  Users,
} from "lucide-react-native";

import { colors } from "../constants/theme";
import { AddEmployeeScreen } from "../screens/admin/AddEmployeeScreen";
import { AddManagerScreen } from "../screens/admin/AddManagerScreen";
import { AddOperationScreen } from "../screens/admin/AddOperationScreen";
import { AdminEntriesScreen } from "../screens/admin/AdminEntriesScreen";
import { AdminHomeScreen } from "../screens/admin/AdminHomeScreen";
import { AdminSetupScreen } from "../screens/admin/AdminSetupScreen";
import { AdminStaffScreen } from "../screens/admin/AdminStaffScreen";
import type { AdminStackParamList, AdminTabParamList } from "./types";

const Stack = createNativeStackNavigator<AdminStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

function AdminTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={AdminHomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Home size={21} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tab.Screen
        name="Staff"
        component={AdminStaffScreen}
        options={{
          title: "People",
          tabBarIcon: ({ color }) => (
            <Users size={21} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tab.Screen
        name="Entries"
        component={AdminEntriesScreen}
        options={{
          title: "Entries",
          tabBarIcon: ({ color }) => (
            <ClipboardList size={21} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tab.Screen
        name="Setup"
        component={AdminSetupScreen}
        options={{
          title: "Setup",
          tabBarIcon: ({ color }) => (
            <Settings size={21} color={color} strokeWidth={2.2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="AddManager" component={AddManagerScreen} />
      <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
      <Stack.Screen name="AddOperation" component={AddOperationScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
});
