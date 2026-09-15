import { z } from "zod";
import { ApiError, isDuplicateKeyError } from "@/lib/api";
import { getSupabaseAdminClient, handleSupabaseError, requireValidUuid } from "@/lib/supabase/admin";
import { generateAssessment } from "@/lib/assessment-generation";
import { integritySummary, scoreMcq } from "@/lib/assessment-scoring";
import { publicQuestions } from "@/lib/serializers";
import { CHALLENGE_DURATION_SECONDS, type IntegrityEventType } from "@/lib/assessment-types";

const skillName = z.string().trim().min(2).max(80);

export const hackathonSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(1500),
    location: z.string().trim().min(2).max(100),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "The end date must be after the start date.",
    path: ["endsAt"],
  });

export const teamSchema = z.object({
  hackathonId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(800).default(""),
  requiredSkills: z.array(skillName).min(1).max(8),
  capacity: z.number().int().min(2).max(12).default(4),
});

export const invitationSchema = z.object({
  candidateId: z.string().min(1),
  message: z.string().trim().max(500).default(""),
});

export const challengeSchema = z.object({
  candidateId: z.string().min(1),
  skill: skillName,
});

function validUuid(value: string, name = "record"): string {
  return requireValidUuid(value, name);
}

function serializeTeam(team: {
  id: string;
  hackathon_id: string;
  name: string;
  description?: string | null;
  required_skills: string[];
  capacity: number;
  members?: Array<{
    profile_id: string;
    role: string;
    status: string;
    profile?: { id: string; displayName?: string; headline?: string } | null;
  }>;
}) {
  return {
    id: team.id,
    hackathonId: team.hackathon_id,
    name: team.name,
    description: team.description ?? "",
    requiredSkills: team.required_skills ?? [],
    capacity: team.capacity,
    members: (team.members ?? []).map((m) => ({
      profileId: m.profile_id,
      role: m.role,
      status: m.status,
      profile: m.profile ?? null,
    })),
  };
}

async function requireTeamOwner(teamId: string, profileId: string) {
  const validTeam = validUuid(teamId, "team");
  const validProfile = validUuid(profileId, "profile");
  const supabase = getSupabaseAdminClient();

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select("id, capacity, name, hackathon_id")
    .eq("id", validTeam)
    .maybeSingle();

  if (teamErr) handleSupabaseError(teamErr, "Failed to load team");
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");

  const { data: membership, error: memErr } = await supabase
    .from("team_members")
    .select("role, status")
    .eq("team_id", validTeam)
    .eq("profile_id", validProfile)
    .maybeSingle();

  if (memErr) handleSupabaseError(memErr, "Failed to check team membership");
  if (!membership || membership.status !== "OWNER") {
    throw new ApiError("Only the team creator can perform this action.", 403, "TEAM_OWNER_REQUIRED");
  }

  const { data: allMembers } = await supabase
    .from("team_members")
    .select("profile_id, role, status")
    .eq("team_id", validTeam);

  return {
    ...team,
    members: allMembers ?? [],
  };
}

export async function listHackathons(profileId: string) {
  const validProfile = validUuid(profileId, "profile");
  const supabase = getSupabaseAdminClient();

  const { data: hackathons, error } = await supabase
    .from("hackathons")
    .select(`
      id,
      name,
      description,
      location,
      starts_at,
      ends_at,
      hackathon_participants (
        profile_id
      )
    `)
    .order("starts_at", { ascending: true });

  if (error) handleSupabaseError(error, "Failed to list hackathons");

  return (hackathons ?? []).map((h) => {
    const participants = (h.hackathon_participants as Array<{ profile_id: string }>) ?? [];
    const joined = participants.some((p) => p.profile_id === validProfile);
    return {
      id: h.id,
      name: h.name,
      description: h.description,
      location: h.location,
      startsAt: new Date(h.starts_at).toISOString(),
      endsAt: new Date(h.ends_at).toISOString(),
      joined,
      participantCount: participants.length,
    };
  });
}

