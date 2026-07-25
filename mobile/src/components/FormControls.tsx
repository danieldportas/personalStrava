import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
}) {
  return (
    <View style={styles.stepperRow}>
      <Pressable
        style={styles.stepperButton}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>
        {value} {suffix}
      </Text>
      <Pressable
        style={styles.stepperButton}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text style={[typography.label, styles.fieldLabel]}>{children}</Text>;
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: "600" },
  chipTextSelected: { color: colors.text },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { color: colors.text, fontSize: 20, fontWeight: "700" },
  stepperValue: { color: colors.text, fontSize: 16, fontWeight: "600" },
  fieldLabel: { marginBottom: spacing.xs, marginTop: spacing.md },
});
