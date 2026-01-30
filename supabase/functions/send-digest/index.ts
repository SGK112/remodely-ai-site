// Supabase Edge Function: Daily Email Digest
// Sends personalized email digests via Resend for users with email notifications enabled

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Task definitions for the playbook (matches launch-playbook.html)
const TASK_SECTIONS = {
  prelaunch: "Pre-Launch Checklist",
  launch: "Launch Week",
  pipeline: "Weeks 2-4: Build Pipeline",
  scale: "Months 2-3: Scale What Works",
  goals: "90-Day Success Criteria",
};

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  notification_preferences: {
    enableEmailDigest?: boolean;
    digestTime?: string;
    digestTimezone?: string;
  };
  timezone: string;
}

interface Task {
  task_id: string;
  completed: boolean;
  due_date: string | null;
  due_time: string | null;
}

interface Goal {
  goal_key: string;
  value: string;
}

serve(async (req) => {
  try {
    // Initialize Supabase client with service role for full access
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get current hour in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();

    // Fetch all users with email digest enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .not("notification_preferences->enableEmailDigest", "is", null);

    if (profilesError) throw profilesError;

    const results: { email: string; status: string; error?: string }[] = [];

    for (const profile of profiles || []) {
      const prefs = profile.notification_preferences || {};

      // Check if digest is enabled
      if (!prefs.enableEmailDigest) continue;

      // Check if it's the right time for this user
      const digestHour = parseInt(prefs.digestTime || "9");
      const timezone = prefs.digestTimezone || profile.timezone || "America/Phoenix";

      // Convert user's preferred hour to UTC
      const userTime = new Date(
        now.toLocaleString("en-US", { timeZone: timezone })
      );
      const offsetHours = (now.getTime() - userTime.getTime()) / 3600000;
      const targetUTCHour = (digestHour + Math.round(offsetHours)) % 24;

      // Skip if not the right hour
      if (currentHour !== targetUTCHour) continue;

      try {
        // Fetch user's tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", profile.id);

        // Fetch user's goals
        const { data: goals } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", profile.id);

        // Calculate stats
        const today = now.toISOString().split("T")[0];
        const completedTasks = (tasks || []).filter((t) => t.completed).length;
        const totalTasks = 65; // Total tasks in playbook
        const progressPercent = Math.round((completedTasks / totalTasks) * 100);

        const tasksDueToday = (tasks || []).filter(
          (t) => !t.completed && t.due_date === today
        );
        const overdueTasks = (tasks || []).filter(
          (t) => !t.completed && t.due_date && t.due_date < today
        );

        // Parse goals
        const goalsMap: Record<string, string> = {};
        (goals || []).forEach((g) => {
          goalsMap[g.goal_key] = g.value;
        });

        // Generate email HTML
        const emailHtml = generateDigestEmail({
          name: profile.full_name || profile.email.split("@")[0],
          completedTasks,
          totalTasks,
          progressPercent,
          tasksDueToday: tasksDueToday.length,
          overdueTasks: overdueTasks.length,
          goals: goalsMap,
        });

        // Send email via Resend
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Remodely AI <playbook@remodely.ai>",
            to: profile.email,
            subject: `Launch Playbook: ${progressPercent}% Complete${
              overdueTasks.length > 0 ? ` (${overdueTasks.length} overdue)` : ""
            }`,
            html: emailHtml,
          }),
        });

        const resendData = await resendResponse.json();

        // Log the digest
        await supabase.from("email_digest_log").insert({
          user_id: profile.id,
          tasks_due_count: tasksDueToday.length,
          overdue_count: overdueTasks.length,
          progress_percentage: progressPercent,
          email_status: resendResponse.ok ? "sent" : "failed",
          error_message: resendResponse.ok ? null : JSON.stringify(resendData),
        });

        results.push({
          email: profile.email,
          status: resendResponse.ok ? "sent" : "failed",
          error: resendResponse.ok ? undefined : JSON.stringify(resendData),
        });
      } catch (userError: any) {
        results.push({
          email: profile.email,
          status: "error",
          error: userError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

interface DigestData {
  name: string;
  completedTasks: number;
  totalTasks: number;
  progressPercent: number;
  tasksDueToday: number;
  overdueTasks: number;
  goals: Record<string, string>;
}

function generateDigestEmail(data: DigestData): string {
  const {
    name,
    completedTasks,
    totalTasks,
    progressPercent,
    tasksDueToday,
    overdueTasks,
    goals,
  } = data;

  const customersActual = parseInt(goals["customers-actual"] || "0");
  const customersTarget = parseInt(goals["customers-target"] || "10");
  const mrrActual = parseInt(goals["mrr-actual"] || "0");
  const mrrTarget = parseInt(goals["mrr-target"] || "3000");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Launch Playbook Daily Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                Launch Playbook
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Daily Progress Digest
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <p style="margin: 0; font-size: 16px; color: #334155;">
                Good morning, <strong>${name}</strong>! Here's your launch progress:
              </p>
            </td>
          </tr>

          <!-- Progress Bar -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background: #e2e8f0; border-radius: 999px; height: 12px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #6366f1, #34a853); height: 100%; width: ${progressPercent}%; border-radius: 999px;"></div>
              </div>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b; text-align: center;">
                <strong style="color: #0f172a;">${completedTasks}</strong> of ${totalTasks} tasks completed (${progressPercent}%)
              </p>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 0 8px 0 0;">
                    <div style="background: ${tasksDueToday > 0 ? "#fefce8" : "#f0fdf4"}; border: 1px solid ${tasksDueToday > 0 ? "#fef08a" : "#bbf7d0"}; border-radius: 12px; padding: 20px; text-align: center;">
                      <div style="font-size: 32px; font-weight: 700; color: ${tasksDueToday > 0 ? "#ca8a04" : "#16a34a"};">${tasksDueToday}</div>
                      <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Due Today</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 0 0 0 8px;">
                    <div style="background: ${overdueTasks > 0 ? "#fef2f2" : "#f0fdf4"}; border: 1px solid ${overdueTasks > 0 ? "#fecaca" : "#bbf7d0"}; border-radius: 12px; padding: 20px; text-align: center;">
                      <div style="font-size: 32px; font-weight: 700; color: ${overdueTasks > 0 ? "#dc2626" : "#16a34a"};">${overdueTasks}</div>
                      <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Overdue</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Goals Section -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <h3 style="margin: 0 0 16px; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Goal Progress</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 14px; color: #334155;">Paying Customers</span>
                      <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${customersActual} / ${customersTarget}</span>
                    </div>
                    <div style="background: #e2e8f0; border-radius: 999px; height: 6px; margin-top: 8px; overflow: hidden;">
                      <div style="background: ${customersActual >= customersTarget ? "#34a853" : "#6366f1"}; height: 100%; width: ${Math.min(100, (customersActual / customersTarget) * 100)}%; border-radius: 999px;"></div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 14px; color: #334155;">Monthly Recurring Revenue</span>
                      <span style="font-size: 14px; font-weight: 600; color: #0f172a;">$${mrrActual.toLocaleString()} / $${mrrTarget.toLocaleString()}</span>
                    </div>
                    <div style="background: #e2e8f0; border-radius: 999px; height: 6px; margin-top: 8px; overflow: hidden;">
                      <div style="background: ${mrrActual >= mrrTarget ? "#34a853" : "#6366f1"}; height: 100%; width: ${Math.min(100, (mrrActual / mrrTarget) * 100)}%; border-radius: 999px;"></div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <a href="https://remodely.ai/launch-playbook.html" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">
                Open Playbook
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                You're receiving this because you enabled daily digests.
                <a href="https://remodely.ai/launch-playbook.html" style="color: #6366f1;">Manage preferences</a>
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Remodely AI LLC
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
