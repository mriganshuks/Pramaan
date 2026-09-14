import mongoose from "mongoose";
import { z } from "zod";
import { Hackathon } from "@/models/Hackathon";
import { Team } from "@/models/Team";
import { Invitation } from "@/models/Invitation";
import { SkillChallenge } from "@/models/SkillChallenge";
import { IntegrityEvent } from "@/models/IntegrityEvent";
import { User } from "@/models/User";
import { ApiError, isDuplicateKeyError } from "@/lib/api";
import { isDatabaseConnected } from "@/lib/mongodb";
import {
  memoryCreateHackathon,
  memoryCreateSkillChallenge,
  memoryCreateTeam,
  memoryDecideSkillChallenge,
  memoryDiscoverCandidates,
  memoryGetSkillChallenge,
  memoryGetTeam,
  memoryJoinHackathon,
  memoryLeaveHackathon,
  memoryListHackathons,
  memoryListMyTeams,
  memoryListTeamChallenges,
  memoryRecordChallengeIntegrity,
  memoryRespondToInvitation,
  memorySendInvitation,
  memoryStartSkillChallenge,
  memorySubmitSkillChallenge,
} from "@/lib/memory-store";
import { generateAssessment } from "@/lib/assessment-generation";
import { integritySummary, scoreMcq } from "@/lib/assessment-scoring";
import { publicQuestions } from "@/lib/serializers";
import { CHALLENGE_DURATION_SECONDS, type IntegrityEventType } from "@/lib/assessment-types";

const skillName = z.string().trim().min(2).max(80);
export const hackathonSchema = z.object({ name: z.string().trim().min(3).max(120), description: z.string().trim().min(10).max(1500), location: z.string().trim().min(2).max(100), startsAt: z.coerce.date(), endsAt: z.coerce.date() }).refine((value) => value.endsAt > value.startsAt, { message: "The end date must be after the start date.", path: ["endsAt"] });
export const teamSchema = z.object({ hackathonId: z.string().min(1), name: z.string().trim().min(2).max(80), description: z.string().trim().max(800).default(""), requiredSkills: z.array(skillName).min(1).max(8), capacity: z.number().int().min(2).max(12).default(4) });
export const invitationSchema = z.object({ candidateId: z.string().min(1), message: z.string().trim().max(500).default("") });
export const challengeSchema = z.object({ candidateId: z.string().min(1), skill: skillName });

function objectId(value: string, name = "record") {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(`The requested ${name} was not found.`, 404, "NOT_FOUND");
  return new mongoose.Types.ObjectId(value);
}
function serializeTeam(team: { _id: { toString(): string }; hackathonId: { toString(): string }; name: string; description: string; requiredSkills: string[]; capacity: number; members: Array<{ profileId: { toString(): string }; role: string; status: string }> }) {
  return { id: team._id.toString(), hackathonId: team.hackathonId.toString(), name: team.name, description: team.description, requiredSkills: team.requiredSkills, capacity: team.capacity, members: team.members.map((member) => ({ profileId: member.profileId.toString(), role: member.role, status: member.status })) };
}
async function requireTeamOwner(teamId: string, profileId: string) {
  const team = await Team.findById(objectId(teamId, "team"));
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");
  if (!team.members.some((member) => member.profileId.toString() === profileId && member.status === "OWNER")) throw new ApiError("Only the team creator can perform this action.", 403, "TEAM_OWNER_REQUIRED");
  return team;
}

