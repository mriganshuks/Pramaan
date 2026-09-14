import { z } from "zod";
import type { IntegrityEventType } from "@/lib/assessment-types";

const eventTypes = [
  "TAB_HIDDEN",
  "WINDOW_BLUR",
  "WINDOW_FOCUS",
  "FULLSCREEN_EXIT",
  "CAMERA_DISABLED",
  "MICROPHONE_DISABLED",
  "CAMERA_PERMISSION_LOST",
  "MICROPHONE_PERMISSION_LOST",
  "CAMERA_DISCONNECT",
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
  "NETWORK_DISCONNECT",
  "REPEATED_SUBMISSION",
  "NO_FACE_DETECTED",
  "MULTIPLE_FACES_DETECTED",
  "PHONE_DETECTED",
  "EXCESSIVE_HEAD_MOVEMENT",
  "EXCESSIVE_GAZE",
] as const;

export const integrityEventsSchema = z.array(
  z.object({
    type: z.enum(eventTypes),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    timestamp: z.coerce.date().optional(),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
).min(1).max(20);

export const allowedIntegrityTypes = new Set<IntegrityEventType>(eventTypes);
