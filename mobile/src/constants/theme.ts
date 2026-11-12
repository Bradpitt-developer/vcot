/**
 * A familiar, low-contrast palette in the spirit of everyday messaging apps.
 * Green means action; white surfaces and soft grey canvas keep forms readable.
 */
export const colors = {
  primary: "#128C7E",
  primaryDark: "#075E54",
  primaryDeep: "#064C44",
  primaryBright: "#25D366",
  primarySoft: "#E6F5F0",
  primaryTint: "#F3FBF8",

  ink: "#102A2E",
  body: "#3D5257",
  muted: "#6F8085",
  faint: "#99A7AA",
  line: "#E2EBE7",
  lineSoft: "#EEF4F1",
  canvas: "#F5F7F5",
  surface: "#FFFFFF",
  disabled: "#C8D2CF",

  petticoat: "#B45309",
  petticoatSoft: "#FFF3E2",
  rmg: "#1D5FD1",
  rmgSoft: "#ECF3FF",

  admin: "#183B3A",
  adminSoft: "#E7F0EE",
  danger: "#C33E38",
  dangerSoft: "#FCECEA",
  success: "#1E8E5A",
  successSoft: "#E8F7EF",
  warning: "#A66A13",
  warningSoft: "#FFF6E6",
  info: "#2563EB",
  infoSoft: "#EAF1FF",

  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(8, 27, 25, 0.45)",
  overlaySoft: "rgba(8, 27, 25, 0.12)",
} as const;

export const departmentColors = {
  PETTICOAT: {
    label: "Petticoat",
    color: colors.petticoat,
    soft: colors.petticoatSoft,
  },
  RMG: {
    label: "RMG",
    color: colors.rmg,
    soft: colors.rmgSoft,
  },
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  xxxl: 34,
} as const;

export const shadow = {
  card: {
    shadowColor: "#173B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  raised: {
    shadowColor: "#0D2A25",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 7,
  },
  soft: {
    shadowColor: "#173B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
} as const;
