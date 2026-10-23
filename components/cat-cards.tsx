import Link from "next/link";
import { designCount, img, type Category } from "@/lib/catalog";

export function CatCards({ list }: { list: Category[] }) {
  return list.map((c, i) => (
    <Link key={c.slug} className="cat" href={`/c/${c.slug}`}>
      {c.tag && <span className="tag">{c.tag}</span>}
      <div className={`ph c${i % 5}`}><img loading="lazy" src={img(c.m || c.img)} alt={c.name} /></div>
      <div className="bd">
        <h3>{c.name}</h3>
        <span className="go">→</span>
        <div className="meta"><span>⏱ {c.days}</span><b>{designCount(c.slug) ? `${designCount(c.slug)} designs` : "Get a quote"}</b></div>
      </div>
    </Link>
  ));
}
