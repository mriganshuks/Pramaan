import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const optionSchema = new Schema({ id: String, text: String }, { _id: false });
const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true },
    topic: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    correctOption: { type: String, required: true, select: false },
    explanation: { type: String, required: true, select: false },
  },
  { _id: false }
);

const skillChallengeSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    skill: { type: String, required: true, trim: true },
    state: { type: String, enum: ["SENT", "IN_PROGRESS", "COMPLETED", "EXPIRED", "CANCELLED", "ACCEPTED", "REJECTED"], required: true, default: "SENT" },
    questions: { type: [questionSchema], required: true },
    generatedBy: { type: String, enum: ["openai"], required: true },
    startedAt: { type: Date },
    expiresAt: { type: Date },
    submittedAt: { type: Date },
    answers: { type: Map, of: String, default: {} },
    score: { type: Number, min: 0, max: 100 },
    integrityScore: { type: Number, min: 0, max: 100 },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"] },
  },
  { timestamps: true }
);

skillChallengeSchema.index({ candidateId: 1, state: 1 });
skillChallengeSchema.index({ teamId: 1, candidateId: 1, state: 1 });
export type SkillChallengeDocument = InferSchemaType<typeof skillChallengeSchema> & { _id: mongoose.Types.ObjectId };
export const SkillChallenge: Model<SkillChallengeDocument> =
  (mongoose.models.SkillChallenge as Model<SkillChallengeDocument>) || mongoose.model<SkillChallengeDocument>("SkillChallenge", skillChallengeSchema);
