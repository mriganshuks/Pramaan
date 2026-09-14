import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const optionSchema = new Schema({ id: { type: String, required: true }, text: { type: String, required: true } }, { _id: false });
const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true },
    topic: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    correctOption: { type: String, required: true, select: false },
    explanation: { type: String, required: true, select: false },
    fingerprint: { type: String, required: true },
  },
  { _id: false }
);

const assessmentAttemptSchema = new Schema(
  {
    profileId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    skill: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
    state: { type: String, enum: ["IN_PROGRESS", "EVALUATING", "COMPLETED", "TIMED_OUT", "FAILED"], required: true, index: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    submittedAt: { type: Date },
    questions: { type: [questionSchema], required: true },
    codingProblem: { type: Schema.Types.Mixed, required: true },
    generatedBy: { type: String, enum: ["openai"], required: true },
    generationNotice: { type: String },
    answers: { type: Map, of: String, default: {} },
    codingSubmission: { type: String, maxlength: 30000 },
    mcqScore: { type: Number, min: 0, max: 100 },
    codingScore: { type: Number, min: 0, max: 100 },
    codingEvaluation: { type: Schema.Types.Mixed },
    integrityScore: { type: Number, min: 0, max: 100 },
    finalScore: { type: Number, min: 0, max: 100 },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"] },
    verificationStatus: { type: String, enum: ["NOT_VERIFIED", "PARTIALLY_VERIFIED", "VERIFIED"] },
    topicPerformance: { type: Schema.Types.Mixed },
    performanceAnalysis: { type: Schema.Types.Mixed },
    verificationReceipt: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

assessmentAttemptSchema.index({ profileId: 1, createdAt: -1 });
export type AssessmentAttemptDocument = InferSchemaType<typeof assessmentAttemptSchema> & { _id: mongoose.Types.ObjectId };
export const AssessmentAttempt: Model<AssessmentAttemptDocument> =
  (mongoose.models.AssessmentAttempt as Model<AssessmentAttemptDocument>) || mongoose.model<AssessmentAttemptDocument>("AssessmentAttempt", assessmentAttemptSchema);
