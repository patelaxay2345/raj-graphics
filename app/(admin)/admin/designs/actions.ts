"use server";

import { z } from "zod";
import { getDb } from "@/db";
import { runAdminAction } from "@/lib/admin-action";
import * as d from "@/lib/admin-designs";
import { mediaStore } from "@/lib/media";

const id = z.number().int().positive();

export const setDesignsActiveAction = async (groupId: number, ids: number[], on: boolean) =>
  runAdminAction(() => d.setDesignsActive(getDb(), id.parse(groupId), ids, z.boolean().parse(on)));

export const moveDesignsAction = async (groupId: number, ids: number[], toGroupId: number) =>
  runAdminAction(() => d.moveDesigns(getDb(), id.parse(groupId), ids, id.parse(toGroupId)));

export const deleteDesignsAction = async (groupId: number, ids: number[]) =>
  runAdminAction(() => d.deleteDesigns(getDb(), mediaStore(getDb()), id.parse(groupId), ids));

export const reorderDesignsAction = async (groupId: number, ids: number[]) =>
  runAdminAction(() => d.reorderDesigns(getDb(), id.parse(groupId), ids));
