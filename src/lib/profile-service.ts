import { z } from "zod";
import { ApiError, isDuplicateKeyError } from "@/lib/api";
import { getSupabaseAdminClient, handleSupabaseError, requireValidUuid } from "@/lib/supabase/admin";
import { serializeProfile } from "@/lib/serializers";

const urlSchema = z.string().url().max(500);
const skillName = z.string().trim().min(2).max(80);

export const createProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/, "Use 3–32 lowercase letters, numbers, or underscores."),
  headline: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(100).optional().default(""),
  bio: z.string().trim().max(1200).optional().default(""),
});

export const profilePatchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1200).optional(),
  location: z.string().trim().max(100).optional(),
  education: z.string().trim().max(160).optional(),
  availableForTeams: z.boolean().optional(),
});

export const skillSchema = z.object({ name: skillName });
export const projectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(1200),
  url: urlSchema.optional().or(z.literal("")),
  skills: z.array(skillName).max(10).default([]),
});
export const evidenceSchema = z.object({
  source: z.enum(["GITHUB", "LEETCODE", "CODECHEF", "HACKERRANK", "OTHER"]),
  url: urlSchema,
  description: z.string().trim().min(4).max(500),
  skills: z.array(skillName).max(10).default([]),
});

function validProfileId(id: string): string {
  return requireValidUuid(id, "profile");
}

interface RawProfile {
  id: string;
  supabase_id?: string | null;
  display_name: string;
  email: string;
  handle: string;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  education?: string | null;
  available_for_teams?: boolean | null;
  user_skills?: Array<{
    id: string;
    name: string;
    normalized_name: string;
    status: string;
    assessment_score?: number | null;
    evidence_count: number;
    last_assessment_at?: string | null;
  }>;
  projects?: Array<{
    id: string;
    title: string;
    description: string;
    url?: string | null;
    skills: string[];
  }>;
  evidence?: Array<{
    id: string;
    source: string;
    url: string;
    description: string;
    skills: string[];
  }>;
}

export function formatProfileRecord(raw: RawProfile) {
  return serializeProfile({
    id: raw.id,
    displayName: raw.display_name,
    email: raw.email,
    handle: raw.handle,
    headline: raw.headline,
    bio: raw.bio,
    location: raw.location,
    education: raw.education,
    availableForTeams: raw.available_for_teams ?? true,
    skills: (raw.user_skills ?? []).map((s) => ({
      name: s.name,
      normalizedName: s.normalized_name,
      status: s.status,
      assessmentScore: s.assessment_score ?? undefined,
      evidenceCount: s.evidence_count ?? 0,
      lastAssessmentAt: s.last_assessment_at ? new Date(s.last_assessment_at) : undefined,
    })),
    projects: (raw.projects ?? []).map((p) => ({
      _id: p.id,
      id: p.id,
      title: p.title,
      description: p.description,
      url: p.url ?? undefined,
      skills: p.skills ?? [],
    })),
    evidence: (raw.evidence ?? []).map((e) => ({
      _id: e.id,
      id: e.id,
      source: e.source,
      url: e.url,
      description: e.description,
      skills: e.skills ?? [],
    })),
  });
}

const PROFILE_FULL_SELECT = `
  id,
  supabase_id,
  display_name,
  email,
  handle,
  headline,
  bio,
  location,
  education,
  available_for_teams,
  created_at,
  updated_at,
  user_skills (
    id,
    name,
    normalized_name,
    status,
    assessment_score,
    evidence_count,
    last_assessment_at
  ),
  projects (
    id,
    title,
    description,
    url,
    skills
  ),
  evidence (
    id,
    source,
    url,
    description,
    skills
  )
`;

export async function createProfile(input: z.infer<typeof createProfileSchema> & { supabaseId?: string }) {
  const supabase = getSupabaseAdminClient();

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      display_name: input.displayName,
      email: input.email.toLowerCase(),
      handle: input.handle.toLowerCase(),
      headline: input.headline ?? "",
      location: input.location ?? "",
      bio: input.bio ?? "",
      supabase_id: input.supabaseId || null,
      available_for_teams: true,
    })
    .select(PROFILE_FULL_SELECT)
    .single();

  if (insertError) {
    if (isDuplicateKeyError(insertError) || insertError.code === "23505") {
      throw new ApiError("That email or handle already belongs to an existing profile.", 409, "PROFILE_CONFLICT");
    }
    handleSupabaseError(insertError, "Failed to create profile");
  }

  return formatProfileRecord(newProfile as unknown as RawProfile);
}

