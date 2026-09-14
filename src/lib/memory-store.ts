import { randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api";
import { analyzeAssessmentPerformance, generateAssessment } from "@/lib/assessment-generation";
import { integritySummary, scoreMcq, topicPerformance, verificationFor } from "@/lib/assessment-scoring";
import { ASSESSMENT_DURATION_SECONDS, CHALLENGE_DURATION_SECONDS, type Difficulty, type IntegrityEventType } from "@/lib/assessment-types";
import { evaluateCodeSafely } from "@/lib/safe-code-execution";
import { publicCodingProblem, publicQuestions, serializeProfile } from "@/lib/serializers";

export function generateObjectIdString(): string {
  return randomBytes(12).toString("hex");
}

export interface MemorySkill {
  name: string;
  normalizedName: string;
  status: "CLAIMED" | "NOT_VERIFIED" | "PARTIALLY_VERIFIED" | "VERIFIED";
  assessmentScore?: number;
  evidenceCount: number;
  lastAssessmentAt?: Date;
}

export interface MemoryProject {
  _id: string;
  title: string;
  description: string;
  url?: string;
  skills: string[];
}

export interface MemoryEvidence {
  _id: string;
  source: "GITHUB" | "LEETCODE" | "CODECHEF" | "HACKERRANK" | "OTHER";
  url: string;
  description: string;
  skills: string[];
}

export interface MemoryUser {
  _id: { toString(): string };
  displayName: string;
  email: string;
  handle: string;
  headline: string;
  bio: string;
  location: string;
  education: string;
  availableForTeams: boolean;
  skills: MemorySkill[];
  projects: MemoryProject[];
  evidence: MemoryEvidence[];
}

export interface MemoryAssessmentAttempt {
  _id: { toString(): string };
  profileId: { toString(): string };
  skill: string;
  difficulty: Difficulty;
  state: "IN_PROGRESS" | "EVALUATING" | "COMPLETED" | "TIMED_OUT" | "FAILED";
  startedAt: Date;
  expiresAt: Date;
  submittedAt?: Date;
  questions: Array<{
    id: string;
    prompt: string;
    topic: string;
    options: Array<{ id: string; text: string }>;
    correctOption: string;
    explanation?: string;
    fingerprint: string;
  }>;
  codingProblem: unknown;
  generatedBy: string;
  generationNotice?: string | null;
  answers?: Map<string, string> | Record<string, string>;
  codingSubmission?: string;
  mcqScore?: number;
  codingScore?: number;
  codingEvaluation?: unknown;
  integrityScore?: number;
  finalScore?: number;
  riskLevel?: string;
  verificationStatus?: string;
  topicPerformance?: unknown;
  performanceAnalysis?: unknown;
  verificationReceipt?: unknown;
}

export interface MemoryIntegrityEvent {
  targetId: string;
  targetType: "ASSESSMENT" | "CHALLENGE";
  profileId: string;
  type: IntegrityEventType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  timestamp: Date;
  metadata?: Record<string, string | number | boolean>;
}

export interface MemoryHackathon {
  _id: { toString(): string };
  name: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  createdBy: { toString(): string };
  participantIds: Array<{ toString(): string }>;
}

export interface MemoryTeamMember {
  profileId: { toString(): string };
  role: string;
  status: string;
  joinedAt?: Date;
}

export interface MemoryTeam {
  _id: { toString(): string };
  hackathonId: { toString(): string };
  name: string;
  description: string;
  requiredSkills: string[];
  capacity: number;
  members: MemoryTeamMember[];
}

export interface MemoryInvitation {
  _id: { toString(): string };
  teamId: { toString(): string };
  candidateId: { toString(): string };
  sentBy: { toString(): string };
  message: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: Date;
  respondedAt?: Date;
}

export interface MemorySkillChallenge {
  _id: { toString(): string };
  teamId: { toString(): string };
  candidateId: { toString(): string };
  createdBy: { toString(): string };
  skill: string;
  state: "SENT" | "IN_PROGRESS" | "COMPLETED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  questions: Array<{
    id: string;
    prompt: string;
    topic: string;
    options: Array<{ id: string; text: string }>;
    correctOption: string;
    explanation?: string;
  }>;
  generatedBy: string;
  score?: number;
  integrityScore?: number;
  riskLevel?: string;
  answers?: Map<string, string> | Record<string, string>;
  startedAt?: Date;
  expiresAt?: Date;
  submittedAt?: Date;
  createdAt: Date;
}

declare global {
  var __pramaan_memory_store: {
    users: Map<string, MemoryUser>;
    attempts: Map<string, MemoryAssessmentAttempt>;
    integrityEvents: MemoryIntegrityEvent[];
    hackathons: Map<string, MemoryHackathon>;
    teams: Map<string, MemoryTeam>;
    invitations: Map<string, MemoryInvitation>;
    challenges: Map<string, MemorySkillChallenge>;
  } | undefined;
}