export async function listHackathons(profileId: string) {
  if (!isDatabaseConnected()) {
    return memoryListHackathons(profileId);
  }
  const profileObjectId = objectId(profileId, "profile");
  const hackathons = await Hackathon.find({}).sort({ startsAt: 1 }).lean();
  return hackathons.map((hackathon) => ({ id: hackathon._id.toString(), name: hackathon.name, description: hackathon.description, location: hackathon.location, startsAt: hackathon.startsAt.toISOString(), endsAt: hackathon.endsAt.toISOString(), joined: hackathon.participantIds.some((id) => id.toString() === profileObjectId.toString()), participantCount: hackathon.participantIds.length }));
}
export async function createHackathon(profileId: string, input: z.infer<typeof hackathonSchema>) {
  if (!isDatabaseConnected()) {
    return memoryCreateHackathon(profileId, input);
  }
  const creator = objectId(profileId, "profile");
  const hackathon = await Hackathon.create({ ...input, createdBy: creator, participantIds: [creator] });
  return { id: hackathon._id.toString(), name: hackathon.name };
}
export async function joinHackathon(profileId: string, hackathonId: string) {
  if (!isDatabaseConnected()) {
    return memoryJoinHackathon(profileId, hackathonId);
  }
  const hackathon = await Hackathon.findByIdAndUpdate(objectId(hackathonId, "hackathon"), { $addToSet: { participantIds: objectId(profileId, "profile") } }, { new: true });
  if (!hackathon) throw new ApiError("Hackathon not found.", 404, "HACKATHON_NOT_FOUND");
  return { id: hackathon._id.toString(), joined: true };
}
export async function leaveHackathon(profileId: string, hackathonId: string) {
  if (!isDatabaseConnected()) {
    return memoryLeaveHackathon(profileId, hackathonId);
  }
  const profileObjectId = objectId(profileId, "profile");
  const ownedTeam = await Team.exists({ hackathonId: objectId(hackathonId, "hackathon"), members: { $elemMatch: { profileId: profileObjectId, status: "OWNER" } } });
  if (ownedTeam) throw new ApiError("Transfer or remove your team before leaving this hackathon.", 409, "TEAM_OWNER_CANNOT_LEAVE");
  await Hackathon.findByIdAndUpdate(objectId(hackathonId, "hackathon"), { $pull: { participantIds: profileObjectId } });
  await Team.updateMany({ hackathonId: objectId(hackathonId, "hackathon") }, { $pull: { members: { profileId: profileObjectId } } });
  return { id: hackathonId, joined: false };
}

export async function createTeam(profileId: string, input: z.infer<typeof teamSchema>) {
  if (!isDatabaseConnected()) {
    return memoryCreateTeam(profileId, input);
  }
  const owner = objectId(profileId, "profile");
  const hackathonId = objectId(input.hackathonId, "hackathon");
  const hackathon = await Hackathon.exists({ _id: hackathonId, participantIds: owner });
  if (!hackathon) throw new ApiError("Join the hackathon before creating a team.", 409, "HACKATHON_MEMBERSHIP_REQUIRED");
  try {
    const team = await Team.create({ ...input, hackathonId, requiredSkills: [...new Set(input.requiredSkills.map((skill) => skill.trim()))], members: [{ profileId: owner, role: "Team lead", status: "OWNER" }] });
    return serializeTeam(team);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ApiError("A team with that name already exists in this hackathon.", 409, "TEAM_NAME_EXISTS");
    throw error;
  }
}
export async function listMyTeams(profileId: string) {
  if (!isDatabaseConnected()) {
    return memoryListMyTeams(profileId);
  }
  const teams = await Team.find({ "members.profileId": objectId(profileId, "profile") }).lean();
  const hackathonIds = [...new Set(teams.map((team) => team.hackathonId.toString()))];
  const hackathons = await Hackathon.find({ _id: { $in: hackathonIds } }).lean();
  const names = new Map(hackathons.map((hackathon) => [hackathon._id.toString(), hackathon.name]));
  return teams.map((team) => ({ ...serializeTeam(team), hackathonName: names.get(team.hackathonId.toString()) ?? "Hackathon" }));
}
export async function getTeam(teamId: string) {
  if (!isDatabaseConnected()) {
    return memoryGetTeam(teamId);
  }
  const team = await Team.findById(objectId(teamId, "team")).lean();
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");
  const profiles = await User.find({ _id: { $in: team.members.map((member) => member.profileId) } }).select("displayName headline skills").lean();
  const profileMap = new Map(profiles.map((profile) => [profile._id.toString(), profile]));
  return { ...serializeTeam(team), members: team.members.map((member) => ({ ...member, profileId: member.profileId.toString(), profile: profileMap.get(member.profileId.toString()) ? { id: member.profileId.toString(), displayName: profileMap.get(member.profileId.toString())?.displayName, headline: profileMap.get(member.profileId.toString())?.headline } : null })) };
}

