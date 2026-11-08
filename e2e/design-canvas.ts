import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Renders a design-canvas export (`docs/design/auth/*.dc.html`) to a plain
 * HTML file a browser can open without the design tool's `support.js`: the
 * `{{…}}` values come from the file's own `renderVals()` with the default
 * props, `<sc-for>` / `<sc-if>` are expanded and `<dc-import>` is replaced
 * by the imported component. Used by the visual review (ticket 40) only.
 */

const DESIGN_DIR = path.resolve("docs/design/auth");

type Vals = Record<string, unknown>;

class DCLogic {
  props: Record<string, unknown>;
  state: Record<string, unknown> = {};
  constructor(props: Record<string, unknown>) {
    this.props = props;
  }
  setState() {}
}

function parts(name: string) {
  const file = fs.readFileSync(
    path.join(DESIGN_DIR, `${name}.dc.html`),
    "utf8",
  );
  const body = /<x-dc>([\s\S]*)<\/x-dc>/.exec(file)?.[1] ?? "";
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(body)?.[1] ?? "";
  const markup = body.replace(/<helmet>[\s\S]*?<\/helmet>/, "");
  const script = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(
    file,
  );
  const propsJson = /data-props='([^']*)'/.exec(file)?.[1] ?? '{"$preview":{}}';
  return { helmet, markup, code: script?.[1] ?? "", propsJson };
}

function lookup(scope: Vals, expr: string): unknown {
  const key = expr.trim();
  if (key === "true") return true;
  if (key === "false") return false;
  return key
    .split(".")
    .reduce<unknown>(
      (value, k) =>
        value && typeof value === "object" ? (value as Vals)[k] : undefined,
      scope,
    );
}

function fill(html: string, scope: Vals): string {
  // Event handlers ({{toggle}} …) do nothing in a still picture.
  let out = html.replace(/\s+on[A-Za-z]+="\{\{[^}]*\}\}"/g, "");
  out = out.replace(
    /<sc-for list="\{\{([^}]+)\}\}" as="(\w+)"[^>]*>([\s\S]*?)<\/sc-for>/g,
    (_, list: string, as: string, inner: string) => {
      const items = lookup(scope, list);
      return Array.isArray(items)
        ? items.map((item) => fill(inner, { ...scope, [as]: item })).join("")
        : "";
    },
  );
  out = out.replace(
    /<sc-if value="\{\{([^}]+)\}\}"[^>]*>([\s\S]*?)<\/sc-if>/g,
    (_, cond: string, inner: string) =>
      lookup(scope, cond) ? fill(inner, scope) : "",
  );
  return out.replace(/\{\{([^}]+)\}\}/g, (_, expr: string) => {
    const value = lookup(scope, expr);
    return value === undefined || value === null ? "" : String(value);
  });
}

function render(name: string, props: Record<string, unknown> = {}): string {
  const { markup, code, propsJson } = parts(name);
  const declared = JSON.parse(propsJson) as Record<
    string,
    { default?: unknown; width?: number }
  >;
  const defaults: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(declared)) {
    if (!key.startsWith("$") && spec.default !== undefined) {
      defaults[key] = spec.default;
    }
  }
  const Component = new Function("DCLogic", `${code}\nreturn Component;`)(
    DCLogic,
  ) as new (props: Record<string, unknown>) => { renderVals(): Vals };
  const vals = new Component({ ...defaults, ...props }).renderVals();
  const filled = fill(markup, vals);
  return filled.replace(
    /<dc-import name="(\w+)"([^>]*)><\/dc-import>/g,
    (_, imported: string, attrs: string) => {
      const theme = /theme="([^"]*)"/.exec(attrs)?.[1];
      return render(imported, theme ? { theme } : {});
    },
  );
}

/** Writes the rendered design to `outDir` and returns its file:// URL. */
export function renderDesign(name: string, outDir: string): string {
  const { helmet } = parts(name);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${pathToFileURL(DESIGN_DIR).href}/">
${helmet}</head><body>${render(name)}</body></html>`;
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${name}.html`);
  fs.writeFileSync(file, html);
  return pathToFileURL(file).href;
}
