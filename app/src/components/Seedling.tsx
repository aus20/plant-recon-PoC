import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../theme.ts";

// Topraktan çıkan filiz - uygulamadaki tek illüstrasyon.
// Çizim sırası önemli: önce alt yaprak, sonra sap (birleşme yerini örtüyor),
// en son üst yaprak (sapın yuvarlak ucunu örtüyor).
// 64x64 ızgarada çizilip ölçekleniyor, her boyutta net kalıyor.
export function Seedling({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M10 48 Q 32 42 54 48" stroke={colors.soil} strokeWidth={3.4} strokeLinecap="round" fill="none" />
      <Path d="M20 53 Q 32 49.5 44 53" stroke={colors.soilDeep} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Circle cx={15} cy={54} r={1.3} fill={colors.soilDeep} />
      <Circle cx={50} cy={54} r={1.1} fill={colors.soilDeep} />
      <Path d="M32 37 C 27 28 16 27 13 31 C 16 40 27 43 32 37 Z" fill={colors.accentDeep} />
      <Path d="M32 48 C 31 41 32 35 32 31" stroke={colors.accent} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      <Path d="M30 31 C 37 18 51 15 55 19 C 52 30 38 36 30 31 Z" fill={colors.accent} />
    </Svg>
  );
}