function initMemoryStore() {
  if (global.__pramaan_memory_store) {
    return global.__pramaan_memory_store;
  }

  const users = new Map<string, MemoryUser>();
  const attempts = new Map<string, MemoryAssessmentAttempt>();
  const integrityEvents: MemoryIntegrityEvent[] = [];
  const hackathons = new Map<string, MemoryHackathon>();
  const teams = new Map<string, MemoryTeam>();
  const invitations = new Map<string, MemoryInvitation>();
  const challenges = new Map<string, MemorySkillChallenge>();

  const user1: MemoryUser = {
    _id: { toString: () => "660000000000000000000001" },
    displayName: "Alex Rivera",
    email: "alex@example.com",
    handle: "demo",
    headline: "Full-Stack Systems Engineer & Distributed Systems Specialist",
    bio: "Building verifiable credentials and high-performance real-time applications. Passionate about TypeScript, React, and systems architecture.",
    location: "San Francisco, CA",
    education: "B.S. Computer Science",
    availableForTeams: true,
    skills: [
      { name: "TypeScript", normalizedName: "typescript", status: "VERIFIED", assessmentScore: 92, evidenceCount: 2, lastAssessmentAt: new Date() },
      { name: "React", normalizedName: "react", status: "VERIFIED", assessmentScore: 88, evidenceCount: 1, lastAssessmentAt: new Date() },
      { name: "PostgreSQL", normalizedName: "postgresql", status: "VERIFIED", assessmentScore: 85, evidenceCount: 1, lastAssessmentAt: new Date() },
      { name: "Python", normalizedName: "python", status: "PARTIALLY_VERIFIED", assessmentScore: 74, evidenceCount: 1, lastAssessmentAt: new Date() },
      { name: "Go", normalizedName: "go", status: "CLAIMED", evidenceCount: 0 },
    ],
    projects: [
      { _id: "660000000000000000000091", title: "Pramaan Verification Node", description: "Cryptographic skill assessment and tamper-evident receipt protocol.", url: "https://github.com/example/pramaan-node", skills: ["TypeScript", "React"] },
    ],
    evidence: [
      { _id: "660000000000000000000092", source: "GITHUB", url: "https://github.com/alexrivera", description: "Core contributions to open source TypeScript libraries.", skills: ["TypeScript"] },
    ],
  };

  const user2: MemoryUser = {
    _id: { toString: () => "660000000000000000000002" },
    displayName: "Sarah Chen",
    email: "sarah@example.com",
    handle: "schen",
    headline: "Backend Architect & Cloud Infrastructure Specialist",
    bio: "Focused on scalable distributed backends, microservices, and database query optimization.",
    location: "Seattle, WA",
    education: "M.S. Software Engineering",
    availableForTeams: true,
    skills: [
      { name: "Python", normalizedName: "python", status: "VERIFIED", assessmentScore: 95, evidenceCount: 3, lastAssessmentAt: new Date() },
      { name: "PostgreSQL", normalizedName: "postgresql", status: "VERIFIED", assessmentScore: 90, evidenceCount: 2, lastAssessmentAt: new Date() },
      { name: "Docker", normalizedName: "docker", status: "VERIFIED", assessmentScore: 88, evidenceCount: 1, lastAssessmentAt: new Date() },
      { name: "TypeScript", normalizedName: "typescript", status: "PARTIALLY_VERIFIED", assessmentScore: 80, evidenceCount: 1, lastAssessmentAt: new Date() },
    ],
    projects: [
      { _id: "660000000000000000000093", title: "Distributed Task Pipeline", description: "High-throughput task queue with Redis and PostgreSQL WAL replication.", url: "https://github.com/example/task-pipeline", skills: ["Python", "PostgreSQL"] },
    ],
    evidence: [
      { _id: "660000000000000000000094", source: "LEETCODE", url: "https://leetcode.com/schen", description: "Top 2% ranking in algorithmic problem solving.", skills: ["Python"] },
    ],
  };

  users.set("660000000000000000000001", user1);
  users.set("660000000000000000000002", user2);

  const hackathon1: MemoryHackathon = {
    _id: { toString: () => "660000000000000000000010" },
    name: "Global AI & Web3 Hackathon 2026",
    description: "Build real-world proof engines, decentralized identity protocols, and AI agents.",
    location: "Virtual / Global",
    startsAt: new Date(Date.now() - 86400000 * 2),
    endsAt: new Date(Date.now() + 86400000 * 28),
    createdBy: { toString: () => "660000000000000000000001" },
    participantIds: [{ toString: () => "660000000000000000000001" }, { toString: () => "660000000000000000000002" }],
  };
  hackathons.set("660000000000000000000010", hackathon1);

  const team1: MemoryTeam = {
    _id: { toString: () => "660000000000000000000020" },
    hackathonId: { toString: () => "660000000000000000000010" },
    name: "Pramaan Protocol Core",
    description: "Building verifiable skill credentials for competitive developer squads.",
    requiredSkills: ["Python", "PostgreSQL", "React"],
    capacity: 4,
    members: [
      { profileId: { toString: () => "660000000000000000000001" }, role: "Team lead", status: "OWNER" },
    ],
  };
  teams.set("660000000000000000000020", team1);

  const store = { users, attempts, integrityEvents, hackathons, teams, invitations, challenges };
  global.__pramaan_memory_store = store;
  return store;
}

export const memoryStore = initMemoryStore();

// ==========================================
// PROFILE SERVICE MEMORY FALLBACKS
// ==========================================

export async function memoryCreateProfile(input: {
  displayName: string;
  email: string;
  handle: string;
  headline?: string;
  location?: string;
}) {
  const normHandle = input.handle.trim().toLowerCase();
  const normEmail = input.email.trim().toLowerCase();

  for (const u of memoryStore.users.values()) {
    if (u.handle.toLowerCase() === normHandle || u.email.toLowerCase() === normEmail) {
      throw new ApiError("That email or handle already belongs to a local profile.", 409, "PROFILE_CONFLICT");
    }
  }

  const id = generateObjectIdString();
  const newUser: MemoryUser = {
    _id: { toString: () => id },
    displayName: input.displayName.trim(),
    email: input.email.trim(),
    handle: normHandle,
    headline: input.headline?.trim() ?? "",
    bio: "",
    location: input.location?.trim() ?? "",
    education: "",
    availableForTeams: true,
    skills: [],
    projects: [],
    evidence: [],
  };

  memoryStore.users.set(id, newUser);
  return serializeProfile(newUser);
}

