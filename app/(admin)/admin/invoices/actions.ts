"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { runAdminAction, type ActionState } from "@/lib/admin-action";
import * as inv from "@/lib/admin-invoices";
import { istToday } from "@/lib/admin-orders";

const id = z.coerce.number().int().positive();

export async function createInvoiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let created = 0;
  const r = await runAdminAction(async () => (created = await inv.createInvoiceFromOrder(getDb(), id.parse(fd.get("orderId")))));
  if (r.error) return r;
  redirect(`/admin/invoices/${created}`);
}

export const saveDraftAction = async (invoiceId: number, input: inv.DraftInput) => runAdminAction(() => inv.updateDraft(getDb(), id.parse(invoiceId), input));

export const issueAction = async (invoiceId: number, input: inv.DraftInput) =>
  runAdminAction(async () => {
    const db = getDb();
    await inv.updateDraft(db, id.parse(invoiceId), input);
    await inv.issueInvoice(db, id.parse(invoiceId), istToday());
  });

export const setPaidAction = async (_: ActionState, fd: FormData) =>
  runAdminAction(() => inv.setInvoicePaid(getDb(), id.parse(fd.get("id")), z.enum(["true", "false"]).parse(fd.get("on")) === "true"));

export async function deleteDraftAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await runAdminAction(() => inv.deleteDraft(getDb(), id.parse(fd.get("id"))));
  if (r.error) return r;
  redirect("/admin/invoices");
}