export async function findUserForSupabaseAuth(supabaseId: string, email?: string) {
  const supabase = getSupabaseAdminClient();
  const normEmail = email?.trim().toLowerCase();

  // 1. Find by supabase_id
  const { data: bySupabaseId, error: err1 } = await supabase
    .from("profiles")
    .select(PROFILE_FULL_SELECT)
    .eq("supabase_id", supabaseId)
    .maybeSingle();

  if (err1) handleSupabaseError(err1, "Failed to find profile by Supabase ID");
  if (bySupabaseId) {
    return formatProfileRecord(bySupabaseId as unknown as RawProfile);
  }

  // 2. Link by email if exists
  if (normEmail) {
    const { data: byEmail, error: err2 } = await supabase
      .from("profiles")
      .select(PROFILE_FULL_SELECT)
      .eq("email", normEmail)
      .maybeSingle();

    if (err2) handleSupabaseError(err2, "Failed to find profile by email");
    if (byEmail) {
      const { data: updated, error: updateErr } = await supabase
        .from("profiles")
        .update({ supabase_id: supabaseId })
        .eq("id", byEmail.id)
        .select(PROFILE_FULL_SELECT)
        .single();

      if (updateErr) handleSupabaseError(updateErr, "Failed to link Supabase ID to profile");
      return formatProfileRecord(updated as unknown as RawProfile);
    }
  }

  return null;
}

export async function findOrCreateUserForSupabaseAuth(input: {
  supabaseId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}) {
  const normEmail = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim() || normEmail.split("@")[0] || "Candidate";

  const existing = await findUserForSupabaseAuth(input.supabaseId, normEmail);
  if (existing) {
    return existing;
  }

  const supabase = getSupabaseAdminClient();
  const baseHandle = (normEmail.split("@")[0] || "candidate")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 24);
  let handle = baseHandle.length >= 3 ? baseHandle : `${baseHandle}_dev`;
  let suffix = 1;

  while (true) {
    const { data: handleExists } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();

    if (!handleExists) break;
    handle = `${baseHandle.slice(0, 20)}_${suffix++}`;
  }

  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      supabase_id: input.supabaseId,
      display_name: displayName,
      email: normEmail,
      handle,
      headline: "",
      location: "",
      bio: "",
      available_for_teams: true,
    })
    .select(PROFILE_FULL_SELECT)
    .single();

  if (error) {
    handleSupabaseError(error, "Failed to auto-create profile");
  }

  return formatProfileRecord(newProfile as unknown as RawProfile);
}

export async function getOwnProfile(profileId: string) {
  const validId = validProfileId(profileId);
  const supabase = getSupabaseAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_FULL_SELECT)
    .eq("id", validId)
    .maybeSingle();

  if (error) handleSupabaseError(error, "Failed to load profile");
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");

  return formatProfileRecord(profile as unknown as RawProfile);
}

export async function updateOwnProfile(profileId: string, input: z.infer<typeof profilePatchSchema>) {
  const validId = validProfileId(profileId);
  const supabase = getSupabaseAdminClient();

  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.headline !== undefined) patch.headline = input.headline;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.location !== undefined) patch.location = input.location;
  if (input.education !== undefined) patch.education = input.education;
  if (input.availableForTeams !== undefined) patch.available_for_teams = input.availableForTeams;

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", validId)
    .select(PROFILE_FULL_SELECT)
    .single();

  if (error) handleSupabaseError(error, "Failed to update profile");
  if (!updated) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");

  return formatProfileRecord(updated as unknown as RawProfile);
}

export async function addSkill(profileId: string, name: string) {
  const validId = validProfileId(profileId);
  const supabase = getSupabaseAdminClient();
  const trimmedName = name.trim();
  const normalizedName = trimmedName.toLowerCase();

  // Check if profile exists
  const { data: profileExists } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", validId)
    .maybeSingle();
  if (!profileExists) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");

  const { error: insertError } = await supabase
    .from("user_skills")
    .insert({
      profile_id: validId,
      name: trimmedName,
      normalized_name: normalizedName,
      status: "CLAIMED",
      evidence_count: 0,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new ApiError("That skill is already claimed.", 409, "SKILL_EXISTS");
    }
    handleSupabaseError(insertError, "Failed to add skill");
  }

  return getOwnProfile(validId);
}

