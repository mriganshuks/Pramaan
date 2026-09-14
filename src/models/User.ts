import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ["CLAIMED", "NOT_VERIFIED", "PARTIALLY_VERIFIED", "VERIFIED"], default: "CLAIMED", required: true },
    assessmentScore: { type: Number, min: 0, max: 100 },
    evidenceCount: { type: Number, default: 0, min: 0 },
    lastAssessmentAt: { type: Date },
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1200 },
    url: { type: String, trim: true, maxlength: 500 },
    skills: [{ type: String, trim: true, maxlength: 80 }],
  },
  { _id: true, timestamps: true }
);

const evidenceSchema = new Schema(
  {
    source: { type: String, enum: ["GITHUB", "LEETCODE", "CODECHEF", "HACKERRANK", "OTHER"], required: true },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    skills: [{ type: String, trim: true, maxlength: 80 }],
  },
  { _id: true, timestamps: true }
);

const profileSchema = new Schema(
  {
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    handle: { type: String, required: true, trim: true, lowercase: true, maxlength: 32 },
    headline: { type: String, trim: true, maxlength: 120, default: "" },
    bio: { type: String, trim: true, maxlength: 1200, default: "" },
    location: { type: String, trim: true, maxlength: 100, default: "" },
    education: { type: String, trim: true, maxlength: 160, default: "" },
    availableForTeams: { type: Boolean, default: true },
    skills: { type: [skillSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    evidence: { type: [evidenceSchema], default: [] },
  },
  { timestamps: true }
);

profileSchema.index({ handle: 1 }, { unique: true });
profileSchema.index({ email: 1 }, { unique: true });
profileSchema.index({ "skills.normalizedName": 1, availableForTeams: 1 });

export type UserDocument = InferSchemaType<typeof profileSchema> & { _id: mongoose.Types.ObjectId };
export const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>("User", profileSchema);