export async function memoryGetOwnProfile(profileId: string) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  return serializeProfile(user);
}

export async function memoryUpdateOwnProfile(
  profileId: string,
  input: {
    displayName?: string;
    headline?: string;
    bio?: string;
    location?: string;
    education?: string;
    availableForTeams?: boolean;
  }
) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");

  if (input.displayName !== undefined) user.displayName = input.displayName.trim();
  if (input.headline !== undefined) user.headline = input.headline.trim();
  if (input.bio !== undefined) user.bio = input.bio.trim();
  if (input.location !== undefined) user.location = input.location.trim();
  if (input.education !== undefined) user.education = input.education.trim();
  if (input.availableForTeams !== undefined) user.availableForTeams = input.availableForTeams;

  return serializeProfile(user);
}

export async function memoryAddSkill(profileId: string, name: string) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  const normalizedName = name.trim().toLowerCase();
  if (user.skills.some((skill) => skill.normalizedName === normalizedName)) {
    throw new ApiError("That skill is already claimed.", 409, "SKILL_EXISTS");
  }
  user.skills.push({ name: name.trim(), normalizedName, status: "CLAIMED", evidenceCount: 0 });
  return serializeProfile(user);
}

export async function memoryRemoveSkill(profileId: string, name: string) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  const normalizedName = name.trim().toLowerCase();
  const removeIndex = user.skills.findIndex((skill) => skill.normalizedName === normalizedName);
  if (removeIndex < 0) throw new ApiError("Skill not found.", 404, "SKILL_NOT_FOUND");
  user.skills.splice(removeIndex, 1);
  return serializeProfile(user);
}

export async function memoryAddProject(
  profileId: string,
  input: { title: string; description: string; url?: string; skills: string[] }
) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  user.projects.push({ _id: generateObjectIdString(), ...input, url: input.url || undefined });
  return serializeProfile(user);
}

export async function memoryRemoveProject(profileId: string, projectId: string) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  user.projects = user.projects.filter((p) => p._id !== projectId);
  return serializeProfile(user);
}

export async function memoryAddEvidence(
  profileId: string,
  input: {
    source: "GITHUB" | "LEETCODE" | "CODECHEF" | "HACKERRANK" | "OTHER";
    url: string;
    description: string;
    skills: string[];
  }
) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  user.evidence.push({ _id: generateObjectIdString(), ...input });

  for (const claimedName of input.skills) {
    const normalizedName = claimedName.toLowerCase();
    const existing = user.skills.find((skill) => skill.normalizedName === normalizedName);
    if (existing) {
      existing.evidenceCount += 1;
    } else {
      user.skills.push({ name: claimedName, normalizedName, status: "PARTIALLY_VERIFIED", evidenceCount: 1 });
    }
  }
  return serializeProfile(user);
}

export async function memoryRemoveEvidence(profileId: string, evidenceId: string) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  user.evidence = user.evidence.filter((e) => e._id !== evidenceId);
  return serializeProfile(user);
}

export async function memoryPublicProfile(profileId: string) {
  const user = memoryStore.users.get(profileId);
  if (!user) throw new ApiError("Candidate not found.", 404, "PROFILE_NOT_FOUND");
  const safe = serializeProfile(user);
  delete safe.email;
  return safe;
}

export async function memoryPublicProfileByHandle(handle: string) {
  const normalizedHandle = handle.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(normalizedHandle)) {
    throw new ApiError("Skill Passport not found.", 404, "PROFILE_NOT_FOUND");
  }
  let match: MemoryUser | undefined;
  for (const u of memoryStore.users.values()) {
    if (u.handle.toLowerCase() === normalizedHandle) {
      match = u;
      break;
    }
  }
  if (!match) throw new ApiError("Skill Passport not found.", 404, "PROFILE_NOT_FOUND");
  const safe = serializeProfile(match);
  delete safe.email;
  return safe;
}

// ==========================================
// ASSESSMENT SERVICE MEMORY FALLBACKS
// ==========================================

function formatAttemptOutput(attempt: MemoryAssessmentAttempt) {
  return {
    id: attempt._id.toString(),
    skill: attempt.skill,
    difficulty: attempt.difficulty,
    state: attempt.state,
    questions: publicQuestions(attempt.questions),
    codingProblem: publicCodingProblem(attempt.codingProblem as Parameters<typeof publicCodingProblem>[0]),
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt.toISOString(),
    generatedBy: attempt.generatedBy,
    notice: attempt.generationNotice,
  };
}

