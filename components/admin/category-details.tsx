import { ActionForm } from "@/components/admin/action-form";
import type { ActionState } from "@/lib/admin-action";

type Values = { id?: number; name: string; slug: string; turnaround: string; tag: string | null; description: string; designPrefix: string; nextDesignNo?: number };

export function CategoryDetails({ action, values, submit }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values: Values; submit: string }) {
  return (
    <ActionForm action={action} className="pad" savedLabel="Saved">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="row">
        <label className="fld"><span className="lbl">Name</span><input className="in" name="name" defaultValue={values.name} required maxLength={80} /></label>
        <label className="fld"><span className="lbl">URL slug</span><input className="in mono" name="slug" defaultValue={values.slug} required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" /><span className="hint">Changing it changes the page address /c/…</span></label>
      </div>
      <div className="row">
        <label className="fld w-sm"><span className="lbl">Turnaround</span><input className="in" name="turnaround" defaultValue={values.turnaround} required maxLength={40} /></label>
        <label className="fld w-sm"><span className="lbl">Tag on card</span><input className="in" name="tag" defaultValue={values.tag ?? ""} maxLength={30} /><span className="hint">Optional · e.g. Most popular</span></label>
        <label className="fld w-sm"><span className="lbl">Design code prefix</span><input className="in mono" name="designPrefix" defaultValue={values.designPrefix} maxLength={12} pattern="[A-Z0-9]*-?" />{values.nextDesignNo !== undefined && <span className="hint">Next upload: {values.designPrefix}{values.nextDesignNo}</span>}</label>
      </div>
      <label className="fld full"><span className="lbl">Description</span><textarea className="in" name="description" defaultValue={values.description} maxLength={600} /><span className="hint">Shown under the title on the category page. Leave empty for the default line.</span></label>
      <div className="form-foot"><button className="btn btn-p">{submit}</button></div>
    </ActionForm>
  );
}
