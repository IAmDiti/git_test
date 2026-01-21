export const ZODIAC_SIGN_VALUES = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGN_VALUES)[number];

export const ZODIAC_SIGNS: Array<{ value: ZodiacSign; label: string }> = [
  { value: "aries", label: "Aries" },
  { value: "taurus", label: "Taurus" },
  { value: "gemini", label: "Gemini" },
  { value: "cancer", label: "Cancer" },
  { value: "leo", label: "Leo" },
  { value: "virgo", label: "Virgo" },
  { value: "libra", label: "Libra" },
  { value: "scorpio", label: "Scorpio" },
  { value: "sagittarius", label: "Sagittarius" },
  { value: "capricorn", label: "Capricorn" },
  { value: "aquarius", label: "Aquarius" },
  { value: "pisces", label: "Pisces" },
];

const SIGN_SET = new Set<string>(ZODIAC_SIGN_VALUES);

export function isZodiacSign(value: string | null | undefined): value is ZodiacSign {
  if (!value) return false;
  return SIGN_SET.has(value);
}
