import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const invitationSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, trim: true, maxlength: 500, default: "" },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"], default: "PENDING", required: true },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

invitationSchema.index({ teamId: 1, candidateId: 1, status: 1 });
export type InvitationDocument = InferSchemaType<typeof invitationSchema> & { _id: mongoose.Types.ObjectId };
export const Invitation: Model<InvitationDocument> =
  (mongoose.models.Invitation as Model<InvitationDocument>) || mongoose.model<InvitationDocument>("Invitation", invitationSchema);
