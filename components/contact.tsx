import { EnquiryForm } from "@/components/enquiry";

export function Contact() {
  return (
    <section className="contact" id="contact">
      <div>
        <h2>Tell us what<br /><em>you need</em></h2>
        <p className="lead">Share your requirement and we&apos;ll get back with price, paper options and delivery time.</p>
        <ul>
          <li><i>📞</i><span><b>Call / WhatsApp</b>+91 98XXX XXXXX</span></li>
          <li><i>✉️</i><span><b>Email</b>hello@rajgraphics.in</span></li>
          <li><i>📍</i><span><b>Store</b>Shop address, Area, City – PIN</span></li>
        </ul>
      </div>
      <EnquiryForm source="contact" />
    </section>
  );
}
