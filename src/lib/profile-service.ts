import mongoose from "mongoose";
import { z } from "zod";
import { User } from "@/models/User";
import { ApiError, isDuplicateKeyError } from "@/lib/api";
import { isDatabaseConnected } from "@/lib/mongodb";
import {
  memoryAddEvidence,
  memoryAddProject,
  memoryAddSkill,
  memoryCreateProfile,
  memoryFindUserBySupabaseOrEmail,
  memoryGetOwnProfile,
  memoryPublicProfile,
  memoryPublicProfileByHandle,
  memoryRemoveEvidence,
  memoryRemoveProject,
  memoryRemoveSkill,
  memoryUpdateOwnProfile,
} from "@/lib/memory-store";
import { serializeProfile } from "@/lib/serializers";

const urlSchema = z.string().url().max(500);
const skillName = z.string().trim().min(2).max(80);
export const createProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/, "Use 3–32 lowercase letters, numbers, or underscores."),
  headline: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(100).optional().default(""),
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
export const projectSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().min(10).max(1200), url: urlSchema.optional().or(z.literal("")), skills: z.array(skillName).max(10).default([]) });
export const evidenceSchema = z.object({ source: z.enum(["GITHUB", "LEETCODE", "CODECHEF", "HACKERRANK", "OTHER"]), url: urlSchema, description: z.string().trim().min(4).max(500), skills: z.array(skillName).max(10).default([]) });

function validId(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  return id;
}

export async function createProfile(input: z.infer<typeof createProfileSchema>) {
  if (!isDatabaseConnected()) {
    return memoryCreateProfile(input);
  }
  try {
    const profile = await User.create({ ...input, skills: [], projects: [], evidence: [] });
    return serializeProfile(profile);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ApiError("That email or handle already belongs to a local profile.", 409, "PROFILE_CONFLICT");
    throw error;
  }
}

export async function findOrCreateUserForSupabaseAuth(input: {
  supabaseId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}) {
  const normEmail = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim() || normEmail.split("@")[0] || "Candidate";

  if (!isDatabaseConnected()) {
    const existing = memoryFindUserBySupabaseOrEmail(input.supabaseId, normEmail);
    if (existing) {
      existing.supabaseId = input.supabaseId;
      if (!existing.displayName || existing.displayName === "Candidate") {
        existing.displayName = displayName;
      }
      return serializeProfile(existing);
    }

    const baseHandle = (normEmail.split("@")[0] || "candidate")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 20);
    const handle = `${baseHandle.length >= 3 ? baseHandle : "user"}_${Math.floor(1000 + Math.random() * 9000)}`;

    return memoryCreateProfile({
      displayName,
      email: normEmail,
      handle,
      headline: "",
      location: "",
    });
  }

  // 1. Check if user already exists with this supabaseId
  let user = await User.findOne({ supabaseId: input.supabaseId });
  if (user) {
    return serializeProfile(user);
  }

  // 2. Check if user exists with matching email (e.g. from prior local profile)
  if (normEmail) {
    user = await User.findOne({ email: normEmail });
    if (user) {
      user.supabaseId = input.supabaseId;
      await user.save();
      return serializeProfile(user);
    }
  }

  // 3. Create new user in MongoDB
  const baseHandle = (normEmail.split("@")[0] || "candidate")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 24);
  let handle = baseHandle.length >= 3 ? baseHandle : `${baseHandle}_dev`;
  let suffix = 1;
  while (await User.exists({ handle })) {
    handle = `${baseHandle.slice(0, 20)}_${suffix++}`;
  }

  const newUser = await User.create({
    supabaseId: input.supabaseId,
    displayName,
    email: normEmail,
    handle,
    skills: [],
    projects: [],
    evidence: [],
    availableForTeams: true,
  });

  return serializeProfile(newUser);
}

export async function getOwnProfile(profileId: string) {
  if (!isDatabaseConnected()) {
    return memoryGetOwnProfile(profileId);
  }
  const profile = await User.findById(validId(profileId)).lean();
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  return serializeProfile(profile);
}