export async function removeSkill(profileId: string, name: string) {
  const validId = validProfileId(profileId);
  const supabase = getSupabaseAdminClient();
  const normalizedName = name.trim().toLowerCase();

  const { data: deleted, error } = await supabase
    .from("user_skills")
    .delete()
    .eq("profile_id", validId)
    .eq("normalized_name", normalizedName)
    .select("id");

  if (error) handleSupabaseError(error, "Failed to remove skill");
  if (!deleted || deleted.length === 0) {
    throw new ApiError("Skill not found.", 404, "SKILL_NOT_FOUND");
  }

  return getOwnProfile(validId);
}

export async function addProject(profileId: string, input: z.infer<typeof projectSchema>) {
  const validId = validProfileId(profileId);
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("projects")
    .insert({
      profile_id: validId,
      title: input.title,
      description: input.description,
      url: input.url || null,
      skills: input.skills ?? [],
    });

  if (error) handleSupabaseError(error, "Failed to add project");
  return getOwnProfile(validId);
}

export async function removeProject(profileId: string, projectId: string) {
  const validProfile = validProfileId(profileId);
  const validProjId = requireValidUuid(projectId, "project");
  const supabase = getSupabaseAdminClient();

  const { data: deleted, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", validProjId)
    .eq("profile_id", validProfile)
    .select("id");

  if (error) handleSupabaseError(error, "Failed to remove project");
  if (!deleted || deleted.length === 0) {
    throw new ApiError("Project not found.", 404, "PROJECT_NOT_FOUND");
  }

  return getOwnProfile(validProfile);
}

export async function addEvidence(profileId: string, input: z.infer<typeof evidenceSchema>) {
  const validId = validProfileId(profileId);
  const supabase = getSupabaseAdminClient();

  const { error: insertEvidenceError } = await supabase
    .from("evidence")
    .insert({
      profile_id: validId,
      source: input.source,
      url: input.url,
      description: input.description,
      skills: input.skills ?? [],
    });

  if (insertEvidenceError) handleSupabaseError(insertEvidenceError, "Failed to add evidence");

  for (const claimedName of input.skills) {
    const trimmed = claimedName.trim();
    const normalized = trimmed.toLowerCase();

    const { data: existingSkill } = await supabase
      .from("user_skills")
      .select("id, evidence_count")
      .eq("profile_id", validId)
      .eq("normalized_name", normalized)
      .maybeSingle();

    if (existingSkill) {
      await supabase
        .from("user_skills")
        .update({ evidence_count: (existingSkill.evidence_count ?? 0) + 1 })
        .eq("id", existingSkill.id);
    } else {
      await supabase
        .from("user_skills")
        .insert({
          profile_id: validId,
          name: trimmed,
          normalized_name: normalized,
          status: "PARTIALLY_VERIFIED",
          evidence_count: 1,
        });
    }
  }

  return getOwnProfile(validId);
}

export async function removeEvidence(profileId: string, evidenceId: string) {
  const validProfile = validProfileId(profileId);
  const validEvId = requireValidUuid(evidenceId, "evidence");
  const supabase = getSupabaseAdminClient();

  const { data: deleted, error } = await supabase
    .from("evidence")
    .delete()
    .eq("id", validEvId)
    .eq("profile_id", validProfile)
    .select("id");

  if (error) handleSupabaseError(error, "Failed to remove evidence");
  if (!deleted || deleted.length === 0) {
    throw new ApiError("Evidence not found.", 404, "EVIDENCE_NOT_FOUND");
  }

  return getOwnProfile(validProfile);
}

export async function publicProfile(profileId: string) {
  const validId = validProfileId(profileId);
  const profile = await getOwnProfile(validId);
  const safe = { ...profile };
  delete (safe as { email?: string }).email;
  return safe;
}

export async function publicProfileByHandle(handle: string) {
  const normalizedHandle = handle.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(normalizedHandle)) {
    throw new ApiError("Skill Passport not found.", 404, "PROFILE_NOT_FOUND");
  }

  const supabase = getSupabaseAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_FULL_SELECT)
    .eq("handle", normalizedHandle)
    .maybeSingle();

  if (error) handleSupabaseError(error, "Failed to query profile by handle");
  if (!profile) throw new ApiError("Skill Passport not found.", 404, "PROFILE_NOT_FOUND");

  const safe = formatProfileRecord(profile as unknown as RawProfile);
  delete (safe as { email?: string }).email;
  return safe;
}
