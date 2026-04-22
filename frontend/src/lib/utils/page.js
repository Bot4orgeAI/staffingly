/**
 * Convert a page identifier into a kebab-case application URL.
 *
 * @param {string} pageName
 * @returns {string}
 */
export function createPageUrl(pageName) {
  if (!pageName) return "/";
  return (
    "/" +
    pageName
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase()
  );
}
