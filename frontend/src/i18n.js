import english from "../../src/sphinx_yaq/locales/en.json";

/** One translator per quiz: no mutable global locale or network requests. */
export function createTranslator({ language = "en", messages = {} } = {}) {
  const pluralRules = new Intl.PluralRules(language);
  const translate = (key, parameters = {}) => {
    let template = messages[key] ?? english[key];
    if (typeof template === "object" && template !== null) {
      template = template[pluralRules.select(parameters.count)] ?? template.other;
    }
    if (typeof template !== "string") throw new Error(`Unknown YAQ message: ${key}`);
    return template.replace(/\{(\w+)\}/g, (match, name) => String(parameters[name] ?? match));
  };
  translate.language = language;
  return translate;
}

export function translatorFor(element) {
  try {
    return createTranslator(JSON.parse(element.getAttribute("data-i18n") || "{}"));
  } catch {
    return createTranslator();
  }
}
