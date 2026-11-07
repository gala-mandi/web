import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { SHOP_TIME_ZONE } from "@/lib/format";
import { localeSources, resolveLocale } from "./resolve";

/**
 * next-intl without i18n routing: no locale in the URL. The language comes
 * from this browser's cookies (see `resolve.ts`), so the server renders the
 * page, `<html lang dir>` included, in the right language from the start.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(localeSources((name) => store.get(name)?.value));
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: SHOP_TIME_ZONE,
  };
});