export async function memoryCreateAssessmentAttempt(input: { profileId: string; skill: string; difficulty: Difficulty }) {
  const profile = memoryStore.users.get(input.profileId);
  if (!profile) throw new ApiError("Create a profile before starting an assessment.", 404, "PROFILE_NOT_FOUND");

  const skill = input.skill.trim().replace(/\s+/g, " ");
  if (skill.length < 2 || skill.length > 80) throw new ApiError("Choose a valid skill.", 400, "INVALID_SKILL");

  const priorAttempts: MemoryAssessmentAttempt[] = [];
  for (const a of memoryStore.attempts.values()) {
    if (a.profileId.toString() === input.profileId && a.skill.toLowerCase() === skill.toLowerCase()) {
      priorAttempts.push(a);
    }
  }
  const previousFingerprints = priorAttempts.flatMap((a) => a.questions.map((q) => q.fingerprint));

  const generated = await generateAssessment({ skill, difficulty: input.difficulty, count: 5, previousFingerprints });
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + ASSESSMENT_DURATION_SECONDS * 1000);
  const id = generateObjectIdString();

  const attempt: MemoryAssessmentAttempt = {
    _id: { toString: () => id },
    profileId: { toString: () => input.profileId },
    skill,
    difficulty: input.difficulty,
    state: "IN_PROGRESS",
    startedAt,
    expiresAt,
    questions: generated.questions,
    codingProblem: generated.codingProblem,
    generatedBy: generated.generatedBy,
    generationNotice: generated.notice,
  };

  memoryStore.attempts.set(id, attempt);
  return formatAttemptOutput(attempt);
}

export async function memoryGetAssessmentAttempt(profileId: string, attemptId: string) {
  const attempt = memoryStore.attempts.get(attemptId);
  if (!attempt || attempt.profileId.toString() !== profileId) {
    throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
  }
  return formatAttemptOutput(attempt);
}

export async function memoryRecordAssessmentIntegrity(input: {
  profileId: string;
  attemptId: string;
  events: Array<{ type: IntegrityEventType; severity: "LOW" | "MEDIUM" | "HIGH"; timestamp?: Date; metadata?: Record<string, string | number | boolean> }>;
}) {
  const attempt = memoryStore.attempts.get(input.attemptId);
  if (!attempt || attempt.profileId.toString() !== input.profileId || attempt.state !== "IN_PROGRESS") {
    throw new ApiError("This assessment can no longer receive integrity events.", 409, "INVALID_STATE");
  }

  for (const ev of input.events) {
    memoryStore.integrityEvents.push({
      targetId: input.attemptId,
      targetType: "ASSESSMENT",
      profileId: input.profileId,
      type: ev.type,
      severity: ev.severity,
      timestamp: ev.timestamp ?? new Date(),
      metadata: ev.metadata,
    });
  }

  const allEvents = memoryStore.integrityEvents.filter((e) => e.targetId === input.attemptId);
  const summary = integritySummary(allEvents);

  if (summary.terminated) {
    attempt.state = "FAILED";
    attempt.integrityScore = summary.score;
    attempt.riskLevel = "HIGH";
    attempt.verificationStatus = "NOT_VERIFIED";
    attempt.submittedAt = new Date();
  }

  return summary;
}

export async function memorySubmitAssessmentAttempt(input: {
  profileId: string;
  attemptId: string;
  answers: Record<string, string>;
  codingSubmission: string;
  timeout: boolean;
}) {
  const attempt = memoryStore.attempts.get(input.attemptId);
  if (!attempt || attempt.profileId.toString() !== input.profileId) {
    throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
  }

  if (attempt.state === "FAILED") {
    throw new ApiError("This assessment was terminated due to confirmed proctoring violations.", 403, "ASSESSMENT_TERMINATED");
  }
  if (attempt.state !== "IN_PROGRESS") {
    throw new ApiError("This assessment was already submitted or is being evaluated.", 409, "DUPLICATE_SUBMISSION");
  }

  attempt.state = "EVALUATING";
  attempt.submittedAt = new Date();

  const expired = Date.now() > attempt.expiresAt.getTime();
  const acceptedAnswers = expired && !input.timeout ? {} : input.answers;
  const mcq = scoreMcq(acceptedAnswers, attempt.questions);
  const topics = topicPerformance(acceptedAnswers, attempt.questions);

  const events = memoryStore.integrityEvents.filter((e) => e.targetId === input.attemptId);
  const integrity = integritySummary(events);

  const coding = input.codingSubmission.trim() && !expired
    ? await evaluateCodeSafely({ sourceCode: input.codingSubmission, problem: attempt.codingProblem as Parameters<typeof evaluateCodeSafely>[0]["problem"] })
    : { status: "UNAVAILABLE" as const, message: expired ? "The coding submission arrived after the assessment deadline and was not evaluated." : "No coding submission was provided." };

  const finalScore = coding.status === "COMPLETED" ? Math.round(mcq.percentage * 0.7 + coding.score * 0.3) : mcq.percentage;

  const profile = memoryStore.users.get(input.profileId);
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");

  const normalized = attempt.skill.toLowerCase();
  const skill = profile.skills.find((item) => item.normalizedName === normalized);
  const evidenceCount = (skill?.evidenceCount ?? 0) + profile.evidence.filter((entry) => entry.skills.some((name) => name.toLowerCase() === normalized)).length;
  const verificationStatus = verificationFor({ score: finalScore, integrityRisk: integrity.riskLevel, evidenceCount });

  const performanceAnalysis = await analyzeAssessmentPerformance({
    skill: attempt.skill,
    difficulty: attempt.difficulty,
    score: finalScore,
    mcq,
    topics,
    integrityRisk: integrity.riskLevel,
  });

  const receipt = {
    verificationId: `prm_${attempt._id.toString()}`,
    userId: input.profileId,
    skill: attempt.skill,
    assessmentId: attempt._id.toString(),
    attemptId: attempt._id.toString(),
    score: finalScore,
    verificationStatus,
    assessmentDate: new Date().toISOString(),
    assessmentType: "SECURE_SKILL_ASSESSMENT",
    evidenceSource: "OpenAI-generated assessment with server-side scoring",
    security: {
      riskLevel: integrity.riskLevel,
      integrityScore: integrity.score,
      eventCount: integrity.eventCount,
    },
  };

  if (skill) {
    skill.assessmentScore = Math.max(skill.assessmentScore ?? 0, finalScore);
    skill.status = verificationStatus;
    skill.evidenceCount = evidenceCount;
    skill.lastAssessmentAt = new Date();
  } else {
    profile.skills.push({ name: attempt.skill, normalizedName: normalized, status: verificationStatus, assessmentScore: finalScore, evidenceCount, lastAssessmentAt: new Date() });
  }

  attempt.answers = new Map(Object.entries(acceptedAnswers));
  attempt.codingSubmission = input.codingSubmission.slice(0, 30000);
  attempt.mcqScore = mcq.percentage;
  attempt.codingScore = coding.status === "COMPLETED" ? coding.score : undefined;
  attempt.codingEvaluation = coding;
  attempt.integrityScore = integrity.score;
  attempt.finalScore = finalScore;
  attempt.riskLevel = integrity.riskLevel;
  attempt.verificationStatus = verificationStatus;
  attempt.topicPerformance = topics;
  attempt.performanceAnalysis = performanceAnalysis;
  attempt.verificationReceipt = receipt;
  attempt.state = expired ? "TIMED_OUT" : "COMPLETED";

  return {
    id: attempt._id.toString(),
    skill: attempt.skill,
    state: attempt.state,
    mcq,
    coding,
    integrity,
    finalScore,
    verificationStatus,
    topicPerformance: topics,
    performanceAnalysis,
    verificationReceipt: receipt,
    completedAt: attempt.submittedAt?.toISOString() ?? null,
  };
}

