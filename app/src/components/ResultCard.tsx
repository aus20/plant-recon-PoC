import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "../theme.ts";
import {
  LOW_CONFIDENCE,
  type CareFact,
  type IdentifyResponse,
  type PlantToxicity,
} from "../../../shared/types.ts";

export function ResultCard({
  response,
  imageUri,
  onReset,
  onHome,
}: {
  response: IdentifyResponse;
  imageUri: string;
  onReset: () => void;
  onHome: () => void;
}) {
  const { result } = response;

  if (!result.is_plant) {
    return (
      <View style={styles.fill}>
        <Image source={{ uri: imageUri }} style={styles.hero} />
        <BackButton onPress={onHome} />
        <View style={styles.body}>
          <Text style={styles.name}>That isn't a plant</Text>
          <Text style={styles.paragraph}>
            No plant found in this photo. Try getting closer to a leaf or a flower, with
            good light and a still hand.
          </Text>
        </View>
        <Footer onReset={onReset} onHome={onHome} label="Take another photo" />
      </View>
    );
  }

  const unsure = result.confidence < LOW_CONFIDENCE;
  const warning = toxicityBanner(result.toxicity);

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image source={{ uri: imageUri }} style={styles.hero} />
        <BackButton onPress={onHome} />

        <View style={styles.body}>
          {unsure && <Text style={styles.hedge}>Best guess</Text>}
          <Text style={styles.name}>{result.common_name}</Text>
          <Text style={styles.latin}>{result.scientific_name}</Text>

          <View style={styles.metaRow}>
            <Chip label={result.family} />
            <Chip label={`${Math.round(result.confidence * 100)}% sure`} tone={unsure ? "warning" : "accent"} />
            <Chip label={result.care.difficulty} />
          </View>

          {/* Toxicity sits above care on purpose: it is the fact people act on. */}
          <View style={[styles.toxicity, { backgroundColor: warning.wash, borderColor: warning.edge }]}>
            <Text style={[styles.toxicityTitle, { color: warning.tint }]}>{warning.title}</Text>
            <Text style={styles.toxicityBody}>{result.toxicity.details}</Text>
          </View>

          <Text style={styles.paragraph}>{result.description}</Text>

          <Text style={styles.sectionTitle}>Care</Text>
          <Text style={styles.paragraph}>{result.care.summary}</Text>
          <CareRow label="Light" fact={result.care.light} />
          <CareRow label="Water" fact={result.care.water} />
          <CareRow label="Soil" fact={result.care.soil} />

          {result.alternatives.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>It could also be</Text>
              {result.alternatives.map((alt) => (
                <View key={alt.scientific_name} style={styles.altRow}>
                  <View style={styles.altText}>
                    <Text style={styles.altName}>{alt.common_name}</Text>
                    <Text style={styles.altLatin}>{alt.scientific_name}</Text>
                  </View>
                  <Text style={styles.altScore}>{Math.round(alt.confidence * 100)}%</Text>
                </View>
              ))}
            </>
          )}

          <Text style={styles.metrics}>
            Identified in {(response.metrics.totalMs / 1000).toFixed(1)}s
          </Text>
        </View>
      </ScrollView>
      <Footer onReset={onReset} onHome={onHome} label="Identify another" />
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={14} style={styles.back}>
      <Text style={styles.backLabel}>Home</Text>
    </Pressable>
  );
}

function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "accent" | "warning" }) {
  const color = tone === "accent" ? colors.accent : tone === "warning" ? colors.warning : colors.textMuted;
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  );
}

// value dört kelimelik etiket, satırı tek başına taşıyor; detay isteyen için altta.
// Önce taranabilir, sonra tam.
function CareRow({ label, fact }: { label: string; fact: CareFact }) {
  return (
    <View style={styles.careRow}>
      <Text style={styles.careLabel}>{label}</Text>
      <View style={styles.careBody}>
        <Text style={styles.careValue}>{fact.value}</Text>
        <Text style={styles.careDetail}>{fact.detail}</Text>
      </View>
    </View>
  );
}

/** Her şiddet için metin ve renk. "mild" kırmızı değil amber. */
function toxicityBanner(toxicity: PlantToxicity) {
  const who = [toxicity.toxic_to_pets && "pets", toxicity.toxic_to_humans && "people"]
    .filter(Boolean)
    .join(" and ");

  if (toxicity.severity === "serious") {
    return { title: `Toxic - keep away from ${who || "pets and people"}`, tint: colors.danger, wash: "#E87A6814", edge: "#E87A6866" };
  }
  if (toxicity.severity === "mild") {
    return { title: `Mild irritant for ${who || "pets and people"}`, tint: colors.warning, wash: "#E7B96814", edge: "#E7B96855" };
  }
  return { title: "Safe around pets and people", tint: colors.accent, wash: "#7BC47F14", edge: "#7BC47F44" };
}

/** Home burada da var, böylece fotoğraftaki düğme kayıp gidebiliyor. */
function Footer({ onReset, onHome, label }: { onReset: () => void; onHome: () => void; label: string }) {
  return (
    <View style={styles.footer}>
      <Pressable style={styles.ghost} onPress={onHome}>
        <Text style={styles.ghostLabel}>Home</Text>
      </Pressable>
      <Pressable style={[styles.primary, styles.primaryGrow]} onPress={onReset}>
        <Text style={styles.primaryLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 120 },
  hero: { width: "100%", height: 300, backgroundColor: colors.surface },
  back: {
    position: "absolute",
    top: 64,
    left: space.lg,
    backgroundColor: "#00000066",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  backLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  body: { padding: space.lg, gap: space.sm },
  hedge: { color: colors.warning, fontSize: 13, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  name: { color: colors.text, fontSize: 32, fontWeight: "700" },
  latin: { color: colors.textMuted, fontSize: 17, fontStyle: "italic", marginTop: -space.xs },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginVertical: space.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipLabel: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  toxicity: { borderRadius: radius.md, padding: space.md, gap: space.xs, borderWidth: 1 },
  toxicityTitle: { fontSize: 17, fontWeight: "700" },
  toxicityBody: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  paragraph: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: space.md },
  careRow: { flexDirection: "row", gap: space.md, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  careLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "700", width: 52, paddingTop: 2, textTransform: "uppercase", letterSpacing: 0.6 },
  careBody: { flex: 1, gap: 2 },
  careValue: { color: colors.text, fontSize: 16, fontWeight: "600" },
  careDetail: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  altRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.md,
    marginTop: space.sm,
  },
  altText: { flex: 1 },
  altName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  altLatin: { color: colors.textMuted, fontSize: 13, fontStyle: "italic" },
  altScore: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  metrics: { color: colors.border, fontSize: 12, marginTop: space.lg, textAlign: "center" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.lg,
    paddingBottom: 40,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: space.sm,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    alignItems: "center",
  },
  ghostLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  primary: { backgroundColor: colors.accent, paddingVertical: 15, borderRadius: radius.md, alignItems: "center" },
  primaryGrow: { flex: 1 },
  primaryLabel: { color: colors.accentInk, fontSize: 16, fontWeight: "700" },
});
