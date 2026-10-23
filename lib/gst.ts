export const STATES: [string, string][] = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"], ["05", "Uttarakhand"], ["06", "Haryana"],
  ["07", "Delhi"], ["08", "Rajasthan"], ["09", "Uttar Pradesh"], ["10", "Bihar"], ["11", "Sikkim"], ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"], ["16", "Tripura"], ["17", "Meghalaya"], ["18", "Assam"],
  ["19", "West Bengal"], ["20", "Jharkhand"], ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"], ["27", "Maharashtra"], ["29", "Karnataka"], ["30", "Goa"], ["31", "Lakshadweep"],
  ["32", "Kerala"], ["33", "Tamil Nadu"], ["34", "Puducherry"], ["35", "Andaman and Nicobar Islands"], ["36", "Telangana"],
  ["37", "Andhra Pradesh"], ["38", "Ladakh"], ["97", "Other Territory"],
];

export const stateName = (code: string) => STATES.find(([c]) => c === code)?.[1] ?? code;

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

export function financialYear(isoDate: string) {
  const [y, m] = isoDate.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${String(start % 100).padStart(2, "0")}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export const invoiceNo = (fy: string, seq: number) => `INV/${fy}/${String(seq).padStart(4, "0")}`;

export function invoiceTotals(lines: { qty: number; rate: number }[], gstRate: number, intra: boolean) {
  const taxable = lines.reduce((a, l) => a + l.qty * l.rate, 0);
  const half = intra ? Math.round((taxable * gstRate) / 200) : 0;
  const igst = intra ? 0 : Math.round((taxable * gstRate) / 100);
  const exact = taxable + 2 * half + igst;
  const total = Math.round(exact / 100) * 100;
  return { taxable, cgst: half, sgst: half, igst, roundOff: total - exact, total };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const two = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const three = (n: number) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${two(n % 100)}` : ""}` : two(n));

function words(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 1e7);
  const parts = [
    crore ? `${words(crore)} Crore` : "",
    Math.floor(n / 1e5) % 100 ? `${two(Math.floor(n / 1e5) % 100)} Lakh` : "",
    Math.floor(n / 1e3) % 100 ? `${two(Math.floor(n / 1e3) % 100)} Thousand` : "",
    n % 1000 ? three(n % 1000) : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function rupeesInWords(paise: number) {
  const r = Math.floor(paise / 100);
  const p = paise % 100;
  return `Rupees ${words(r)}${p ? ` and ${two(p)} Paise` : ""} Only`;
}
