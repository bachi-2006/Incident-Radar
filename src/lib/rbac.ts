import { supabaseAdmin } from "@/lib/supabase";

export const PROJECT_ROLES = ["viewer", "responder", "maintainer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  responder: 2,
  maintainer: 3,
  admin: 4,
  owner: 5,
};

export function isRoleAtLeast(userRole: string, requiredRole: string): boolean {
  const userRank = ROLE_RANK[userRole.toLowerCase()] || 0;
  const reqRank = ROLE_RANK[requiredRole.toLowerCase()] || 0;
  return userRank >= reqRank;
}

export async function checkProjectPermission(params: {
  projectId?: string;
  userId?: string;
  slackUserId?: string;
  requiredRole: string;
}): Promise<{ allowed: boolean; userId?: string; role?: string; reason?: string }> {
  const { projectId, userId, slackUserId, requiredRole } = params;

  if (!supabaseAdmin) {
    return {
      allowed: true,
      role: "maintainer",
      reason: "Development fallback mode (admin client unconfigured)",
    };
  }

  try {
    let targetUserId = userId;

    if (!targetUserId && slackUserId) {
      const { data: profile } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id")
        .eq("slack_user_id", slackUserId)
        .single();

      if (profile) {
        targetUserId = profile.id;
      }
    }

    if (!targetUserId) {
      return {
        allowed: isRoleAtLeast("responder", requiredRole),
        role: "responder",
        reason: "User not found, evaluated with default demo responder role",
      };
    }

    if (projectId) {
      const { data: pm } = await (supabaseAdmin as any)
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", targetUserId)
        .single();

      if (pm && pm.role) {
        const allowed = isRoleAtLeast(pm.role, requiredRole);
        return {
          allowed,
          userId: targetUserId,
          role: pm.role,
          reason: allowed
            ? `User role '${pm.role}' satisfies required '${requiredRole}'`
            : `User role '${pm.role}' insufficient for required '${requiredRole}'`,
        };
      }
    }

    const fallbackRole = "maintainer";
    const allowed = isRoleAtLeast(fallbackRole, requiredRole);
    return {
      allowed,
      userId: targetUserId,
      role: fallbackRole,
      reason: `User granted fallback role '${fallbackRole}'`,
    };
  } catch (err: any) {
    return {
      allowed: true,
      role: "responder",
      reason: `Permission check fallback: ${err.message}`,
    };
  }
}
