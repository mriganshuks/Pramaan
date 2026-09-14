import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const hackathonSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1500 },
    location: { type: String, required: true, trim: true, maxlength: 100 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participantIds: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true }
);

hackathonSchema.index({ startsAt: 1 });
hackathonSchema.index({ participantIds: 1 });
export type HackathonDocument = InferSchemaType<typeof hackathonSchema> & { _id: mongoose.Types.ObjectId };
export const Hackathon: Model<HackathonDocument> =
  (mongoose.models.Hackathon as Model<HackathonDocument>) || mongoose.model<HackathonDocument>("Hackathon", hackathonSchema);
