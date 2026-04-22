/**
 * Convert a page identifier into a kebab-case application URL.
 *
 * @param {string} pageName
 * @returns {string}
 */
export function createPageUrl(pageName) {
  if (!pageName) return "/";
  const [pathAndQuery, hash = ""] = pageName.split("#");
  const [rawPath, query = ""] = pathAndQuery.split("?");
  const normalizedPath =
    "/" +
    rawPath
      .replace(/^\//, "")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();

  return `${normalizedPath}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
