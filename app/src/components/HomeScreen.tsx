import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "../theme.ts";
import type { HistoryEntry } from "../../../shared/types.ts";
import { Seedling } from "./Seedling.tsx";

function ago(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function HomeScreen({
  history,
  onCamera,
  onLibrary,
  onOpen,
}: {
  history: HistoryEntry[];
  onCamera: () => void;
  onLibrary: () => void;
  onOpen: (entry: HistoryEntry) => void;
}) {
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.mark}>
          <Seedling size={52} />
        </View>
        <Text style={styles.wordmark}>Plant Identifier</Text>
        <Text style={styles.tagline}>What is it, how to keep it alive, and whether it's safe.</Text>
      </View>

      <Pressable style={styles.primary} onPress={onCamera}>
        <Text style={styles.primaryLabel}>Identify a plant</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onLibrary}>
        <Text style={styles.secondaryLabel}>Choose from photos</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Recent</Text>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>
            Plants you identify are saved on this device so you can look them up again.
          </Text>
        </View>
      ) : (
        history.map((entry) => {
          const { result } = entry.response;
          // Sonuç kartıyla aynı dili konuşmalı: "mild" ile "toxic" aynı şey değil.
          const warning =
            result.toxicity.severity === "serious"
              ? "toxic"
              : result.toxicity.severity === "mild"
                ? "mild irritant"
                : "";
          return (
            <Pressable key={entry.id} style={styles.row} onPress={() => onOpen(entry)}>
              <Image source={{ uri: entry.imageUri }} style={styles.thumb} />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {result.is_plant ? result.common_name : "Not a plant"}
                </Text>
                <Text style={styles.rowLatin} numberOfLines={1}>
                  {result.is_plant ? result.scientific_name : "No plant found in this photo"}
                </Text>
                <Text style={styles.rowMeta}>
                  {ago(entry.savedAt)}
                  {result.is_plant && warning ? `  ·  ${warning}` : ""}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingTop: 72, paddingBottom: 48, gap: space.sm },
  header: { marginBottom: space.md },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  wordmark: { color: colors.text, fontSize: 34, fontWeight: "700", letterSpacing: -0.5 },
  tagline: { color: colors.textMuted, fontSize: 15, lineHeight: 21, marginTop: space.xs },
  primary: { backgroundColor: colors.accent, paddingVertical: 16, borderRadius: radius.md, alignItems: "center" },
  primaryLabel: { color: colors.accentInk, fontSize: 17, fontWeight: "700" },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  secondaryLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  empty: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.xs,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  emptyBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.sm,
  },
  thumb: { width: 62, height: 62, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  rowText: { flex: 1, gap: 2 },
  rowName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  rowLatin: { color: colors.textMuted, fontSize: 13, fontStyle: "italic" },
  rowMeta: { color: colors.border, fontSize: 12, marginTop: 2 },
});
