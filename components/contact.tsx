import { EnquiryForm } from "@/components/enquiry";
import { loadStore } from "@/lib/site-data";

export async function Contact() {
  const store = await loadStore();
  return (
    <section className="contact" id="contact">
      <div>
        <h2>Tell us what<br /><em>you need</em></h2>
        <p className="lead">Share your requirement and we&apos;ll get back with price, paper options and delivery time.</p>
        <ul>
          {store.phone && <li><i>📞</i><span><b>Call / WhatsApp</b>{store.phone}</span></li>}
          {store.email && <li><i>✉️</i><span><b>Email</b>{store.email}</span></li>}
          {store.address && <li><i>📍</i><span><b>Store</b>{store.address}</span></li>}
        </ul>
      </div>
      <EnquiryForm source="contact" />
    </section>
  );
}
