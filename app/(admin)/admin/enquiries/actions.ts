"use server";

import { z } from "zod";
import { getDb } from "@/db";
import { runAdminAction, type ActionState } from "@/lib/admin-action";
import { saveEnquiryNotes, setEnquiryStatus } from "@/lib/enquiries";

const id = z.coerce.number().int().positive();

export const setEnquiryStatusAction = async (_: ActionState, fd: FormData) => runAdminAction(() => setEnquiryStatus(getDb(), id.parse(fd.get("id")), String(fd.get("status"))));

export const saveEnquiryNotesAction = async (_: ActionState, fd: FormData) => runAdminAction(() => saveEnquiryNotes(getDb(), id.parse(fd.get("id")), String(fd.get("notes") ?? "")));
