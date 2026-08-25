import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, radius, space } from "../theme.ts";
import type { Photo } from "../services/identify.ts";
import { pickFromLibrary } from "../services/pick.ts";

export function CaptureScreen({ onPhoto, onClose }: { onPhoto: (photo: Photo) => void; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const camera = useRef<CameraView>(null);

  async function shoot() {
    if (busy) return;
    setBusy(true);
    try {
      const picture = await camera.current?.takePictureAsync();
      if (picture) onPhoto({ uri: picture.uri, width: picture.width, height: picture.height });
    } finally {
      setBusy(false);
    }
  }

  async function chooseFromLibrary() {
    const photo = await pickFromLibrary();
    if (photo) onPhoto(photo);
  }

  // İzin durumu daha yükleniyor.
  if (!permission) return <View style={styles.fill} />;

  // Kamera reddedildiyse galeri yolu çalışmaya devam etmeli, yoksa tek bir
  // "İzin Verme" dokunuşuyla uygulama ölü.
  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.centered]}>
        <Text style={styles.title}>Identify any plant</Text>
        <Text style={styles.body}>
          {permission.canAskAgain
            ? "Use the camera to photograph a plant, or pick one from your photos."
            : "Camera access is off. You can still identify plants from your photo library."}
        </Text>
        {permission.canAskAgain && (
          <Pressable style={styles.primary} onPress={requestPermission}>
            <Text style={styles.primaryLabel}>Enable camera</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondary} onPress={chooseFromLibrary}>
          <Text style={styles.secondaryLabel}>Choose from library</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={12} style={styles.backLink}>
          <Text style={styles.backLinkLabel}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView ref={camera} style={styles.fill} facing="back" />
      <View style={styles.topBar}>
        <Pressable onPress={onClose} hitSlop={14} style={styles.close}>
          <Text style={styles.closeGlyph}>close</Text>
        </Pressable>
      </View>
      <View style={styles.hud}>
        <Text style={styles.hint}>Fill the frame with one leaf or flower</Text>
        <View style={styles.controls}>
          <Pressable style={styles.libraryButton} onPress={chooseFromLibrary} hitSlop={12}>
            <Text style={styles.libraryLabel}>Photos</Text>
          </Pressable>
          <Pressable style={styles.shutter} onPress={shoot} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.accentInk} /> : <View style={styles.shutterCore} />}
          </Pressable>
          <View style={styles.libraryButton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  centered: { justifyContent: "center", padding: space.lg, gap: space.md },
  title: { color: colors.text, fontSize: 30, fontWeight: "700" },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 23, marginBottom: space.sm },
  primary: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
  },
  primaryLabel: { color: colors.accentInk, fontSize: 16, fontWeight: "700" },
  secondary: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
  },
  secondaryLabel: { color: colors.text, fontSize: 16, fontWeight: "600" },
  backLink: { alignItems: "center", paddingVertical: space.sm },
  backLinkLabel: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
  topBar: { position: "absolute", top: 64, left: space.lg, right: space.lg, flexDirection: "row" },
  close: {
    backgroundColor: "#00000066",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  closeGlyph: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  hud: { position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: 44, gap: space.md },
  hint: { color: "#FFFFFFCC", textAlign: "center", fontSize: 14 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg },
  libraryButton: { width: 76 },
  libraryLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterCore: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFFFFF" },
});
