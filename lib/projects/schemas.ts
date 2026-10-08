import { z } from "zod";

export const PROJECT_STATUSES = ["active", "on_hold", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const projectIdSchema = z.object({
  projectId: z.uuid("This project doesn't exist."),
});

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120, "Use at most 120 characters."),
  description: z.string().trim().max(2000, "Use at most 2,000 characters."),
});
export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export const updateProjectSchema = projectIdSchema.extend(projectFormSchema.shape);
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const setProjectStatusSchema = projectIdSchema.extend({
  status: z.enum(PROJECT_STATUSES, { error: "Choose a status." }),
});
export type SetProjectStatusInput = z.infer<typeof setProjectStatusSchema>;

export const projectMemberSchema = projectIdSchema.extend({
  userId: z.uuid("Choose a person."),
});
export type ProjectMemberInput = z.infer<typeof projectMemberSchema>;