export async function discoverCandidates(teamId: string, currentProfileId: string) {
  if (!isDatabaseConnected()) {
    return memoryDiscoverCandidates(teamId, currentProfileId);
  }
  const team = await Team.findById(objectId(teamId, "team")).lean();
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");
  const memberIds = new Set(team.members.map((member) => member.profileId.toString()));
  memberIds.add(currentProfileId);
  const required = team.requiredSkills.map((skill) => skill.toLowerCase());
  const candidates = await User.find({ _id: { $nin: [...memberIds].map((id) => objectId(id, "profile")) }, availableForTeams: true, "skills.normalizedName": { $in: required } }).lean();
  return candidates.map((candidate) => {
    let points = 0;
    const reasons: string[] = [];
    for (const requiredSkill of required) {
      const skill = candidate.skills.find((entry) => entry.normalizedName === requiredSkill);
      if (!skill) continue;
      const label = skill.name;
      if (skill.status === "VERIFIED") { points += 32 + Math.round((skill.assessmentScore ?? 0) / 10); reasons.push(`${label} is verified${skill.assessmentScore ? ` (${skill.assessmentScore}%)` : ""}`); }
      else if (skill.status === "PARTIALLY_VERIFIED") { points += 20; reasons.push(`${label} has assessment or evidence support`); }
      else { points += 8; reasons.push(`${label} is a claimed skill`); }
    }
    const complementary = candidate.skills.filter((skill) => !required.includes(skill.normalizedName) && skill.status !== "CLAIMED").slice(0, 2);
    points += complementary.length * 3;
    if (complementary.length) reasons.push(`Complementary evidence: ${complementary.map((skill) => skill.name).join(", ")}`);
    return { id: candidate._id.toString(), displayName: candidate.displayName, headline: candidate.headline, matchScore: Math.min(100, points), reasons, skills: candidate.skills.map((skill) => ({ name: skill.name, status: skill.status, assessmentScore: skill.assessmentScore })) };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

export async function sendInvitation(teamId: string, ownerId: string, input: z.infer<typeof invitationSchema>) {
  if (!isDatabaseConnected()) {
    return memorySendInvitation(teamId, ownerId, input);
  }
  const team = await requireTeamOwner(teamId, ownerId);
  const candidateId = objectId(input.candidateId, "candidate");
  if (team.members.length >= team.capacity) throw new ApiError("This team is already full.", 409, "TEAM_FULL");
  if (team.members.some((member) => member.profileId.toString() === candidateId.toString())) throw new ApiError("This candidate is already on the team.", 409, "ALREADY_MEMBER");
  if (!(await User.exists({ _id: candidateId }))) throw new ApiError("Candidate not found.", 404, "CANDIDATE_NOT_FOUND");
  const existing = await Invitation.exists({ teamId: team._id, candidateId, status: "PENDING" });
  if (existing) throw new ApiError("A pending invitation already exists for this candidate.", 409, "INVITATION_EXISTS");
  const invitation = await Invitation.create({ teamId: team._id, candidateId, sentBy: objectId(ownerId, "profile"), message: input.message });
  return { id: invitation._id.toString(), status: invitation.status };
}
export async function respondToInvitation(invitationId: string, candidateId: string, action: "ACCEPT" | "REJECT") {
  if (!isDatabaseConnected()) {
    return memoryRespondToInvitation(invitationId, candidateId, action);
  }
  const invitation = await Invitation.findOneAndUpdate({ _id: objectId(invitationId, "invitation"), candidateId: objectId(candidateId, "profile"), status: "PENDING" }, { $set: { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED", respondedAt: new Date() } }, { new: true });
  if (!invitation) throw new ApiError("This invitation is no longer pending.", 409, "INVALID_INVITATION_STATE");
  if (action === "ACCEPT") {
    const team = await Team.findOneAndUpdate({ _id: invitation.teamId, $expr: { $lt: [{ $size: "$members" }, "$capacity"] }, "members.profileId": { $ne: invitation.candidateId } }, { $push: { members: { profileId: invitation.candidateId, role: "Member", status: "ACCEPTED" } } }, { new: true });
    if (!team) throw new ApiError("The team became full before you accepted.", 409, "TEAM_FULL");
  }
  return { id: invitation._id.toString(), status: invitation.status };
}

export async function createSkillChallenge(teamId: string, ownerId: string, input: z.infer<typeof challengeSchema>) {
  if (!isDatabaseConnected()) {
    return memoryCreateSkillChallenge(teamId, ownerId, input);
  }
  const team = await requireTeamOwner(teamId, ownerId);
  const candidateId = objectId(input.candidateId, "candidate");
  if (!(await User.exists({ _id: candidateId }))) {
    throw new ApiError("Candidate profile not found.", 404, "CANDIDATE_NOT_FOUND");
  }
  if (team.members.some((member) => member.profileId.toString() === candidateId.toString())) {
    throw new ApiError("This candidate is already a member of your team.", 409, "ALREADY_MEMBER");
  }
  if (team.members.length >= team.capacity) {
    throw new ApiError("Team is already at maximum capacity.", 409, "TEAM_FULL");
  }
  const duplicate = await SkillChallenge.exists({ teamId: team._id, candidateId, state: { $in: ["SENT", "IN_PROGRESS"] } });
  if (duplicate) throw new ApiError("This candidate already has an active skill challenge for this team.", 409, "CHALLENGE_EXISTS");
  const generated = await generateAssessment({ skill: input.skill, difficulty: "intermediate", count: 5 });
  const challenge = await SkillChallenge.create({ teamId: team._id, candidateId, createdBy: objectId(ownerId, "profile"), skill: input.skill, questions: generated.questions, generatedBy: generated.generatedBy, state: "SENT" });
  return { id: challenge._id.toString(), state: challenge.state, skill: challenge.skill };
}

export async function listTeamChallenges(teamId: string, ownerId: string) {
  if (!isDatabaseConnected()) {
    return memoryListTeamChallenges(teamId, ownerId);
  }
  const team = await requireTeamOwner(teamId, ownerId);
  const challenges = await SkillChallenge.find({ teamId: team._id }).sort({ createdAt: -1 }).lean();
  const candidateIds = challenges.map((c) => c.candidateId);
  const candidates = await User.find({ _id: { $in: candidateIds } }).select("name handle avatarUrl headline skills").lean();
  const candidateMap = new Map(candidates.map((c) => [c._id.toString(), c]));

  return challenges.map((c) => ({
    id: c._id.toString(),
    teamId: c.teamId.toString(),
    candidateId: c.candidateId.toString(),
    candidate: candidateMap.get(c.candidateId.toString()) ?? null,
    skill: c.skill,
    state: c.state,
    score: c.score ?? null,
    integrityScore: c.integrityScore ?? null,
    riskLevel: c.riskLevel ?? null,
    startedAt: c.startedAt?.toISOString() ?? null,
    submittedAt: c.submittedAt?.toISOString() ?? null,
    createdAt: (c as { createdAt?: Date }).createdAt?.toISOString() ?? null,
  }));
}

export async function decideSkillChallenge(
  teamId: string,
  ownerId: string,
  challengeId: string,
  decision: "ACCEPT" | "REJECT"
) {
  if (!isDatabaseConnected()) {
    return memoryDecideSkillChallenge(teamId, ownerId, challengeId, decision);
  }
  const team = await requireTeamOwner(teamId, ownerId);
  const challenge = await SkillChallenge.findOne({ _id: objectId(challengeId, "challenge"), teamId: team._id });
  if (!challenge) throw new ApiError("Challenge not found for this team.", 404, "CHALLENGE_NOT_FOUND");
  if (challenge.state !== "COMPLETED") {
    throw new ApiError("Only completed challenges can be accepted or rejected.", 400, "CHALLENGE_NOT_COMPLETED");
  }

  if (decision === "ACCEPT") {
    if (team.members.length >= team.capacity) {
      throw new ApiError("This team is already full.", 409, "TEAM_FULL");
    }
    const candidateId = challenge.candidateId;
    if (!team.members.some((m) => m.profileId.toString() === candidateId.toString())) {
      team.members.push({
        profileId: candidateId,
        role: "Member",
        status: "ACCEPTED",
        joinedAt: new Date(),
      });
      await team.save();
    }
    challenge.state = "ACCEPTED";
    await challenge.save();
    return { status: "ACCEPTED", message: "Candidate accepted into team." };
  } else {
    challenge.state = "REJECTED";
    await challenge.save();
    return { status: "REJECTED", message: "Candidate rejected." };
  }
}

export async function startSkillChallenge(challengeId: string, candidateId: string) {
  if (!isDatabaseConnected()) {
    return memoryStartSkillChallenge(challengeId, candidateId);
  }
  const now = new Date();
  const challenge = await SkillChallenge.findOneAndUpdate(
    { _id: objectId(challengeId, "challenge"), candidateId: objectId(candidateId, "profile"), state: "SENT" },
    { $set: { state: "IN_PROGRESS", startedAt: now, expiresAt: new Date(now.getTime() + CHALLENGE_DURATION_SECONDS * 1000) } },
    { new: true }
  );
  if (!challenge) throw new ApiError("This challenge cannot be started in its current state.", 409, "INVALID_CHALLENGE_STATE");
  return { id: challenge._id.toString(), state: challenge.state, skill: challenge.skill, questions: publicQuestions(challenge.questions), startedAt: challenge.startedAt?.toISOString(), expiresAt: challenge.expiresAt?.toISOString() };
}

export async function recordChallengeIntegrity(input: { challengeId: string; profileId: string; events: Array<{ type: IntegrityEventType; severity: "LOW" | "MEDIUM" | "HIGH"; timestamp?: Date; metadata?: Record<string, string | number | boolean> }> }) {
  if (!isDatabaseConnected()) {
    return memoryRecordChallengeIntegrity(input);
  }
  const challengeId = objectId(input.challengeId, "challenge");
  const profileId = objectId(input.profileId, "profile");
  const exists = await SkillChallenge.exists({ _id: challengeId, candidateId: profileId, state: "IN_PROGRESS" });
  if (!exists) throw new ApiError("This challenge can no longer receive integrity events.", 409, "INVALID_CHALLENGE_STATE");
  await IntegrityEvent.insertMany(input.events.map((event) => ({ targetId: challengeId, targetType: "CHALLENGE", profileId, type: event.type, severity: event.severity, timestamp: event.timestamp ?? new Date(), metadata: event.metadata })), { ordered: false });
  const events = await IntegrityEvent.find({ targetId: challengeId }).lean();
  return integritySummary(events as Array<{ type: IntegrityEventType; severity: string }>);
}

export async function submitSkillChallenge(input: { challengeId: string; candidateId: string; answers: Record<string, string>; timeout: boolean }) {
  if (!isDatabaseConnected()) {
    return memorySubmitSkillChallenge(input);
  }
  const candidateObjectId = objectId(input.candidateId, "profile");
  const challengeId = objectId(input.challengeId, "challenge");
  const challenge = await SkillChallenge.findOneAndUpdate({ _id: challengeId, candidateId: candidateObjectId, state: "IN_PROGRESS" }, { $set: { state: "COMPLETED", submittedAt: new Date() } }, { new: true }).select("+questions.correctOption +questions.explanation");
  if (!challenge) throw new ApiError("This challenge was already submitted or is unavailable.", 409, "INVALID_CHALLENGE_STATE");
  const expired = !challenge.expiresAt || Date.now() > challenge.expiresAt.getTime();
  const answers = expired && !input.timeout ? {} : input.answers;
  const scored = scoreMcq(answers, challenge.questions);
  const events = await IntegrityEvent.find({ targetId: challenge._id }).lean();
  const integrity = integritySummary(events as Array<{ type: IntegrityEventType; severity: string }>);
  challenge.answers = new Map(Object.entries(answers));
  challenge.score = scored.percentage;
  challenge.integrityScore = integrity.score;
  challenge.riskLevel = integrity.riskLevel;
  challenge.state = expired ? "EXPIRED" : "COMPLETED";
  await challenge.save();
  return { id: challenge._id.toString(), state: challenge.state, skill: challenge.skill, score: scored, integrity, completedAt: challenge.submittedAt?.toISOString() ?? null };
}

export async function getSkillChallenge(challengeId: string, requesterId: string) {
  if (!isDatabaseConnected()) {
    return memoryGetSkillChallenge(challengeId, requesterId);
  }
  const challenge = await SkillChallenge.findById(objectId(challengeId, "challenge")).lean();
  if (!challenge) throw new ApiError("Challenge not found.", 404, "CHALLENGE_NOT_FOUND");
  const team = await Team.findById(challenge.teamId).lean();
  const isCandidate = challenge.candidateId.toString() === requesterId;
  const isOwner = team?.members.some((member) => member.profileId.toString() === requesterId && member.status === "OWNER");
  if (!isCandidate && !isOwner) throw new ApiError("You cannot view this challenge.", 403, "CHALLENGE_ACCESS_DENIED");
  const events = await IntegrityEvent.find({ targetId: challenge._id }).lean();
  return { id: challenge._id.toString(), teamId: challenge.teamId.toString(), candidateId: challenge.candidateId.toString(), skill: challenge.skill, state: challenge.state, score: challenge.score, integrity: challenge.integrityScore === undefined ? null : integritySummary(events as Array<{ type: IntegrityEventType; severity: string }>), startedAt: challenge.startedAt?.toISOString() ?? null, expiresAt: challenge.expiresAt?.toISOString() ?? null, submittedAt: challenge.submittedAt?.toISOString() ?? null, questions: isCandidate && challenge.state === "IN_PROGRESS" ? publicQuestions(challenge.questions) : undefined };
}
