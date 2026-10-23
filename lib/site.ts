export const TPL_PAGE = 20;

export const img = (key: string) => `/img/${key}`;

export const waLink = (wa: string, t?: string) => `https://wa.me/${wa}?text=${encodeURIComponent(t || "Hi Raj Graphics, I need a printing quote.")}`;

export const isFitImage = (key: string) => /^(t\/|m-|cover\/)/.test(key);
