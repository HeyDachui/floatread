import { z } from "zod";

export const translationLanguageSchema = z.enum([
  "zh-Hans",
  "zh-Hant",
  "en",
  "ja",
  "ko",
  "fr",
  "de",
  "es",
  "pt",
  "it",
  "ru",
  "ar",
]);

export type TranslationLanguage = z.infer<typeof translationLanguageSchema>;

export const translationPreferencesSchema = z
  .object({
    sourceLanguages: z
      .array(translationLanguageSchema)
      .min(1)
      .max(5)
      .refine((items) => new Set(items).size === items.length, "翻译语言不能重复。"),
    targetLanguage: translationLanguageSchema,
  })
  .strict()
  .refine(
    (value) => !value.sourceLanguages.includes(value.targetLanguage),
    "目标语言不能同时作为原始语言。",
  );

export type TranslationPreferences = z.infer<typeof translationPreferencesSchema>;

export const DEFAULT_TRANSLATION_PREFERENCES: TranslationPreferences = {
  sourceLanguages: ["en"],
  targetLanguage: "zh-Hans",
};

export const TRANSLATION_LANGUAGE_KEYS: Record<TranslationLanguage, string> = {
  "zh-Hans": "languageSimplifiedChinese",
  "zh-Hant": "languageTraditionalChinese",
  en: "translationLanguageEnglish",
  ja: "languageJapanese",
  ko: "languageKorean",
  fr: "languageFrench",
  de: "languageGerman",
  es: "languageSpanish",
  pt: "languagePortuguese",
  it: "languageItalian",
  ru: "languageRussian",
  ar: "languageArabic",
};

export const TRANSLATION_LANGUAGES = translationLanguageSchema.options;

const LANGUAGE_NAMES: Record<TranslationLanguage, string> = {
  "zh-Hans": "简体中文",
  "zh-Hant": "繁体中文",
  en: "英语",
  ja: "日语",
  ko: "韩语",
  fr: "法语",
  de: "德语",
  es: "西班牙语",
  pt: "葡萄牙语",
  it: "意大利语",
  ru: "俄语",
  ar: "阿拉伯语",
};

export function languagePromptName(language: TranslationLanguage): string {
  return LANGUAGE_NAMES[language];
}

function hintLanguage(hint: string | null | undefined): TranslationLanguage | null {
  const normalized = hint?.trim().toLowerCase().replaceAll("_", "-");
  if (!normalized) return null;
  if (normalized.startsWith("zh-hant") || normalized.includes("tw") || normalized.includes("hk"))
    return "zh-Hant";
  if (normalized.startsWith("zh")) return "zh-Hans";
  for (const language of ["en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "ar"] as const) {
    if (normalized === language || normalized.startsWith(`${language}-`)) return language;
  }
  return null;
}

function latinLanguage(text: string): TranslationLanguage {
  const words = ` ${text.toLowerCase().replace(/[^a-zà-ÿ]+/gu, " ")} `;
  const scores: Array<[TranslationLanguage, number]> = [
    [
      "fr",
      [" le ", " la ", " les ", " des ", " une ", " est ", " avec "].filter((word) =>
        words.includes(word),
      ).length,
    ],
    [
      "de",
      [" der ", " die ", " das ", " und ", " ist ", " mit ", " nicht "].filter((word) =>
        words.includes(word),
      ).length,
    ],
    [
      "es",
      [" el ", " la ", " los ", " una ", " que ", " con ", " para "].filter((word) =>
        words.includes(word),
      ).length,
    ],
    [
      "pt",
      [" os ", " uma ", " que ", " com ", " para ", " não ", "ção "].filter((word) =>
        words.includes(word),
      ).length,
    ],
    [
      "it",
      [" il ", " gli ", " una ", " che ", " con ", " per ", " non "].filter((word) =>
        words.includes(word),
      ).length,
    ],
  ];
  scores.sort((left, right) => right[1] - left[1]);
  return scores[0]?.[1] && scores[0][1] >= 2 ? scores[0][0] : "en";
}

export function detectTextLanguage(
  text: string,
  languageHint?: string | null,
): TranslationLanguage | null {
  const hinted = hintLanguage(languageHint);
  if (hinted) return hinted;
  if (/[぀-ヿ]/u.test(text)) return "ja";
  if (/[가-힯]/u.test(text)) return "ko";
  if (/[؀-ۿ]/u.test(text)) return "ar";
  if (/[Ѐ-ӿ]/u.test(text)) return "ru";
  if (/[㐀-鿿]/u.test(text)) {
    const latin = text.match(/[A-Za-zÀ-ÿ]/gu)?.length ?? 0;
    const han = text.match(/[㐀-鿿]/gu)?.length ?? 0;
    if (latin >= 8 && latin / Math.max(1, latin + han) >= 0.6) return latinLanguage(text);
    return /[萬與專業東絲兩嚴喪個豐臨為麗舉麼義烏樂喬習鄉書買亂爭於雲亞產畝親]/u.test(text)
      ? "zh-Hant"
      : "zh-Hans";
  }
  const latin = text.match(/[A-Za-zÀ-ÿ]/gu)?.length ?? 0;
  if (latin >= 2 && latin / Math.max(1, text.length) >= 0.12) return latinLanguage(text);
  return null;
}
