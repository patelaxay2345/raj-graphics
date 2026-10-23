"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { runAdminAction, type ActionState } from "@/lib/admin-action";
import * as ch from "@/lib/admin-challans";
import { istToday } from "@/lib/admin-orders";

const id = z.coerce.number().int().positive();

export async function createChallanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let created = 0;
  const r = await runAdminAction(async () => (created = await ch.createChallanFromOrder(getDb(), id.parse(fd.get("orderId")))));
  if (r.error) return r;
  redirect(`/admin/challans/${created}`);
}

export const saveChallanAction = async (challanId: number, input: ch.ChallanInput) => runAdminAction(() => ch.updateChallanDraft(getDb(), id.parse(challanId), input));

export const issueChallanAction = async (challanId: number, input: ch.ChallanInput) =>
  runAdminAction(async () => {
    const db = getDb();
    await ch.updateChallanDraft(db, id.parse(challanId), input);
    await ch.issueChallan(db, id.parse(challanId), istToday());
  });

export const setDeliveredAction = async (_: ActionState, fd: FormData) =>
  runAdminAction(() => ch.setChallanDelivered(getDb(), id.parse(fd.get("id")), z.enum(["true", "false"]).parse(fd.get("on")) === "true"));

export async function deleteChallanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await runAdminAction(() => ch.deleteChallanDraft(getDb(), id.parse(fd.get("id"))));
  if (r.error) return r;
  redirect("/admin/challans");
}
