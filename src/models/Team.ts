import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const memberSchema = new Schema(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, trim: true, maxlength: 80, default: "Member" },
    status: { type: String, enum: ["OWNER", "ACCEPTED"], required: true },
  },
  { _id: false, timestamps: true }
);

const teamSchema = new Schema(
  {
    hackathonId: { type: Schema.Types.ObjectId, ref: "Hackathon", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 800, default: "" },
    requiredSkills: [{ type: String, required: true, trim: true, maxlength: 80 }],
    capacity: { type: Number, required: true, min: 2, max: 12, default: 4 },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

teamSchema.index({ hackathonId: 1, name: 1 }, { unique: true });
teamSchema.index({ "members.profileId": 1 });
export type TeamDocument = InferSchemaType<typeof teamSchema> & { _id: mongoose.Types.ObjectId };
export const Team: Model<TeamDocument> =
  (mongoose.models.Team as Model<TeamDocument>) || mongoose.model<TeamDocument>("Team", teamSchema);
