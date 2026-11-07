import IntlMessageFormat from "intl-messageformat";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ur from "../../messages/ur.json";

type Tree = { [key: string]: Tree | string | Tree[] | string[] };

/** Every message as `path → text` (arrays by index). */
function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value as Tree, path)) out.set(k, v);
  }
  return out;
}

/** The ICU argument names a message uses, e.g. {name}, {n, plural, …}. */
function argumentsOf(message: string): string[] {
  // Arguments are camelCase; select/plural branch text is not an argument.
  return [
    ...new Set([...message.matchAll(/\{([a-z]\w*)\s*[,}]/g)].map((m) => m[1])),
  ].sort();
}

const enMessages = flatten(en as unknown as Tree);
const urMessages = flatten(ur as unknown as Tree);

describe("messages", () => {
  it("ur.json has every key of en.json and no extra one", () => {
    const missing = [...enMessages.keys()].filter((k) => !urMessages.has(k));
    const extra = [...urMessages.keys()].filter((k) => !enMessages.has(k));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it("every Urdu message takes the same arguments as its English one", () => {
    const different = [...enMessages]
      .filter(([key, text]) => {
        const urdu = urMessages.get(key);
        return (
          urdu !== undefined &&
          argumentsOf(text).join() !== argumentsOf(urdu).join()
        );
      })
      .map(([key]) => key);
    expect(different).toEqual([]);
  });

  it("every message is valid ICU in both languages", () => {
    const broken: string[] = [];
    for (const [locale, messages] of [
      ["en", enMessages],
      ["ur", urMessages],
    ] as const) {
      for (const [key, text] of messages) {
        try {
          new IntlMessageFormat(text, locale);
        } catch {
          broken.push(`${locale}:${key}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("no Urdu message is left in English by mistake", () => {
    // Texts meant to read the same in both: codes, sample values, Latin
    // file names, and the English sub-lines of the bilingual screens.
    const sameOk =
      /(subline|Subline|Placeholder|placeholder|countryCode|country|code|shortcut|exportFileName|file|pdf|\.sms|\.en$|\.tone$|papers\.a[45])/;
    const untranslated = [...urMessages]
      .filter(([key, text]) => text === enMessages.get(key))
      .filter(([key]) => !sameOk.test(key))
      .filter(([, text]) => /[A-Za-z]{3}/.test(text.replace(/\{[^{}]*\}/g, "")))
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });
});
