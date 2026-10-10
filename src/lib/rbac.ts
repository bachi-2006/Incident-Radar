import { supabaseAdmin } from "@/lib/supabase";

export const PROJECT_ROLES = ["viewer", "responder", "maintainer", "admin", "owner"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  responder: 2,
  maintainer: 3,
  admin: 4,
  owner: 5,
};

// Canonical Roster Role Mapping for fast, reliable resolution
const CANONICAL_ROSTER_ROLES: Record<string, { name: string; role: ProjectRole }> = {
  "U0C9380GASU": { name: "Rohith D", role: "admin" },
  "U0C846MT30D": { name: "Dachepally", role: "maintainer" },
  "U0C7TNSNS5D": { name: "Nithish gajjela", role: "maintainer" },
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
  const { projectId = "proj_demo", userId, slackUserId, requiredRole } = params;

  // Fail-closed: Anonymous or missing user identification is strictly denied
  if (!userId && !slackUserId) {
    return {
      allowed: false,
      reason: "Access denied: Missing user identification (userId or slackUserId required)",
    };
  }

  // 1. Check Canonical Roster by Slack ID first (prevents outage or misconfiguration bypass)
  if (slackUserId && CANONICAL_ROSTER_ROLES[slackUserId]) {
    const member = CANONICAL_ROSTER_ROLES[slackUserId];
    const allowed = isRoleAtLeast(member.role, requiredRole);
    return {
      allowed,
      userId: slackUserId,
      role: member.role,
      reason: allowed
        ? `Authorized: Team member '${member.name}' has role '${member.role}' which satisfies '${requiredRole}'`
        : `Denied: Team member '${member.name}' role '${member.role}' is insufficient for required '${requiredRole}'`,
    };
  }

  // 2. Query Supabase Directory if available
  if (supabaseAdmin) {
    try {
      let targetUserId = userId;

      if (!targetUserId && slackUserId) {
        const { data: profile } = await (supabaseAdmin as any)
          .from("profiles")
          .select("id, role")
          .eq("slack_user_id", slackUserId)
          .single();

        if (profile) {
          targetUserId = profile.id;
          if (profile.role) {
            const allowed = isRoleAtLeast(profile.role, requiredRole);
            return {
              allowed,
              userId: targetUserId,
              role: profile.role,
              reason: allowed
                ? `Authorized via profile role '${profile.role}'`
                : `Denied: Profile role '${profile.role}' insufficient for required '${requiredRole}'`,
            };
          }
        }
      }

      if (targetUserId) {
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
              ? `Authorized via project membership role '${pm.role}'`
              : `Denied: Project member role '${pm.role}' insufficient for required '${requiredRole}'`,
          };
        }
      }
    } catch (err: any) {
      // Fail closed on database error
      return {
        allowed: false,
        reason: `Authorization failed due to directory query error: ${err.message}`,
      };
    }
  }

  // Fail closed when user cannot be resolved to a valid role
  return {
    allowed: false,
    reason: `Access denied: User '${userId || slackUserId}' not found in authorized roster or project members`,
  };
}
