import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Minus, Plus } from "lucide-react-native";

import { colors, radii, spacing } from "../constants/theme";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 1_000_000,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const decreaseDisabled = value <= min;
  const increaseDisabled = value >= max;

  useEffect(() => {
    const parsed = Number.parseInt(draft, 10);
    if (value >= min && parsed !== value) {
      setDraft(String(value));
    }
  }, [draft, min, value]);

  function applyValue(nextValue: number) {
    const clamped = Math.min(max, Math.max(min, nextValue));
    setDraft(String(clamped));
    onChange(clamped);
  }

  function handleChange(text: string) {
    const digits = text
      .replace(/[^0-9]/g, "")
      .slice(0, String(max).length);
    setDraft(digits);

    if (!digits) {
      onChange(0);
      return;
    }

    const parsed = Number.parseInt(digits, 10);
    if (parsed >= min && parsed <= max) {
      onChange(parsed);
    } else {
      onChange(0);
    }
  }

  function handleBlur() {
    const parsed = Number.parseInt(draft, 10);
    const nextValue = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : min;

    setDraft(String(nextValue));
    onChange(nextValue);
  }

  return (
    <View style={styles.block}>
      <View style={styles.wrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease quantity"
          accessibilityState={{ disabled: decreaseDisabled }}
          disabled={decreaseDisabled}
          onPress={() => applyValue(value - 1)}
          style={({ pressed }) => [
            styles.button,
            {
              opacity: decreaseDisabled ? 0.35 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Minus size={21} color={colors.ink} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.valueWrap}>
          <TextInput
            accessibilityLabel="Quantity in pieces"
            accessibilityHint="Type a quantity or use the plus and minus buttons."
            value={draft}
            onChangeText={handleChange}
            onBlur={handleBlur}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            maxLength={String(max).length}
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={colors.faint}
            selectionColor={colors.primary}
            style={styles.valueInput}
          />
          <Text style={styles.unit}>pieces</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase quantity"
          accessibilityState={{ disabled: increaseDisabled }}
          disabled={increaseDisabled}
          onPress={() => applyValue(value + 1)}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primarySoft,
              opacity: increaseDisabled ? 0.35 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Plus size={21} color={colors.primaryDark} strokeWidth={2.4} />
        </Pressable>
      </View>

      <Text style={styles.editHint}>
        Tap the number to type, or use the buttons below.
      </Text>

      <View style={styles.quickRow}>
        <Text style={styles.quickLabel}>Quick add</Text>
        {[10, 50, 100].map((step) => {
          const quickDisabled = value + step > max;
          return (
            <Pressable
              key={step}
              accessibilityRole="button"
              accessibilityLabel={`Add ${step} pieces`}
              accessibilityState={{ disabled: quickDisabled }}
              disabled={quickDisabled}
              onPress={() => applyValue(value + step)}
              style={({ pressed }) => [
                styles.quickChip,
                {
                  opacity: quickDisabled ? 0.35 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={styles.quickChipText}>+{step}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  valueWrap: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  valueInput: {
    width: 84,
    paddingVertical: 0,
    paddingHorizontal: 2,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  unit: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    paddingTop: 3,
  },
  editHint: {
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.faint,
    fontWeight: "500",
    textAlign: "center",
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickLabel: {
    fontSize: 10.5,
    color: colors.faint,
    fontWeight: "500",
    marginRight: 2,
  },
  quickChip: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  quickChipText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