export async function memoryGetAssessmentResult(profileId: string, attemptId: string) {
  const attempt = memoryStore.attempts.get(attemptId);
  if (!attempt || attempt.profileId.toString() !== profileId) {
    throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
  }
  if (attempt.finalScore === undefined) {
    throw new ApiError("This assessment has not been completed.", 409, "NOT_COMPLETE");
  }

  const events = memoryStore.integrityEvents.filter((e) => e.targetId === attemptId);
  return {
    id: attempt._id.toString(),
    skill: attempt.skill,
    state: attempt.state,
    mcq: {
      percentage: attempt.mcqScore ?? 0,
      total: attempt.questions.length,
      correct: Math.round(((attempt.mcqScore ?? 0) / 100) * attempt.questions.length),
    },
    coding: attempt.codingEvaluation,
    integrity: integritySummary(events),
    finalScore: attempt.finalScore,
    verificationStatus: attempt.verificationStatus,
    topicPerformance: attempt.topicPerformance,
    performanceAnalysis: attempt.performanceAnalysis,
    verificationReceipt: attempt.verificationReceipt,
    completedAt: attempt.submittedAt?.toISOString() ?? null,
  };
}

// ==========================================
// TEAM & HACKATHON SERVICE MEMORY FALLBACKS
// ==========================================

function serializeMemTeam(team: MemoryTeam) {
  return {
    id: team._id.toString(),
    hackathonId: team.hackathonId.toString(),
    name: team.name,
    description: team.description,
    requiredSkills: team.requiredSkills,
    capacity: team.capacity,
    members: team.members.map((m) => ({ profileId: m.profileId.toString(), role: m.role, status: m.status })),
  };
}

export async function memoryListHackathons(profileId: string) {
  return Array.from(memoryStore.hackathons.values()).map((h) => ({
    id: h._id.toString(),
    name: h.name,
    description: h.description,
    location: h.location,
    startsAt: h.startsAt.toISOString(),
    endsAt: h.endsAt.toISOString(),
    joined: h.participantIds.some((p) => p.toString() === profileId),
    participantCount: h.participantIds.length,
  }));
}

export async function memoryCreateHackathon(profileId: string, input: {
  name: string;
  description: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
}) {
  const id = generateObjectIdString();
  const hackathon: MemoryHackathon = {
    _id: { toString: () => id },
    ...input,
    createdBy: { toString: () => profileId },
    participantIds: [{ toString: () => profileId }],
  };
  memoryStore.hackathons.set(id, hackathon);
  return { id, name: hackathon.name };
}

export async function memoryJoinHackathon(profileId: string, hackathonId: string) {
  const hackathon = memoryStore.hackathons.get(hackathonId);
  if (!hackathon) throw new ApiError("Hackathon not found.", 404, "HACKATHON_NOT_FOUND");
  if (!hackathon.participantIds.some((p) => p.toString() === profileId)) {
    hackathon.participantIds.push({ toString: () => profileId });
  }
  return { id: hackathonId, joined: true };
}

export async function memoryLeaveHackathon(profileId: string, hackathonId: string) {
  const hackathon = memoryStore.hackathons.get(hackathonId);
  if (!hackathon) throw new ApiError("Hackathon not found.", 404, "HACKATHON_NOT_FOUND");

  for (const team of memoryStore.teams.values()) {
    if (team.hackathonId.toString() === hackathonId) {
      if (team.members.some((m) => m.profileId.toString() === profileId && m.status === "OWNER")) {
        throw new ApiError("Transfer or remove your team before leaving this hackathon.", 409, "TEAM_OWNER_CANNOT_LEAVE");
      }
    }
  }

  hackathon.participantIds = hackathon.participantIds.filter((p) => p.toString() !== profileId);
  for (const team of memoryStore.teams.values()) {
    if (team.hackathonId.toString() === hackathonId) {
      team.members = team.members.filter((m) => m.profileId.toString() !== profileId);
    }
  }
  return { id: hackathonId, joined: false };
}

