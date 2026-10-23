import Link from "next/link";
import { CategoryDetails } from "@/components/admin/category-details";
import { IconBack } from "@/components/admin/icons";
import { TopBar } from "@/components/admin/top-bar";
import { createCategoryAction } from "../actions";

export default function NewCategoryPage() {
  return (
    <>
      <TopBar crumbs={["Catalog", "Categories", "New"]} />
      <main className="main">
        <div className="head"><div><Link className="back" href="/admin/categories"><IconBack />Categories</Link><h1>New category</h1><p>It stays hidden on the site until you switch it on.</p></div></div>
        <section className="card">
          <div className="card-hd"><h2>Details</h2></div>
          <CategoryDetails action={createCategoryAction} values={{ name: "", slug: "", turnaround: "", tag: "", description: "", designPrefix: "" }} submit="Create category" />
        </section>
      </main>
    </>
  );
}
