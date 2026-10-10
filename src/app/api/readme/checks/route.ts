import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { validateWorkatoAuth, unauthorizedResponse } from "@/lib/workato-auth";
import { checkStructural, computeSha256 } from "../../../../../readme-checker";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const auth = validateWorkatoAuth(req);
    if (!auth.authorized) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json().catch(() => ({}));
    const { project_id = "00000000-0000-0000-0000-000000000002", repository_id, trigger = "manual", commit_sha = "head" } = body;

    const readmePath = path.join(process.cwd(), "README.md");
    let readmeText = "";
    if (fs.existsSync(readmePath)) {
      readmeText = fs.readFileSync(readmePath, "utf-8");
    }

    const structural = checkStructural(readmeText);
    const readmeHash = computeSha256(readmeText);
    const checkId = `rdm_${Date.now()}`;

    const repoFacts = {
      languages: { TypeScript: 85, SQL: 15 },
      dependencies: ["next", "react", "@supabase/supabase-js", "recharts"],
      top_dirs: ["src", "supabase", "assignment-engine", "readme-checker", "workato"],
      routes: ["/api/policy/decide", "/api/actions/execute", "/api/verify", "/api/readme/checks"],
      workato_usage: true,
    };

    const needsGenie = structural.exists && structural.problem_heading && structural.solution_heading;

    if (supabaseAdmin) {
      try {
        await (supabaseAdmin as any).from("readme_checks").insert({
          id: checkId,
          project_id,
          repository_id,
          commit_sha,
          trigger,
          readme_sha256: readmeHash,
          structural,
          repo_facts: repoFacts,
          verdict: needsGenie ? "pending" : "fail",
          score: needsGenie ? null : 0,
        });
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({
      check_id: checkId,
      project_id,
      structural,
      needs_genie: needsGenie,
      readme_text: readmeText.substring(0, 15000),
      repo_facts: repoFacts,
      checked_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to initiate README check" }, { status: 500 });
  }
}