export async function createHackathon(profileId: string, input: z.infer<typeof hackathonSchema>) {
  const validProfile = validUuid(profileId, "profile");
  const supabase = getSupabaseAdminClient();

  const { data: hackathon, error: insertErr } = await supabase
    .from("hackathons")
    .insert({
      name: input.name,
      description: input.description,
      location: input.location,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      created_by: validProfile,
    })
    .select("id, name")
    .single();

  if (insertErr) handleSupabaseError(insertErr, "Failed to create hackathon");

  // Automatically join the creator to the hackathon
  await supabase
    .from("hackathon_participants")
    .insert({ hackathon_id: hackathon.id, profile_id: validProfile });

  return { id: hackathon.id, name: hackathon.name };
}

export async function joinHackathon(profileId: string, hackathonId: string) {
  const validProfile = validUuid(profileId, "profile");
  const validHackathon = validUuid(hackathonId, "hackathon");
  const supabase = getSupabaseAdminClient();

  // Verify hackathon exists
  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("id")
    .eq("id", validHackathon)
    .maybeSingle();

  if (!hackathon) throw new ApiError("Hackathon not found.", 404, "HACKATHON_NOT_FOUND");

  const { error } = await supabase
    .from("hackathon_participants")
    .upsert({ hackathon_id: validHackathon, profile_id: validProfile });

  if (error) handleSupabaseError(error, "Failed to join hackathon");

  return { id: validHackathon, joined: true };
}

export async function leaveHackathon(profileId: string, hackathonId: string) {
  const validProfile = validUuid(profileId, "profile");
  const validHackathon = validUuid(hackathonId, "hackathon");
  const supabase = getSupabaseAdminClient();

  // Check if user is owner of any team in this hackathon
  const { data: ownedTeams } = await supabase
    .from("teams")
    .select(`
      id,
      team_members!inner(profile_id, status)
    `)
    .eq("hackathon_id", validHackathon)
    .eq("team_members.profile_id", validProfile)
    .eq("team_members.status", "OWNER");

  if (ownedTeams && ownedTeams.length > 0) {
    throw new ApiError("Transfer or remove your team before leaving this hackathon.", 409, "TEAM_OWNER_CANNOT_LEAVE");
  }

  // Remove participant record
  await supabase
    .from("hackathon_participants")
    .delete()
    .eq("hackathon_id", validHackathon)
    .eq("profile_id", validProfile);

  // Remove memberships in this hackathon's teams
  const { data: teamsInHackathon } = await supabase
    .from("teams")
    .select("id")
    .eq("hackathon_id", validHackathon);

  if (teamsInHackathon && teamsInHackathon.length > 0) {
    const teamIds = teamsInHackathon.map((t) => t.id);
    await supabase
      .from("team_members")
      .delete()
      .in("team_id", teamIds)
      .eq("profile_id", validProfile);
  }

  return { id: validHackathon, joined: false };
}

export async function createTeam(profileId: string, input: z.infer<typeof teamSchema>) {
  const validProfile = validUuid(profileId, "profile");
  const validHackathon = validUuid(input.hackathonId, "hackathon");
  const supabase = getSupabaseAdminClient();

  // Verify hackathon membership
  const { data: participant } = await supabase
    .from("hackathon_participants")
    .select("profile_id")
    .eq("hackathon_id", validHackathon)
    .eq("profile_id", validProfile)
    .maybeSingle();

  if (!participant) {
    throw new ApiError("Join the hackathon before creating a team.", 409, "HACKATHON_MEMBERSHIP_REQUIRED");
  }

  const uniqueSkills = [...new Set(input.requiredSkills.map((s) => s.trim()))];

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({
      hackathon_id: validHackathon,
      name: input.name.trim(),
      description: input.description ?? "",
      required_skills: uniqueSkills,
      capacity: input.capacity,
    })
    .select()
    .single();

  if (teamErr) {
    if (isDuplicateKeyError(teamErr) || teamErr.code === "23505") {
      throw new ApiError("A team with that name already exists in this hackathon.", 409, "TEAM_NAME_EXISTS");
    }
    handleSupabaseError(teamErr, "Failed to create team");
  }

  // Add owner to team_members
  const { data: member, error: memErr } = await supabase
    .from("team_members")
    .insert({
      team_id: team.id,
      profile_id: validProfile,
      role: "Team lead",
      status: "OWNER",
    })
    .select("profile_id, role, status")
    .single();

  if (memErr) handleSupabaseError(memErr, "Failed to assign team owner");

  return serializeTeam({
    ...team,
    members: [member],
  });
}

