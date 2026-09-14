import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const integrityEventSchema = new Schema(
  {
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    targetType: { type: String, enum: ["ASSESSMENT", "CHALLENGE"], required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], required: true },
    timestamp: { type: Date, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

integrityEventSchema.index({ targetId: 1, createdAt: 1 });
export type IntegrityEventDocument = InferSchemaType<typeof integrityEventSchema> & { _id: mongoose.Types.ObjectId };
export const IntegrityEvent: Model<IntegrityEventDocument> =
  (mongoose.models.IntegrityEvent as Model<IntegrityEventDocument>) || mongoose.model<IntegrityEventDocument>("IntegrityEvent", integrityEventSchema);