export async function memoryCreateTeam(profileId: string, input: {
  hackathonId: string;
  name: string;
  description?: string;
  requiredSkills: string[];
  capacity?: number;
}) {
  const hackathon = memoryStore.hackathons.get(input.hackathonId);
  if (!hackathon || !hackathon.participantIds.some((p) => p.toString() === profileId)) {
    throw new ApiError("Join the hackathon before creating a team.", 409, "HACKATHON_MEMBERSHIP_REQUIRED");
  }

  for (const t of memoryStore.teams.values()) {
    if (t.hackathonId.toString() === input.hackathonId && t.name.toLowerCase() === input.name.trim().toLowerCase()) {
      throw new ApiError("A team with that name already exists in this hackathon.", 409, "TEAM_NAME_EXISTS");
    }
  }

  const id = generateObjectIdString();
  const team: MemoryTeam = {
    _id: { toString: () => id },
    hackathonId: { toString: () => input.hackathonId },
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    requiredSkills: [...new Set(input.requiredSkills.map((s) => s.trim()))],
    capacity: input.capacity ?? 4,
    members: [{ profileId: { toString: () => profileId }, role: "Team lead", status: "OWNER" }],
  };

  memoryStore.teams.set(id, team);
  return serializeMemTeam(team);
}

export async function memoryListMyTeams(profileId: string) {
  const myTeams: Array<ReturnType<typeof serializeMemTeam> & { hackathonName: string }> = [];
  for (const team of memoryStore.teams.values()) {
    if (team.members.some((m) => m.profileId.toString() === profileId)) {
      const h = memoryStore.hackathons.get(team.hackathonId.toString());
      myTeams.push({
        ...serializeMemTeam(team),
        hackathonName: h?.name ?? "Hackathon",
      });
    }
  }
  return myTeams;
}

export async function memoryGetTeam(teamId: string) {
  const team = memoryStore.teams.get(teamId);
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");

  return {
    ...serializeMemTeam(team),
    members: team.members.map((member) => {
      const p = memoryStore.users.get(member.profileId.toString());
      return {
        ...member,
        profileId: member.profileId.toString(),
        profile: p ? { id: p._id.toString(), displayName: p.displayName, headline: p.headline } : null,
      };
    }),
  };
}