export async function listMyTeams(profileId: string) {
  const validProfile = validUuid(profileId, "profile");
  const supabase = getSupabaseAdminClient();

  // Find all teams where user is a member
  const { data: memberships, error: memErr } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("profile_id", validProfile);

  if (memErr) handleSupabaseError(memErr, "Failed to query team memberships");
  if (!memberships || memberships.length === 0) return [];

  const teamIds = memberships.map((m) => m.team_id);

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select(`
      id,
      hackathon_id,
      name,
      description,
      required_skills,
      capacity,
      hackathons (
        name
      ),
      team_members (
        profile_id,
        role,
        status
      )
    `)
    .in("id", teamIds);

  if (teamsErr) handleSupabaseError(teamsErr, "Failed to load teams");

  return (teams ?? []).map((t) => {
    const hackathon = t.hackathons as unknown as { name: string } | null;
    return {
      ...serializeTeam({
        id: t.id,
        hackathon_id: t.hackathon_id,
        name: t.name,
        description: t.description,
        required_skills: t.required_skills,
        capacity: t.capacity,
        members: t.team_members as unknown as Array<{ profile_id: string; role: string; status: string }>,
      }),
      hackathonName: hackathon?.name ?? "Hackathon",
    };
  });
}

export async function getTeam(teamId: string) {
  const validTeam = validUuid(teamId, "team");
  const supabase = getSupabaseAdminClient();

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select(`
      id,
      hackathon_id,
      name,
      description,
      required_skills,
      capacity,
      team_members (
        profile_id,
        role,
        status,
        profiles (
          id,
          display_name,
          headline
        )
      )
    `)
    .eq("id", validTeam)
    .maybeSingle();

  if (teamErr) handleSupabaseError(teamErr, "Failed to load team");
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");

  const members = ((team.team_members ?? []) as unknown as Array<{
    profile_id: string;
    role: string;
    status: string;
    profiles?: { id: string; display_name?: string; headline?: string } | null;
  }>).map((m) => ({
    profileId: m.profile_id,
    role: m.role,
    status: m.status,
    profile: m.profiles
      ? {
          id: m.profiles.id,
          displayName: m.profiles.display_name,
          headline: m.profiles.headline,
        }
      : null,
  }));

  return {
    ...serializeTeam({
      id: team.id,
      hackathon_id: team.hackathon_id,
      name: team.name,
      description: team.description,
      required_skills: team.required_skills,
      capacity: team.capacity,
    }),
    members,
  };
}

