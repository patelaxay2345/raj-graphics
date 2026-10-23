"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { runAdminAction, type ActionState } from "@/lib/admin-action";
import * as ord from "@/lib/admin-orders";
import { requireOwner } from "@/lib/owner";

const id = z.coerce.number().int().positive();

export async function createOrderAction(input: ord.OrderInput): Promise<ActionState> {
  let created = 0;
  const r = await runAdminAction(async () => (created = (await ord.createOrder(getDb(), input)).id));
  if (r.error) return r;
  redirect(`/admin/orders/${created}`);
}

export const updateOrderAction = async (orderId: number, input: ord.OrderInput) => runAdminAction(() => ord.updateOrder(getDb(), id.parse(orderId), input));

export const setOrderStatusAction = async (_: ActionState, fd: FormData) =>
  runAdminAction(() => ord.setOrderStatus(getDb(), id.parse(fd.get("id")), z.enum(["true", "false"]).parse(fd.get("on")) === "true"));

export async function findCustomerAction(phone: string) {
  await requireOwner();
  const c = await ord.findCustomer(getDb(), z.string().max(30).parse(phone));
  return c ? { name: c.name, business: c.business, gstin: c.gstin, city: c.city, address: c.address } : null;
}