export async function memoryDiscoverCandidates(teamId: string, currentProfileId: string) {
  const team = memoryStore.teams.get(teamId);
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");

  const memberIds = new Set(team.members.map((m) => m.profileId.toString()));
  memberIds.add(currentProfileId);

  const required = team.requiredSkills.map((s) => s.toLowerCase());
  const candidates: MemoryUser[] = [];

  for (const user of memoryStore.users.values()) {
    const uid = user._id.toString();
    if (memberIds.has(uid)) continue;
    if (!user.availableForTeams) continue;
    if (user.skills.some((s) => required.includes(s.normalizedName))) {
      candidates.push(user);
    }
  }

  return candidates.map((candidate) => {
    let points = 0;
    const reasons: string[] = [];

    for (const requiredSkill of required) {
      const skill = candidate.skills.find((entry) => entry.normalizedName === requiredSkill);
      if (!skill) continue;
      const label = skill.name;
      if (skill.status === "VERIFIED") {
        points += 32 + Math.round((skill.assessmentScore ?? 0) / 10);
        reasons.push(`${label} is verified${skill.assessmentScore ? ` (${skill.assessmentScore}%)` : ""}`);
      } else if (skill.status === "PARTIALLY_VERIFIED") {
        points += 20;
        reasons.push(`${label} has assessment or evidence support`);
      } else {
        points += 8;
        reasons.push(`${label} is a claimed skill`);
      }
    }

    const complementary = candidate.skills.filter((s) => !required.includes(s.normalizedName) && s.status !== "CLAIMED").slice(0, 2);
    points += complementary.length * 3;
    if (complementary.length) {
      reasons.push(`Complementary evidence: ${complementary.map((s) => s.name).join(", ")}`);
    }

    return {
      id: candidate._id.toString(),
      displayName: candidate.displayName,
      headline: candidate.headline,
      matchScore: Math.min(100, points),
      reasons,
      skills: candidate.skills.map((s) => ({ name: s.name, status: s.status, assessmentScore: s.assessmentScore })),
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

export async function memorySendInvitation(teamId: string, ownerId: string, input: { candidateId: string; message: string }) {
  const team = memoryStore.teams.get(teamId);
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");
  if (!team.members.some((m) => m.profileId.toString() === ownerId && m.status === "OWNER")) {
    throw new ApiError("Only the team creator can perform this action.", 403, "TEAM_OWNER_REQUIRED");
  }

  if (team.members.length >= team.capacity) throw new ApiError("This team is already full.", 409, "TEAM_FULL");
  if (team.members.some((m) => m.profileId.toString() === input.candidateId)) {
    throw new ApiError("This candidate is already on the team.", 409, "ALREADY_MEMBER");
  }
  if (!memoryStore.users.has(input.candidateId)) throw new ApiError("Candidate not found.", 404, "CANDIDATE_NOT_FOUND");

  for (const inv of memoryStore.invitations.values()) {
    if (inv.teamId.toString() === teamId && inv.candidateId.toString() === input.candidateId && inv.status === "PENDING") {
      throw new ApiError("A pending invitation already exists for this candidate.", 409, "INVITATION_EXISTS");
    }
  }

  const id = generateObjectIdString();
  const invitation: MemoryInvitation = {
    _id: { toString: () => id },
    teamId: { toString: () => teamId },
    candidateId: { toString: () => input.candidateId },
    sentBy: { toString: () => ownerId },
    message: input.message,
    status: "PENDING",
    createdAt: new Date(),
  };

  memoryStore.invitations.set(id, invitation);
  return { id, status: invitation.status };
}

export async function memoryRespondToInvitation(invitationId: string, candidateId: string, action: "ACCEPT" | "REJECT") {
  const invitation = memoryStore.invitations.get(invitationId);
  if (!invitation || invitation.candidateId.toString() !== candidateId || invitation.status !== "PENDING") {
    throw new ApiError("This invitation is no longer pending.", 409, "INVALID_INVITATION_STATE");
  }

  invitation.status = action === "ACCEPT" ? "ACCEPTED" : "REJECTED";
  invitation.respondedAt = new Date();

  if (action === "ACCEPT") {
    const team = memoryStore.teams.get(invitation.teamId.toString());
    if (!team || team.members.length >= team.capacity) {
      throw new ApiError("The team became full before you accepted.", 409, "TEAM_FULL");
    }
    if (!team.members.some((m) => m.profileId.toString() === candidateId)) {
      team.members.push({ profileId: { toString: () => candidateId }, role: "Member", status: "ACCEPTED", joinedAt: new Date() });
    }
  }

  return { id: invitation._id.toString(), status: invitation.status };
}

export async function memoryCreateSkillChallenge(teamId: string, ownerId: string, input: { candidateId: string; skill: string }) {
  const team = memoryStore.teams.get(teamId);
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");
  if (!team.members.some((m) => m.profileId.toString() === ownerId && m.status === "OWNER")) {
    throw new ApiError("Only the team creator can perform this action.", 403, "TEAM_OWNER_REQUIRED");
  }

  if (!memoryStore.users.has(input.candidateId)) {
    throw new ApiError("Candidate profile not found.", 404, "CANDIDATE_NOT_FOUND");
  }
  if (team.members.some((m) => m.profileId.toString() === input.candidateId)) {
    throw new ApiError("This candidate is already a member of your team.", 409, "ALREADY_MEMBER");
  }
  if (team.members.length >= team.capacity) {
    throw new ApiError("Team is already at maximum capacity.", 409, "TEAM_FULL");
  }

  for (const c of memoryStore.challenges.values()) {
    if (c.teamId.toString() === teamId && c.candidateId.toString() === input.candidateId && (c.state === "SENT" || c.state === "IN_PROGRESS")) {
      throw new ApiError("This candidate already has an active skill challenge for this team.", 409, "CHALLENGE_EXISTS");
    }
  }

  const generated = await generateAssessment({ skill: input.skill, difficulty: "intermediate", count: 5 });
  const id = generateObjectIdString();
  const challenge: MemorySkillChallenge = {
    _id: { toString: () => id },
    teamId: { toString: () => teamId },
    candidateId: { toString: () => input.candidateId },
    createdBy: { toString: () => ownerId },
    skill: input.skill,
    questions: generated.questions,
    generatedBy: generated.generatedBy,
    state: "SENT",
    createdAt: new Date(),
  };

  memoryStore.challenges.set(id, challenge);
  return { id, state: challenge.state, skill: challenge.skill };
}

export async function memoryListTeamChallenges(teamId: string, ownerId: string) {
  const team = memoryStore.teams.get(teamId);
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");
  if (!team.members.some((m) => m.profileId.toString() === ownerId && m.status === "OWNER")) {
    throw new ApiError("Only the team creator can perform this action.", 403, "TEAM_OWNER_REQUIRED");
  }

  const challenges: MemorySkillChallenge[] = [];
  for (const c of memoryStore.challenges.values()) {
    if (c.teamId.toString() === teamId) challenges.push(c);
  }

  return challenges.map((c) => {
    const candidate = memoryStore.users.get(c.candidateId.toString());
    return {
      id: c._id.toString(),
      teamId: c.teamId.toString(),
      candidateId: c.candidateId.toString(),
      candidate: candidate ? {
        name: candidate.displayName,
        handle: candidate.handle,
        headline: candidate.headline,
        skills: candidate.skills,
      } : null,
      skill: c.skill,
      state: c.state,
      score: c.score ?? null,
      integrityScore: c.integrityScore ?? null,
      riskLevel: c.riskLevel ?? null,
      startedAt: c.startedAt?.toISOString() ?? null,
      submittedAt: c.submittedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  });
}

export async function memoryDecideSkillChallenge(
  teamId: string,
  ownerId: string,
  challengeId: string,
  decision: "ACCEPT" | "REJECT"
) {
  const team = memoryStore.teams.get(teamId);
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");
  if (!team.members.some((m) => m.profileId.toString() === ownerId && m.status === "OWNER")) {
    throw new ApiError("Only the team creator can perform this action.", 403, "TEAM_OWNER_REQUIRED");
  }

  const challenge = memoryStore.challenges.get(challengeId);
  if (!challenge || challenge.teamId.toString() !== teamId) {
    throw new ApiError("Challenge not found for this team.", 404, "CHALLENGE_NOT_FOUND");
  }
  if (challenge.state !== "COMPLETED") {
    throw new ApiError("Only completed challenges can be accepted or rejected.", 400, "CHALLENGE_NOT_COMPLETED");
  }

  if (decision === "ACCEPT") {
    if (team.members.length >= team.capacity) {
      throw new ApiError("This team is already full.", 409, "TEAM_FULL");
    }
    const candidateId = challenge.candidateId.toString();
    if (!team.members.some((m) => m.profileId.toString() === candidateId)) {
      team.members.push({ profileId: { toString: () => candidateId }, role: "Member", status: "ACCEPTED", joinedAt: new Date() });
    }
    challenge.state = "ACCEPTED";
    return { status: "ACCEPTED", message: "Candidate accepted into team." };
  } else {
    challenge.state = "REJECTED";
    return { status: "REJECTED", message: "Candidate rejected." };
  }
}

export async function memoryStartSkillChallenge(challengeId: string, candidateId: string) {
  const challenge = memoryStore.challenges.get(challengeId);
  if (!challenge || challenge.candidateId.toString() !== candidateId || challenge.state !== "SENT") {
    throw new ApiError("This challenge cannot be started in its current state.", 409, "INVALID_CHALLENGE_STATE");
  }

  const now = new Date();
  challenge.state = "IN_PROGRESS";
  challenge.startedAt = now;
  challenge.expiresAt = new Date(now.getTime() + CHALLENGE_DURATION_SECONDS * 1000);

  return {
    id: challenge._id.toString(),
    state: challenge.state,
    skill: challenge.skill,
    questions: publicQuestions(challenge.questions),
    startedAt: challenge.startedAt.toISOString(),
    expiresAt: challenge.expiresAt.toISOString(),
  };
}

export async function memoryRecordChallengeIntegrity(input: {
  challengeId: string;
  profileId: string;
  events: Array<{ type: IntegrityEventType; severity: "LOW" | "MEDIUM" | "HIGH"; timestamp?: Date; metadata?: Record<string, string | number | boolean> }>;
}) {
  const challenge = memoryStore.challenges.get(input.challengeId);
  if (!challenge || challenge.candidateId.toString() !== input.profileId || challenge.state !== "IN_PROGRESS") {
    throw new ApiError("This challenge can no longer receive integrity events.", 409, "INVALID_CHALLENGE_STATE");
  }

  for (const ev of input.events) {
    memoryStore.integrityEvents.push({
      targetId: input.challengeId,
      targetType: "CHALLENGE",
      profileId: input.profileId,
      type: ev.type,
      severity: ev.severity,
      timestamp: ev.timestamp ?? new Date(),
      metadata: ev.metadata,
    });
  }

  const events = memoryStore.integrityEvents.filter((e) => e.targetId === input.challengeId);
  return integritySummary(events);
}

export async function memorySubmitSkillChallenge(input: {
  challengeId: string;
  candidateId: string;
  answers: Record<string, string>;
  timeout: boolean;
}) {
  const challenge = memoryStore.challenges.get(input.challengeId);
  if (!challenge || challenge.candidateId.toString() !== input.candidateId || challenge.state !== "IN_PROGRESS") {
    throw new ApiError("This challenge was already submitted or is unavailable.", 409, "INVALID_CHALLENGE_STATE");
  }

  const expired = !challenge.expiresAt || Date.now() > challenge.expiresAt.getTime();
  const answers = expired && !input.timeout ? {} : input.answers;
  const scored = scoreMcq(answers, challenge.questions);
  const events = memoryStore.integrityEvents.filter((e) => e.targetId === input.challengeId);
  const integrity = integritySummary(events);

  challenge.answers = new Map(Object.entries(answers));
  challenge.score = scored.percentage;
  challenge.integrityScore = integrity.score;
  challenge.riskLevel = integrity.riskLevel;
  challenge.state = expired ? "EXPIRED" : "COMPLETED";
  challenge.submittedAt = new Date();

  return {
    id: challenge._id.toString(),
    state: challenge.state,
    skill: challenge.skill,
    score: scored,
    integrity,
    completedAt: challenge.submittedAt.toISOString(),
  };
}

export async function memoryGetSkillChallenge(challengeId: string, requesterId: string) {
  const challenge = memoryStore.challenges.get(challengeId);
  if (!challenge) throw new ApiError("Challenge not found.", 404, "CHALLENGE_NOT_FOUND");

  const team = memoryStore.teams.get(challenge.teamId.toString());
  const isCandidate = challenge.candidateId.toString() === requesterId;
  const isOwner = team?.members.some((m) => m.profileId.toString() === requesterId && m.status === "OWNER");

  if (!isCandidate && !isOwner) {
    throw new ApiError("You cannot view this challenge.", 403, "CHALLENGE_ACCESS_DENIED");
  }

  const events = memoryStore.integrityEvents.filter((e) => e.targetId === challengeId);
  return {
    id: challenge._id.toString(),
    teamId: challenge.teamId.toString(),
    candidateId: challenge.candidateId.toString(),
    skill: challenge.skill,
    state: challenge.state,
    score: challenge.score,
    integrity: challenge.integrityScore === undefined ? null : integritySummary(events),
    startedAt: challenge.startedAt?.toISOString() ?? null,
    expiresAt: challenge.expiresAt?.toISOString() ?? null,
    submittedAt: challenge.submittedAt?.toISOString() ?? null,
    questions: isCandidate && challenge.state === "IN_PROGRESS" ? publicQuestions(challenge.questions) : undefined,
  };
}