export async function discoverCandidates(teamId: string, currentProfileId: string) {
  const validTeam = validUuid(teamId, "team");
  const validCurrentProfile = validUuid(currentProfileId, "profile");
  const supabase = getSupabaseAdminClient();

  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .select(`
      id,
      required_skills,
      team_members (
        profile_id
      )
    `)
    .eq("id", validTeam)
    .maybeSingle();

  if (teamErr) handleSupabaseError(teamErr, "Failed to load team");
  if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");

  const memberIds = new Set(
    ((team.team_members as unknown as Array<{ profile_id: string }>) ?? []).map((m) => m.profile_id)
  );
  memberIds.add(validCurrentProfile);

  const required = (team.required_skills ?? []).map((s: string) => s.toLowerCase());

  // Query candidates who are available for teams with their skills
  const { data: candidates, error: candErr } = await supabase
    .from("profiles")
    .select(`
      id,
      display_name,
      headline,
      available_for_teams,
      user_skills (
        name,
        normalized_name,
        status,
        assessment_score
      )
    `)
    .eq("available_for_teams", true);

  if (candErr) handleSupabaseError(candErr, "Failed to query candidates");

  return (candidates ?? [])
    .filter((c) => !memberIds.has(c.id))
    .map((candidate) => {
      const skills = (candidate.user_skills as unknown as Array<{
        name: string;
        normalized_name: string;
        status: string;
        assessment_score?: number | null;
      }>) ?? [];

      let points = 0;
      const reasons: string[] = [];

      for (const reqSkill of required) {
        const match = skills.find((s) => s.normalized_name === reqSkill);
        if (!match) continue;

        if (match.status === "VERIFIED") {
          points += 32 + Math.round((match.assessment_score ?? 0) / 10);
          reasons.push(`${match.name} is verified${match.assessment_score ? ` (${match.assessment_score}%)` : ""}`);
        } else if (match.status === "PARTIALLY_VERIFIED") {
          points += 20;
          reasons.push(`${match.name} has assessment or evidence support`);
        } else {
          points += 8;
          reasons.push(`${match.name} is a claimed skill`);
        }
      }

      const complementary = skills
        .filter((s) => !required.includes(s.normalized_name) && s.status !== "CLAIMED")
        .slice(0, 2);

      points += complementary.length * 3;
      if (complementary.length) {
        reasons.push(`Complementary evidence: ${complementary.map((s) => s.name).join(", ")}`);
      }

      return {
        id: candidate.id,
        displayName: candidate.display_name,
        headline: candidate.headline,
        matchScore: Math.min(100, points),
        reasons,
        skills: skills.map((s) => ({
          name: s.name,
          status: s.status,
          assessmentScore: s.assessment_score ?? undefined,
        })),
      };
    })
    .filter((c) => c.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function sendInvitation(teamId: string, ownerId: string, input: z.infer<typeof invitationSchema>) {
  const team = await requireTeamOwner(teamId, ownerId);
  const candidateId = validUuid(input.candidateId, "candidate");
  const supabase = getSupabaseAdminClient();

  if (team.members.length >= team.capacity) {
    throw new ApiError("This team is already full.", 409, "TEAM_FULL");
  }
  if (team.members.some((m: { profile_id: string }) => m.profile_id === candidateId)) {
    throw new ApiError("This candidate is already on the team.", 409, "ALREADY_MEMBER");
  }

  // Check candidate exists
  const { data: candidate } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate) throw new ApiError("Candidate not found.", 404, "CANDIDATE_NOT_FOUND");

  // Check existing pending invitation
  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("team_id", team.id)
    .eq("candidate_id", candidateId)
    .eq("status", "PENDING")
    .maybeSingle();

  if (existing) throw new ApiError("A pending invitation already exists for this candidate.", 409, "INVITATION_EXISTS");

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      team_id: team.id,
      candidate_id: candidateId,
      sent_by: ownerId,
      message: input.message ?? "",
      status: "PENDING",
    })
    .select("id, status")
    .single();

  if (error) handleSupabaseError(error, "Failed to send invitation");

  return { id: invitation.id, status: invitation.status };
}

export async function respondToInvitation(invitationId: string, candidateId: string, action: "ACCEPT" | "REJECT") {
  const validInv = validUuid(invitationId, "invitation");
  const validCandidate = validUuid(candidateId, "candidate");
  const supabase = getSupabaseAdminClient();

  // Find pending invitation
  const { data: invitation, error: invErr } = await supabase
    .from("invitations")
    .select("id, team_id, status")
    .eq("id", validInv)
    .eq("candidate_id", validCandidate)
    .eq("status", "PENDING")
    .maybeSingle();

  if (invErr) handleSupabaseError(invErr, "Failed to load invitation");
  if (!invitation) throw new ApiError("This invitation is no longer pending.", 409, "INVALID_INVITATION_STATE");

  const newStatus = action === "ACCEPT" ? "ACCEPTED" : "REJECTED";

  if (action === "ACCEPT") {
    // Check team capacity and membership
    const { data: team } = await supabase
      .from("teams")
      .select(`
        id,
        capacity,
        team_members (profile_id)
      `)
      .eq("id", invitation.team_id)
      .single();

    if (!team) throw new ApiError("Team not found.", 404, "TEAM_NOT_FOUND");
    const currentMembers = (team.team_members as unknown as Array<{ profile_id: string }>) ?? [];

    if (currentMembers.length >= team.capacity) {
      throw new ApiError("The team became full before you accepted.", 409, "TEAM_FULL");
    }

    if (!currentMembers.some((m) => m.profile_id === validCandidate)) {
      await supabase.from("team_members").insert({
        team_id: invitation.team_id,
        profile_id: validCandidate,
        role: "Member",
        status: "ACCEPTED",
      });
    }
  }

  await supabase
    .from("invitations")
    .update({
      status: newStatus,
      responded_at: new Date().toISOString(),
    })
    .eq("id", validInv);

  return { id: validInv, status: newStatus };
}

