import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronDown, Search, X } from "lucide-react-native";

import { colors, radii, shadow, spacing } from "../constants/theme";
import { FieldLabel } from "./Form";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  emptyText = "Nothing available yet.",
  required = true,
  icon,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyText?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const selected = options.find((option) => option.value === value) || null;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.hint?.toLowerCase().includes(normalized)
    );
  }, [options, query]);

  // Give short lists their natural height so users do not have to scroll for
  // two or three people. Longer lists get a bounded, scrollable area.
  const hasSearch = options.length > 5;
  const estimatedContentHeight =
    filtered.length > 0 ? filtered.length * 60 + spacing.lg : 200;
  const reservedSheetHeight =
    82 + (hasSearch ? 53 : 0) + Math.max(insets.bottom, 12);
  const availableListHeight = Math.max(
    140,
    Math.round(windowHeight * 0.82) - reservedSheetHeight
  );
  const listHeight = Math.min(estimatedContentHeight, availableListHeight);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function close() {
    Keyboard.dismiss();
    setOpen(false);
  }

  function choose(option: SelectOption) {
    onChange(option.value);
    close();
  }

  return (
    <View style={styles.wrap}>
      <FieldLabel label={label} required={required} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${selected?.label || placeholder}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          disabled && styles.fieldDisabled,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        {icon ? <View style={styles.leading}>{icon}</View> : null}
        <Text
          style={[
            styles.fieldText,
            !selected && styles.placeholder,
            disabled && styles.disabledText,
          ]}
          numberOfLines={1}
        >
          {selected?.label || placeholder}
        </Text>
        <ChevronDown
          size={18}
          color={disabled ? colors.faint : colors.muted}
          strokeWidth={2.2}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityLabel="Close selection"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.sheetWrap}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.sheet,
                {
                  maxHeight: Math.round(windowHeight * 0.82),
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <View style={styles.grabber} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleWrap}>
                  <Text style={styles.sheetTitle}>{label}</Text>
                  <Text style={styles.sheetSub}>
                    {options.length} option{options.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={close}
                  hitSlop={8}
                  style={styles.closeButton}
                >
                  <X size={19} color={colors.body} strokeWidth={2.2} />
                </Pressable>
              </View>

              {hasSearch ? (
                <View style={styles.searchWrap}>
                  <Search size={17} color={colors.muted} strokeWidth={2.2} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search"
                    placeholderTextColor={colors.faint}
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {query ? (
                    <Pressable
                      onPress={() => setQuery("")}
                      hitSlop={8}
                      accessibilityLabel="Clear search"
                    >
                      <X size={16} color={colors.muted} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                style={[styles.list, { height: listHeight }]}
                contentContainerStyle={[
                  styles.listContent,
                  filtered.length === 0 && styles.listContentEmpty,
                ]}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => choose(item)}
                      style={({ pressed }) => [
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                        { opacity: pressed ? 0.78 : 1 },
                      ]}
                    >
                      <View style={styles.optionText}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.hint ? (
                          <Text style={styles.optionHint}>{item.hint}</Text>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <View style={styles.check}>
                          <Check
                            size={14}
                            color={colors.primaryDark}
                            strokeWidth={3}
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>
                      {options.length === 0 ? emptyText : "No matches found"}
                    </Text>
                    <Text style={styles.emptyText}>
                      {options.length === 0
                        ? "Ask your admin to add it first."
                        : "Try a different word."}
                    </Text>
                  </View>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fieldDisabled: {
    backgroundColor: colors.lineSoft,
    borderColor: colors.lineSoft,
  },
  leading: {
    width: 22,
    alignItems: "center",
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    fontWeight: "600",
  },
  placeholder: {
    color: colors.faint,
    fontWeight: "500",
  },
  disabledText: {
    color: colors.faint,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  sheetWrap: {
    width: "100%",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    ...shadow.raised,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  sheetTitleWrap: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontWeight: "500",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.lineSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    minHeight: 45,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 6,
  },
  listContentEmpty: {
    flexGrow: 1,
    minHeight: 170,
    justifyContent: "center",
  },
  optionRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  optionRowSelected: {
    backgroundColor: colors.primaryTint,
    borderColor: "#BEE5D9",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.ink,
  },
  optionLabelSelected: {
    color: colors.primaryDark,
  },
  optionHint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontWeight: "500",
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.body,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
    lineHeight: 17,
  },
});
