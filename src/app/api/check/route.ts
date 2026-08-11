import { NextResponse } from 'next/server';
import { runDiscoveryAgent } from '@/lib/agent';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';
const checkSecret = process.env.CHECK_SECRET || '';

// Initialize Resend client if key is present
let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

export async function POST(request: Request) {
  try {
    // 1. Verify check secret token auth header
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!checkSecret || token !== checkSecret) {
      return NextResponse.json({ error: 'Unauthorized access. Invalid or missing secret token.' }, { status: 401 });
    }

    // 2. Run crawler discovery agent
    const result = await runDiscoveryAgent();

    // 3. Compile digest if high-fit matches (score >= 65) exist
    // 3. Compile digest if high-fit matches (score >= 65) exist
    if (result.highFitOpportunities.length > 0) {
      // NOTE: For a multi-tenant cron job, this should ideally loop over all users
      // and run discovery agent per user, sending tailored emails.
      // For now, we'll fetch the first active profile or loop profiles.
      const { data: profiles } = await supabaseAdmin
        .from('profile')
        .select('name, contact')
        .limit(1);
      
      const profile = profiles?.[0];

      let recipientEmail = 'your.email@example.com';
      if (profile && profile.contact) {
        // Attempt to extract email address from contact string (e.g. "email@example.com | 123-456")
        const emailMatch = profile.contact.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        if (emailMatch) {
          recipientEmail = emailMatch[1];
        } else {
          recipientEmail = profile.contact;
        }
      }

      const highFitCount = result.highFitOpportunities.length;
      const dateString = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // HTML template in Navy and Gold
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px border #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background-color: #1F3864; color: #ffffff; padding: 30px; text-align: center; border-bottom: 4px solid #E0A02E; }
    .header h1 { margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px; }
    .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.85; }
    .content { padding: 30px; }
    .summary-text { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 25px; }
    .job-card { background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #E0A02E; }
    .job-title { font-size: 18px; font-weight: bold; color: #1F3864; margin: 0 0 5px 0; }
    .job-meta { font-size: 13px; font-weight: 600; color: #475569; margin: 0 0 10px 0; }
    .job-meta span { color: #94a3b8; font-weight: normal; }
    .job-score { display: inline-block; background-color: #fef3c7; color: #b45309; font-size: 12px; font-weight: bold; padding: 3px 8px; border-radius: 6px; margin-bottom: 12px; border: 1px solid rgba(224, 160, 46, 0.2); }
    .job-reasons { margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.5; }
    .job-reasons li { margin-bottom: 4px; }
    .button-container { text-align: center; margin-top: 15px; }
    .apply-btn { display: inline-block; background-color: #1F3864; color: #ffffff !important; font-weight: bold; font-size: 13px; text-decoration: none; padding: 8px 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(31, 56, 100, 0.1); }
    .footer { background-color: #0f172a; color: #94a3b8; text-align: center; padding: 20px; font-size: 11px; }
    .footer a { color: #E0A02E; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Launchpad Opportunities Digest</h1>
      <p>${dateString}</p>
    </div>
    <div class="content">
      <p class="summary-text">
        Hello <strong>${profile?.name || 'Candidate'}</strong>,<br/>
        Our discovery agent has scanned your active search feeds and detected <strong>${highFitCount} new opportunities</strong> that align with your profile requirements (Fit Score &ge; 65):
      </p>

      ${result.highFitOpportunities.map((opp) => `
        <div class="job-card">
          <div class="job-title">${opp.title}</div>
          <div class="job-meta">${opp.org} &bull; <span>${opp.location}</span></div>
          <div class="job-score">Gemini Fit Score: ${opp.fit_score}%</div>
          <ul class="job-reasons">
            ${(opp.fit_reasons || '').split('\n').filter(Boolean).map(r => `<li>${r}</li>`).join('')}
          </ul>
          <div class="button-container">
            <a href="${opp.url}" class="apply-btn" target="_blank">View Posting Details</a>
          </div>
        </div>
      `).join('')}

      <p class="summary-text" style="margin-top: 25px;">
        Head over to your local dashboard to shortlist these positions, draft customized resume achievement bullets, and generate tailored cover letters.
      </p>
    </div>
    <div class="footer">
      <p>Launchpad Personal Agent &bull; Powered by Google Gemini Flash & Supabase</p>
      <p>Configure searches on your local <a href="#">Launchpad Dashboard</a></p>
    </div>
  </div>
</body>
</html>
`;

      if (resend) {
        try {
          await resend.emails.send({
            from: 'Launchpad Agent <onboarding@resend.dev>', // Resend free tier sandbox domain
            to: recipientEmail,
            subject: `🚀 [Launchpad] ${highFitCount} New High-Fit Opportunities Found`,
            html: emailHtml,
          });
          console.log(`Digest email successfully sent to ${recipientEmail}`);
        } catch (emailErr) {
          console.error('Failed to send email via Resend API:', emailErr);
        }
      } else {
        console.warn('Resend API key is missing. Skipping email delivery. Summary of matches printed to server logs.');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Discovery crawl complete.',
      discovered: result.newDiscovered,
      highFitMatches: result.highFitOpportunities.length,
    });

  } catch (err: any) {
    console.error('Error executing automated check:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