export async function createSkillChallenge(teamId: string, ownerId: string, input: z.infer<typeof challengeSchema>) {
  const team = await requireTeamOwner(teamId, ownerId);
  const candidateId = validUuid(input.candidateId, "candidate");
  const supabase = getSupabaseAdminClient();

  // Check candidate exists
  const { data: candidate } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate) throw new ApiError("Candidate profile not found.", 404, "CANDIDATE_NOT_FOUND");

  if (team.members.some((m: { profile_id: string }) => m.profile_id === candidateId)) {
    throw new ApiError("This candidate is already a member of your team.", 409, "ALREADY_MEMBER");
  }

  if (team.members.length >= team.capacity) {
    throw new ApiError("Team is already at maximum capacity.", 409, "TEAM_FULL");
  }

  // Check duplicate active challenge
  const { data: duplicate } = await supabase
    .from("skill_challenges")
    .select("id")
    .eq("team_id", team.id)
    .eq("candidate_id", candidateId)
    .in("state", ["SENT", "IN_PROGRESS"])
    .maybeSingle();

  if (duplicate) {
    throw new ApiError("This candidate already has an active skill challenge for this team.", 409, "CHALLENGE_EXISTS");
  }

  const generated = await generateAssessment({ skill: input.skill, difficulty: "intermediate", count: 5 });

  const { data: challenge, error: insertErr } = await supabase
    .from("skill_challenges")
    .insert({
      team_id: team.id,
      candidate_id: candidateId,
      created_by: ownerId,
      skill: input.skill,
      questions: generated.questions,
      generated_by: generated.generatedBy,
      state: "SENT",
    })
    .select("id, state, skill")
    .single();

  if (insertErr) handleSupabaseError(insertErr, "Failed to create skill challenge");

  return { id: challenge.id, state: challenge.state, skill: challenge.skill };
}

export async function listTeamChallenges(teamId: string, ownerId: string) {
  const team = await requireTeamOwner(teamId, ownerId);
  const supabase = getSupabaseAdminClient();

  const { data: challenges, error } = await supabase
    .from("skill_challenges")
    .select(`
      id,
      team_id,
      candidate_id,
      skill,
      state,
      score,
      integrity_score,
      risk_level,
      started_at,
      submitted_at,
      created_at,
      profiles:candidate_id (
        id,
        display_name,
        handle,
        headline,
        user_skills (
          name,
          status,
          assessment_score
        )
      )
    `)
    .eq("team_id", team.id)
    .order("created_at", { ascending: false });

  if (error) handleSupabaseError(error, "Failed to list challenges");

  return (challenges ?? []).map((c) => {
    const cand = c.profiles as unknown as {
      id: string;
      display_name: string;
      handle: string;
      headline: string;
      user_skills?: Array<{ name: string; status: string; assessment_score?: number }>;
    } | null;

    return {
      id: c.id,
      teamId: c.team_id,
      candidateId: c.candidate_id,
      candidate: cand
        ? {
            id: cand.id,
            name: cand.display_name,
            handle: cand.handle,
            headline: cand.headline,
            skills: cand.user_skills ?? [],
          }
        : null,
      skill: c.skill,
      state: c.state,
      score: c.score ?? null,
      integrityScore: c.integrity_score ?? null,
      riskLevel: c.risk_level ?? null,
      startedAt: c.started_at ? new Date(c.started_at).toISOString() : null,
      submittedAt: c.submitted_at ? new Date(c.submitted_at).toISOString() : null,
      createdAt: c.created_at ? new Date(c.created_at).toISOString() : null,
    };
  });
}

