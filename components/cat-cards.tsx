import Link from "next/link";
import type { CategoryCard } from "@/lib/catalog";
import { img } from "@/lib/site";

export function CatCards({ list }: { list: CategoryCard[] }) {
  return list.map((c, i) => (
    <Link key={c.slug} className="cat" href={`/c/${c.slug}`}>
      {c.tag && <span className="tag">{c.tag}</span>}
      <div className={`ph c${i % 5}`}><img loading="lazy" src={img(c.mockupKey || c.coverKey)} alt={c.name} /></div>
      <div className="bd">
        <h3>{c.name}</h3>
        <span className="go">→</span>
        <div className="meta"><span>⏱ {c.turnaround}</span><b>{c.designs ? `${c.designs} designs` : "Get a quote"}</b></div>
      </div>
    </Link>
  ));
}
