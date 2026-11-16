import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Scissors, Shirt } from "lucide-react-native";

import { colors, departmentColors, radii, spacing } from "../constants/theme";
import type { Department } from "../types";
import { FieldLabel } from "./Form";

const options: Array<{
  value: Department;
  title: string;
  hint: string;
  icon: typeof Scissors;
}> = [
  {
    value: "PETTICOAT",
    title: "Petticoat",
    hint: "Petticoat team",
    icon: Scissors,
  },
  {
    value: "RMG",
    title: "RMG",
    hint: "RMG team",
    icon: Shirt,
  },
];

export function DepartmentPicker({
  value,
  onChange,
  label = "Manager type",
  required = true,
}: {
  value: Department;
  onChange: (value: Department) => void;
  label?: string;
  required?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <FieldLabel label={label} required={required} />
      <View style={styles.row}>
        {options.map((option) => {
          const selected = value === option.value;
          const palette = departmentColors[option.value];
          const Icon = option.icon;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.title} section`}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor: selected ? palette.color : colors.line,
                  backgroundColor: selected ? palette.soft : colors.surface,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: selected
                      ? colors.surface
                      : palette.soft,
                  },
                ]}
              >
                <Icon size={20} color={palette.color} strokeWidth={2.2} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.title}>{option.title}</Text>
                <Text style={styles.hint}>{option.hint}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: selected ? palette.color : colors.line,
                  },
                ]}
              >
                {selected ? (
                  <View
                    style={[
                      styles.radioDot,
                      { backgroundColor: palette.color },
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: 66,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.ink,
  },
  hint: {
    fontSize: 9.5,
    color: colors.muted,
    marginTop: 1,
    fontWeight: "500",
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