export async function decideSkillChallenge(
  teamId: string,
  ownerId: string,
  challengeId: string,
  decision: "ACCEPT" | "REJECT"
) {
  const team = await requireTeamOwner(teamId, ownerId);
  const validChallenge = validUuid(challengeId, "challenge");
  const supabase = getSupabaseAdminClient();

  const { data: challenge, error: chErr } = await supabase
    .from("skill_challenges")
    .select("id, candidate_id, state")
    .eq("id", validChallenge)
    .eq("team_id", team.id)
    .maybeSingle();

  if (chErr) handleSupabaseError(chErr, "Failed to load challenge");
  if (!challenge) throw new ApiError("Challenge not found for this team.", 404, "CHALLENGE_NOT_FOUND");
  if (challenge.state !== "COMPLETED") {
    throw new ApiError("Only completed challenges can be accepted or rejected.", 400, "CHALLENGE_NOT_COMPLETED");
  }

  if (decision === "ACCEPT") {
    if (team.members.length >= team.capacity) {
      throw new ApiError("This team is already full.", 409, "TEAM_FULL");
    }

    if (!team.members.some((m: { profile_id: string }) => m.profile_id === challenge.candidate_id)) {
      await supabase.from("team_members").insert({
        team_id: team.id,
        profile_id: challenge.candidate_id,
        role: "Member",
        status: "ACCEPTED",
      });
    }

    await supabase
      .from("skill_challenges")
      .update({ state: "ACCEPTED" })
      .eq("id", validChallenge);

    return { status: "ACCEPTED", message: "Candidate accepted into team." };
  } else {
    await supabase
      .from("skill_challenges")
      .update({ state: "REJECTED" })
      .eq("id", validChallenge);

    return { status: "REJECTED", message: "Candidate rejected." };
  }
}

