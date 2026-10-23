"use server";

import { z } from "zod";
import { getDb } from "@/db";
import { runAdminAction, type ActionState } from "@/lib/admin-action";
import { moveHomeCategory, setCategoryFlag } from "@/lib/admin-categories";
import { formObject } from "@/lib/form-object";
import * as home from "@/lib/home";

const id = z.coerce.number().int().positive();
const dir = z.enum(["-1", "1"]).transform((d) => (d === "1" ? 1 : -1) as 1 | -1);
const on = z.enum(["true", "false"]).transform((v) => v === "true");
const review = (fd: FormData) => ({ quote: String(fd.get("quote") ?? ""), name: String(fd.get("name") ?? ""), role: String(fd.get("role") ?? "") });

export const saveHomeAction = async (_: ActionState, fd: FormData) => runAdminAction(() => home.saveHome(getDb(), formObject(fd) as home.HomeInput));

export const setHomeCategoryAction = async (_: ActionState, fd: FormData) => runAdminAction(() => setCategoryFlag(getDb(), id.parse(fd.get("id")), "showOnHome", on.parse(fd.get("on"))));
export const moveHomeCategoryAction = async (_: ActionState, fd: FormData) => runAdminAction(() => moveHomeCategory(getDb(), id.parse(fd.get("id")), dir.parse(fd.get("dir"))));

export const addReviewAction = async (_: ActionState, fd: FormData) => runAdminAction(() => home.addTestimonial(getDb(), review(fd)));
export const updateReviewAction = async (_: ActionState, fd: FormData) => runAdminAction(() => home.updateTestimonial(getDb(), id.parse(fd.get("id")), review(fd)));
export const setReviewActiveAction = async (_: ActionState, fd: FormData) => runAdminAction(() => home.setTestimonialActive(getDb(), id.parse(fd.get("id")), on.parse(fd.get("on"))));
export const moveReviewAction = async (_: ActionState, fd: FormData) => runAdminAction(() => home.moveTestimonial(getDb(), id.parse(fd.get("id")), dir.parse(fd.get("dir"))));
export const deleteReviewAction = async (_: ActionState, fd: FormData) => runAdminAction(() => home.deleteTestimonial(getDb(), id.parse(fd.get("id"))));
