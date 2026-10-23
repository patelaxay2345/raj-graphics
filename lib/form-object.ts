const KEY = /^[a-zA-Z]+(?:\.(?:[a-zA-Z]+|\d{1,2}))*$/;
const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);

type Node = Record<string, unknown> | unknown[];

export function formObject(fd: FormData) {
  const root: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value !== "string" || !KEY.test(key)) continue;
    const parts = key.split(".");
    if (parts.some((p) => UNSAFE.has(p))) continue;
    let node: Node = root;
    for (let i = 0; i < parts.length; i++) {
      const box = node as Record<string, unknown>;
      const part = parts[i];
      if (i === parts.length - 1) {
        box[part] = value;
        break;
      }
      if (!Object.hasOwn(box, part) || typeof box[part] !== "object" || box[part] === null) box[part] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      node = box[part] as Node;
    }
  }
  return root;
}
