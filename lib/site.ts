export const BEST: [string, string][] = [["Visiting Cards", "m-visiting.jpg"], ["Flex Banners", "m-flex.jpg"], ["Stickers", "m-stickers.jpg"], ["ID Cards", "m-idcard.jpg"], ["Brochures", "m-brochure.jpg"]];
// Placeholder testimonials — replace with real customer reviews before launch.
export const REVIEWS: [string, string, string][] = [
  ["Excellent quality and super fast delivery. Our visiting cards came out perfect!", "Amit Shah", "Small Business Owner"],
  ["Very professional service. Printing quality is top-notch and prices are very reasonable.", "Priya Patel", "Event Manager"],
  ["I have been using Raj Graphics for all our office printing needs. Highly recommended!", "Rohit Mehta", "Corporate Client"],
];

export const TPL_PAGE = 20;

export const img = (key: string) => `/img/${key}`;

export const waLink = (wa: string, t?: string) => `https://wa.me/${wa}?text=${encodeURIComponent(t || "Hi Raj Graphics, I need a printing quote.")}`;

export const isFitImage = (key: string) => /^(t\/|m-|cover\/)/.test(key);