export async function updateOwnProfile(profileId: string, input: z.infer<typeof profilePatchSchema>) {
  if (!isDatabaseConnected()) {
    return memoryUpdateOwnProfile(profileId, input);
  }
  const profile = await User.findByIdAndUpdate(validId(profileId), { $set: input }, { new: true, runValidators: true }).lean();
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  return serializeProfile(profile);
}

export async function addSkill(profileId: string, name: string) {
  if (!isDatabaseConnected()) {
    return memoryAddSkill(profileId, name);
  }
  const profile = await User.findById(validId(profileId));
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  const normalizedName = name.trim().toLowerCase();
  if (profile.skills.some((skill) => skill.normalizedName === normalizedName)) throw new ApiError("That skill is already claimed.", 409, "SKILL_EXISTS");
  profile.skills.push({ name: name.trim(), normalizedName, status: "CLAIMED", evidenceCount: 0 });
  await profile.save();
  return serializeProfile(profile);
}

export async function removeSkill(profileId: string, name: string) {
  if (!isDatabaseConnected()) {
    return memoryRemoveSkill(profileId, name);
  }
  const profile = await User.findById(validId(profileId));
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  const normalizedName = name.trim().toLowerCase();
  const removeIndex = profile.skills.findIndex((skill) => skill.normalizedName === normalizedName);
  if (removeIndex < 0) throw new ApiError("Skill not found.", 404, "SKILL_NOT_FOUND");
  profile.skills.splice(removeIndex, 1);
  await profile.save();
  return serializeProfile(profile);
}

export async function addProject(profileId: string, input: z.infer<typeof projectSchema>) {
  if (!isDatabaseConnected()) {
    return memoryAddProject(profileId, input);
  }
  const profile = await User.findById(validId(profileId));
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  profile.projects.push({ ...input, url: input.url || undefined });
  await profile.save();
  return serializeProfile(profile);
}

export async function removeProject(profileId: string, projectId: string) {
  if (!isDatabaseConnected()) {
    return memoryRemoveProject(profileId, projectId);
  }
  const profile = await User.findById(validId(profileId));
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  profile.projects.pull({ _id: validId(projectId) });
  await profile.save();
  return serializeProfile(profile);
}

export async function addEvidence(profileId: string, input: z.infer<typeof evidenceSchema>) {
  if (!isDatabaseConnected()) {
    return memoryAddEvidence(profileId, input);
  }
  const profile = await User.findById(validId(profileId));
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  profile.evidence.push(input);
  for (const claimedName of input.skills) {
    const normalizedName = claimedName.toLowerCase();
    const existing = profile.skills.find((skill) => skill.normalizedName === normalizedName);
    if (existing) existing.evidenceCount += 1;
    else profile.skills.push({ name: claimedName, normalizedName, status: "PARTIALLY_VERIFIED", evidenceCount: 1 });
  }
  await profile.save();
  return serializeProfile(profile);
}

export async function removeEvidence(profileId: string, evidenceId: string) {
  if (!isDatabaseConnected()) {
    return memoryRemoveEvidence(profileId, evidenceId);
  }
  const profile = await User.findById(validId(profileId));
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  profile.evidence.pull({ _id: validId(evidenceId) });
  await profile.save();
  return serializeProfile(profile);
}

export async function publicProfile(profileId: string) {
  if (!isDatabaseConnected()) {
    return memoryPublicProfile(profileId);
  }
  const profile = await User.findById(validId(profileId)).lean();
  if (!profile) throw new ApiError("Candidate not found.", 404, "PROFILE_NOT_FOUND");
  const safe = serializeProfile(profile);
  delete safe.email;
  return safe;
}

export async function publicProfileByHandle(handle: string) {
  if (!isDatabaseConnected()) {
    return memoryPublicProfileByHandle(handle);
  }
  const normalizedHandle = handle.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(normalizedHandle)) throw new ApiError("Skill Passport not found.", 404, "PROFILE_NOT_FOUND");
  const profile = await User.findOne({ handle: normalizedHandle }).lean();
  if (!profile) throw new ApiError("Skill Passport not found.", 404, "PROFILE_NOT_FOUND");
  const safe = serializeProfile(profile);
  delete safe.email;
  return safe;
}

