import { z } from "zod"

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD")

export const projectFields = z.object({
  name: z.string().trim().min(1, "name is required"),
  description: z.string().nullable().optional(),
  activity_type: z.string().nullable().optional(),
  center_lat: z.number().min(-90).max(90).nullable().optional(),
  center_lng: z.number().min(-180).max(180).nullable().optional(),
  radius_m: z.number().int().min(10).max(50_000).optional(),
  start_date: date.nullable().optional(),
  end_date: date.nullable().optional(),
})

export const createProjectSchema = projectFields.extend({ asset_ids: z.array(z.string().uuid()).optional() })
export const updateProjectSchema = projectFields.partial()
export const assignSchema = z.object({ asset_ids: z.array(z.string().uuid()).min(1), action: z.enum(["assign", "unassign"]) })

export type Project = {
  id: string
  name: string
  description: string | null
  activity_type: string | null
  center_lat: number | null
  center_lng: number | null
  radius_m: number | null
  start_date: string | null
  end_date: string | null
}
