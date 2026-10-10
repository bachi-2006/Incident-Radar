import { supabaseAdmin } from "../src/lib/supabase";

export const DEMO_MEMBERS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    github_login: "rohith-admin",
    display_name: "Rohith D (Admin / Project Lead)",
    role: "maintainer", // Admin / Project Lead with maintainer privileges
    slack_user_id: "U01ROHITHADMIN",
    slack_handle: "@Rohith D",
    expertise: { system_architecture: 5, backend: 4, devops: 5, security: 5 },
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    github_login: "dachepally-frontend",
    display_name: "Dachepally (Frontend Developer)",
    role: "responder",
    slack_user_id: "U02DACHEPALLY",
    slack_handle: "@Dachepally",
    expertise: { frontend: 5, security: 3 },
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    github_login: "nithish-system-designer",
    display_name: "Nithish (System Designer)",
    role: "responder",
    slack_user_id: "U03NITHISHSYS",
    slack_handle: "@Nithish",
    expertise: { system_architecture: 5, backend: 4, database: 4 },
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    github_login: "rahul-backend",
    display_name: "Rahul Verma (Backend Specialist)",
    role: "responder",
    slack_user_id: "U04RAHULBACK",
    slack_handle: "@Rahul",
    expertise: { backend: 5, database: 4 },
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    github_login: "sam-devops",
    display_name: "Sam Taylor (DevOps Specialist)",
    role: "responder",
    slack_user_id: "U05SAMDEVOPS",
    slack_handle: "@Sam",
    expertise: { devops: 5, system_architecture: 4 },
  },
];

export async function seedTeam() {
  console.log("Seeding Incident Radar team members with assigned Slack roles...");
  console.log("  • Rohith D       -> Admin / Project Lead (Maintainer)");
  console.log("  • Dachepally     -> Frontend Developer");
  console.log("  • Nithish        -> System Designer");
  console.log("  • Rahul Verma    -> Backend Specialist");
  console.log("  • Sam Taylor     -> DevOps Specialist");

  if (!supabaseAdmin) {
    console.log("Supabase admin not connected. In-memory demo members available.");
    return DEMO_MEMBERS;
  }

  for (const m of DEMO_MEMBERS) {
    try {
      await (supabaseAdmin as any).from("profiles").upsert({
        id: m.id,
        github_login: m.github_login,
        display_name: m.display_name,
        slack_user_id: m.slack_user_id,
        timezone: "Asia/Kolkata",
        work_start: 9,
        work_end: 19,
        out_of_office: false,
      });

      await (supabaseAdmin as any).from("project_members").upsert({
        project_id: "00000000-0000-0000-0000-000000000002",
        user_id: m.id,
        role: m.role,
      });

      for (const [category, level] of Object.entries(m.expertise)) {
        await (supabaseAdmin as any).from("member_expertise").upsert({
          user_id: m.id,
          category,
          level,
        });
      }
    } catch (e: any) {
      console.warn(`Seed notice for ${m.github_login}:`, e.message);
    }
  }

  console.log("Seeded team successfully into Supabase!");
  return DEMO_MEMBERS;
}

if (process.argv[1]?.includes("seed-team")) {
  seedTeam().then(() => process.exit(0));
}
