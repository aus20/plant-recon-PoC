import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "../theme.ts";
import type { IdentifyErrorCode } from "../../../shared/types.ts";

// Her hata için insanın anlayacağı bir cümle. API'nin ham mesajını göstermiyorum;
// o geliştirici için yazılmış ve iç detay sızdırıyor.
const COPY: Record<IdentifyErrorCode, { title: string; body: string }> = {
  network: { title: "No connection", body: "Your phone is offline. Reconnect and try again." },
  auth: { title: "Can't reach the service", body: "This build isn't authorised to identify plants." },
  rate_limit: { title: "Slow down a moment", body: "Too many identifications just now. Try again shortly." },
  upload_failed: { title: "Photo didn't upload", body: "The photo couldn't be sent. Try again, or pick another one." },
  prediction_failed: { title: "Identification failed", body: "Something went wrong while looking at your photo." },
  timeout: { title: "Taking too long", body: "The identification didn't finish in time. Try again." },
  bad_output: { title: "Unclear answer", body: "The answer came back garbled. Another photo usually fixes it." },
  server: { title: "Service is having trouble", body: "This isn't your fault. Try again in a minute." },
};

export function ErrorScreen({ code, onRetry }: { code: IdentifyErrorCode; onRetry: () => void }) {
  const copy = COPY[code] ?? COPY.server;
  return (
    <View style={styles.fill}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <Pressable style={styles.primary} onPress={onRetry}>
        <Text style={styles.primaryLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: space.lg, gap: space.md },
  title: { color: colors.text, fontSize: 28, fontWeight: "700" },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 23 },
  primary: { backgroundColor: colors.accent, paddingVertical: 15, borderRadius: radius.md, alignItems: "center", marginTop: space.sm },
  primaryLabel: { color: colors.accentInk, fontSize: 16, fontWeight: "700" },
});
