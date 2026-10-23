"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useEffectEvent, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { submitEnquiry } from "@/app/(site)/actions";
import { Turnstile } from "@/components/turnstile";
import { img, waLink } from "@/lib/site";

type Enquiry = { product: string; image?: string };

const EnquiryContext = createContext<{ open: (e: Enquiry) => void; names: string[]; siteKey: string | null; wa: string }>({ open: () => {}, names: [], siteKey: null, wa: "" });

export function EnquiryProvider({ names, siteKey, wa, children }: { names: string[]; siteKey: string | null; wa: string; children: ReactNode }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<Enquiry & { n: number }>({ product: "", n: 0 });

  const open = (e: Enquiry) => {
    setState((s) => ({ ...e, n: s.n + 1 }));
    dlg.current?.showModal();
  };
  const close = () => dlg.current?.close();

  return (
    <EnquiryContext.Provider value={{ open, names, siteKey, wa }}>
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

export function EnquiryForm({ product = "", source = "quote", onSent }: { product?: string; source?: "quote" | "contact"; onSent?: () => void }) {
  const { names, siteKey, wa } = useContext(EnquiryContext);
  const [state, dispatch, pending] = useActionState(submitEnquiry, {});
  const form = useRef<HTMLFormElement>(null);
  const match = product ? names.find((n) => product.startsWith(n)) : undefined;

  const sent = useEffectEvent(() => {
    form.current?.reset();
    onSent?.();
  });

  useEffect(() => {
    if (state.ok) sent();
  }, [state.ok]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  const whatsapp = (e: MouseEvent<HTMLButtonElement>) => {
    const f = e.currentTarget.form!;
    if (f.reportValidity()) window.open(waLink(wa, formText(f)), "_blank", "noopener");
  };

  return (
    <form ref={form} onSubmit={submit} aria-busy={pending}>
      <input type="hidden" name="source" value={source} />
      <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="f">Name<input required name="name" maxLength={80} placeholder="Your name" /></label>
      <label className="f">Mobile<input required name="phone" type="tel" pattern="[0-9+ ]{10,14}" placeholder="10-digit mobile" /></label>
      <label className="f full">Product
        <select name="product" defaultValue={match ?? product}>
          <option value="">Select product</option>
          {names.map((n) => <option key={n}>{n}</option>)}
          {product && !match && <option>{product}</option>}
        </select>
      </label>
      <label className="f">Quantity<input name="qty" maxLength={40} placeholder="e.g. 1000" /></label>
      <label className="f">City<input name="city" maxLength={60} placeholder="Delivery city" /></label>
      <label className="f full">Details<textarea name="msg" rows={3} maxLength={2000} placeholder="Size, finish, design ready or not…" defaultValue={product ? `Interested in: ${product}` : ""} /></label>
      {siteKey && <Turnstile key={state.n ?? 0} siteKey={siteKey} />}
      <div className="acts">
        <button className="btn btn-p" type="submit" disabled={pending || state.ok}>{pending ? "Sending…" : "Send enquiry"}</button>
        <button className="btn btn-wa" type="button" onClick={whatsapp}>WhatsApp</button>
      </div>
      {state.error && <div className="err show" role="alert">{state.error}</div>}
      <div className={state.ok ? "ok show" : "ok"} role="status">✓ Thanks! We&apos;ll call you back shortly.</div>
    </form>
  );
}
