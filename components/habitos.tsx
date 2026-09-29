import {
  BookOpen,
  Dumbbell,
  GraduationCap,
  type LucideIcon,
  ShieldCheck,
  Smartphone,
  SmartphoneNfc,
  Users,
} from "lucide-react";

export type HabitoKey =
  | "movil17"
  | "movilResto"
  | "np"
  | "ejercicio"
  | "formacion"
  | "leer"
  | "social";

export type HabitoMeta = {
  key: HabitoKey;
  label: string;
  corto: string;
  icon: LucideIcon;
  color: string;
};

export const HABITOS: HabitoMeta[] = [
  { key: "movil17", label: "Móvil - 17 horas", corto: "Móvil 17h", icon: Smartphone, color: "oklch(0.68 0.15 230)" },
  { key: "movilResto", label: "Móvil resto de día", corto: "Móvil resto", icon: SmartphoneNfc, color: "oklch(0.6 0.2 275)" },
  { key: "np", label: "N. P", corto: "N.P", icon: ShieldCheck, color: "oklch(0.64 0.22 15)" },
  { key: "ejercicio", label: "Ejercicio", corto: "Ejercicio", icon: Dumbbell, color: "oklch(0.7 0.18 50)" },
  { key: "formacion", label: "Formación", corto: "Formación", icon: GraduationCap, color: "oklch(0.66 0.16 160)" },
  { key: "leer", label: "Leer", corto: "Leer", icon: BookOpen, color: "oklch(0.76 0.15 85)" },
  { key: "social", label: "Social", corto: "Social", icon: Users, color: "oklch(0.66 0.21 340)" },
];

export const HABITO_POR_KEY = Object.fromEntries(
  HABITOS.map((habito) => [habito.key, habito]),
) as Record<HabitoKey, HabitoMeta>;
