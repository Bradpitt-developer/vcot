import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  ClipboardPenLine,
  History,
  UserRound,
} from "lucide-react-native";

import { colors } from "../constants/theme";
import { ManagerAccountScreen } from "../screens/manager/ManagerAccountScreen";
import { ManagerHistoryScreen } from "../screens/manager/ManagerHistoryScreen";
import { ManagerHomeScreen } from "../screens/manager/ManagerHomeScreen";
import type { ManagerTabParamList } from "./types";

const Tab = createBottomTabNavigator<ManagerTabParamList>();

export function ManagerNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Entry"
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
        name="Entry"
        component={ManagerHomeScreen}
        options={{
          title: "Add work",
          tabBarIcon: ({ color }) => (
            <ClipboardPenLine size={21} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={ManagerHistoryScreen}
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <History size={21} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={ManagerAccountScreen}
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <UserRound size={21} color={color} strokeWidth={2.2} />
          ),
        }}
      />
    </Tab.Navigator>
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
