"use client";

import { createContext, useContext, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { img, waLink } from "@/lib/site";

type Enquiry = { product: string; image?: string };

const EnquiryContext = createContext<{ open: (e: Enquiry) => void; names: string[] }>({ open: () => {}, names: [] });

export function EnquiryProvider({ names, children }: { names: string[]; children: ReactNode }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<Enquiry & { n: number }>({ product: "", n: 0 });

  const open = (e: Enquiry) => {
    setState((s) => ({ ...e, n: s.n + 1 }));
    dlg.current?.showModal();
  };
  const close = () => dlg.current?.close();

  return (
    <EnquiryContext.Provider value={{ open, names }}>
      {children}
      <dialog ref={dlg} onClick={(e) => e.target === dlg.current && close()}>
        <div className="mh">
          <img src={img(state.image || "visiting.jpg")} alt="" />
          <div>
            <b>{state.product || "Get a quote"}</b>
            <span>We reply within 30 minutes in working hours</span>
          </div>
          <button className="x" onClick={close} aria-label="Close">×</button>
        </div>
        <EnquiryForm key={state.n} product={state.product} onSent={() => setTimeout(close, 1600)} />
      </dialog>
    </EnquiryContext.Provider>
  );
}

export function EnquireButton({ product = "", image, className, link, children }: { product?: string; image?: string; className?: string; link?: boolean; children: ReactNode }) {
  const { open } = useContext(EnquiryContext);
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    open({ product, image });
  };
  return link ? (
    <a className={className} href="#" onClick={onClick}>{children}</a>
  ) : (
    <button className={className} onClick={onClick}>{children}</button>
  );
}

const formText = (f: HTMLFormElement) => {
  const d = Object.fromEntries(new FormData(f));
  return `Hi Raj Graphics, I need a quote.\nName: ${d.name}\nProduct: ${d.product}\nQty: ${d.qty}\nCity: ${d.city}\n${d.msg}`;
};

export function EnquiryForm({ product = "", onSent }: { product?: string; onSent?: () => void }) {
  const { names } = useContext(EnquiryContext);
  const [sent, setSent] = useState(false);
  const match = product ? names.find((n) => product.startsWith(n)) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
    onSent?.();
  };
  const whatsapp = (e: MouseEvent<HTMLButtonElement>) => {
    const f = e.currentTarget.form!;
    if (f.reportValidity()) window.open(waLink(formText(f)), "_blank", "noopener");
  };

  return (
    <form onSubmit={submit}>
      <label className="f">Name<input required name="name" placeholder="Your name" /></label>
      <label className="f">Mobile<input required name="phone" type="tel" pattern="[0-9+ ]{10,14}" placeholder="10-digit mobile" /></label>
      <label className="f full">Product
        <select name="product" defaultValue={match ?? product}>
          <option value="">Select product</option>
          {names.map((n) => <option key={n}>{n}</option>)}
          {product && !match && <option>{product}</option>}
        </select>
      </label>
      <label className="f">Quantity<input name="qty" placeholder="e.g. 1000" /></label>
      <label className="f">City<input name="city" placeholder="Delivery city" /></label>
      <label className="f full">Details<textarea name="msg" rows={3} placeholder="Size, finish, design ready or not…" defaultValue={product ? `Interested in: ${product}` : ""} /></label>
      <div className="acts">
        <button className="btn btn-p" type="submit" disabled={sent}>Send enquiry</button>
        <button className="btn btn-wa" type="button" onClick={whatsapp}>WhatsApp</button>
      </div>
      <div className={sent ? "ok show" : "ok"}>✓ Thanks! We&apos;ll call you back shortly.</div>
    </form>
  );
}
