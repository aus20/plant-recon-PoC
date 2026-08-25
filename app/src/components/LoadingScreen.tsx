import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "../theme.ts";
import type { IdentifyStage } from "../../../shared/types.ts";

// Bekleme ~6 saniye, düz bir spinner bozulmuş gibi hissettiriyor.
// Bunlar akışın gerçek iki adımı, uydurma ilerleme değil.
const LABELS: Record<IdentifyStage, string> = {
  uploading: "Sending your photo",
  analyzing: "Looking at leaves and flowers",
};

export function LoadingScreen({
  imageUri,
  stage,
  onCancel,
}: {
  imageUri: string;
  stage: IdentifyStage;
  onCancel: () => void;
}) {
  return (
    <View style={styles.fill}>
      <Image source={{ uri: imageUri }} style={styles.photo} />
      <View style={styles.panel}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.stage}>{LABELS[stage]}</Text>
        <Text style={styles.hint}>This usually takes a few seconds.</Text>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  photo: { flex: 1, opacity: 0.45 },
  panel: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
    gap: space.sm,
  },
  stage: { color: colors.text, fontSize: 19, fontWeight: "600", marginTop: space.xs },
  hint: { color: colors.textMuted, fontSize: 14 },
  cancel: { color: colors.textMuted, fontSize: 15, fontWeight: "600", marginTop: space.sm },
});
