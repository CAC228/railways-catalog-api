export function getSiteUrl(): string {
  const value = process.env.SITE_URL;
  if (!value)
    throw new Error('SITE_URL is required, for example https://example.com');
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'SITE_URL must be an HTTP(S) origin without credentials, path, query or fragment',
    );
  }
  return url.origin;
}

// Разделы и категории каталога — ЧПУ, как canonical сайта: /catalog/<раздел>/<категория>.
export function catalogPath(
  categorySlug: string,
  subcategorySlug?: string,
): string {
  return (
    '/catalog/' +
    [categorySlug, ...(subcategorySlug ? [subcategorySlug] : [])]
      .map(encodeURIComponent)
      .join('/')
  );
}

export function productPath(product: {
  slug: string;
  category: { slug: string };
  subcategory: { slug: string } | null;
}): string {
  return (
    '/catalog/' +
    [
      product.category.slug,
      ...(product.subcategory ? [product.subcategory.slug] : []),
      'product',
      product.slug,
    ]
      .map(encodeURIComponent)
      .join('/')
  );
}

export function escapeXml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]!,
  );
}