export async function startSkillChallenge(challengeId: string, candidateId: string) {
  const validChallenge = validUuid(challengeId, "challenge");
  const validCandidate = validUuid(candidateId, "candidate");
  const supabase = getSupabaseAdminClient();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_DURATION_SECONDS * 1000);

  const { data: challenge, error } = await supabase
    .from("skill_challenges")
    .update({
      state: "IN_PROGRESS",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", validChallenge)
    .eq("candidate_id", validCandidate)
    .eq("state", "SENT")
    .select()
    .maybeSingle();

  if (error) handleSupabaseError(error, "Failed to start challenge");
  if (!challenge) {
    throw new ApiError("This challenge cannot be started in its current state.", 409, "INVALID_CHALLENGE_STATE");
  }

  return {
    id: challenge.id,
    state: challenge.state,
    skill: challenge.skill,
    questions: publicQuestions(challenge.questions),
    startedAt: challenge.started_at,
    expiresAt: challenge.expires_at,
  };
}

export async function recordChallengeIntegrity(input: {
  challengeId: string;
  profileId: string;
  events: Array<{
    type: IntegrityEventType;
    severity: "LOW" | "MEDIUM" | "HIGH";
    timestamp?: Date;
    metadata?: Record<string, string | number | boolean>;
  }>;
}) {
  const validChallenge = validUuid(input.challengeId, "challenge");
  const validProfile = validUuid(input.profileId, "profile");
  const supabase = getSupabaseAdminClient();

  const { data: exists } = await supabase
    .from("skill_challenges")
    .select("id")
    .eq("id", validChallenge)
    .eq("candidate_id", validProfile)
    .eq("state", "IN_PROGRESS")
    .maybeSingle();

  if (!exists) throw new ApiError("This challenge can no longer receive integrity events.", 409, "INVALID_CHALLENGE_STATE");

  if (input.events.length > 0) {
    const rows = input.events.map((e) => ({
      target_id: validChallenge,
      target_type: "CHALLENGE",
      profile_id: validProfile,
      type: e.type,
      severity: e.severity,
      timestamp: (e.timestamp ?? new Date()).toISOString(),
      metadata: e.metadata ?? {},
    }));
    await supabase.from("integrity_events").insert(rows);
  }

  const { data: events } = await supabase
    .from("integrity_events")
    .select("type, severity")
    .eq("target_id", validChallenge);

  return integritySummary((events ?? []) as Array<{ type: IntegrityEventType; severity: string }>);
}

export async function submitSkillChallenge(input: {
  challengeId: string;
  candidateId: string;
  answers: Record<string, string>;
  timeout: boolean;
}) {
  const validChallenge = validUuid(input.challengeId, "challenge");
  const validCandidate = validUuid(input.candidateId, "candidate");
  const supabase = getSupabaseAdminClient();

  const { data: challenge, error } = await supabase
    .from("skill_challenges")
    .update({
      state: "COMPLETED",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", validChallenge)
    .eq("candidate_id", validCandidate)
    .eq("state", "IN_PROGRESS")
    .select()
    .maybeSingle();

  if (error) handleSupabaseError(error, "Failed to submit challenge");
  if (!challenge) throw new ApiError("This challenge was already submitted or is unavailable.", 409, "INVALID_CHALLENGE_STATE");

  const expired = !challenge.expires_at || Date.now() > new Date(challenge.expires_at).getTime();
  const answers = expired && !input.timeout ? {} : input.answers;

  const scored = scoreMcq(answers, challenge.questions);

  const { data: events } = await supabase
    .from("integrity_events")
    .select("type, severity")
    .eq("target_id", validChallenge);

  const integrity = integritySummary((events ?? []) as Array<{ type: IntegrityEventType; severity: string }>);

  const finalState = expired ? "EXPIRED" : "COMPLETED";

  await supabase
    .from("skill_challenges")
    .update({
      answers,
      score: scored.percentage,
      integrity_score: integrity.score,
      risk_level: integrity.riskLevel,
      state: finalState,
    })
    .eq("id", validChallenge);

  return {
    id: challenge.id,
    state: finalState,
    skill: challenge.skill,
    score: scored,
    integrity,
    completedAt: challenge.submitted_at ?? new Date().toISOString(),
  };
}

export async function getSkillChallenge(challengeId: string, requesterId: string) {
  const validChallenge = validUuid(challengeId, "challenge");
  const validRequester = validUuid(requesterId, "requester");
  const supabase = getSupabaseAdminClient();

  const { data: challenge, error } = await supabase
    .from("skill_challenges")
    .select(`
      id,
      team_id,
      candidate_id,
      skill,
      state,
      score,
      integrity_score,
      started_at,
      expires_at,
      submitted_at,
      questions,
      teams (
        team_members (
          profile_id,
          status
        )
      )
    `)
    .eq("id", validChallenge)
    .maybeSingle();

  if (error) handleSupabaseError(error, "Failed to load challenge");
  if (!challenge) throw new ApiError("Challenge not found.", 404, "CHALLENGE_NOT_FOUND");

  const teamMembers = (
    (challenge.teams as unknown as { team_members: Array<{ profile_id: string; status: string }> })?.team_members ?? []
  );

  const isCandidate = challenge.candidate_id === validRequester;
  const isOwner = teamMembers.some((m) => m.profile_id === validRequester && m.status === "OWNER");

  if (!isCandidate && !isOwner) {
    throw new ApiError("You cannot view this challenge.", 403, "CHALLENGE_ACCESS_DENIED");
  }

  const { data: events } = await supabase
    .from("integrity_events")
    .select("type, severity")
    .eq("target_id", challenge.id);

  return {
    id: challenge.id,
    teamId: challenge.team_id,
    candidateId: challenge.candidate_id,
    skill: challenge.skill,
    state: challenge.state,
    score: challenge.score,
    integrity: challenge.integrity_score === null ? null : integritySummary((events ?? []) as Array<{ type: IntegrityEventType; severity: string }>),
    startedAt: challenge.started_at ? new Date(challenge.started_at).toISOString() : null,
    expiresAt: challenge.expires_at ? new Date(challenge.expires_at).toISOString() : null,
    submittedAt: challenge.submitted_at ? new Date(challenge.submitted_at).toISOString() : null,
    questions: isCandidate && challenge.state === "IN_PROGRESS" ? publicQuestions(challenge.questions) : undefined,
  };
}
