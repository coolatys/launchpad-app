import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toEmail, candidateName, newMatches } = body;

    if (!toEmail || !newMatches || newMatches.length === 0) {
      return NextResponse.json({ message: 'No new matches to notify, email skipped.' });
    }

    if (!resend) {
      console.warn('RESEND_API_KEY is not configured. Email notification bypassed.');
      return NextResponse.json({ message: 'Resend API key missing, notification bypassed.' });
    }

    const matchItemsHtml = newMatches
      .map(
        (m: any) => `
        <li style="margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
          <strong style="color: #0f172a; font-size: 15px;">${m.title}</strong><br/>
          <span style="color: #475569; font-size: 13px;">${m.org} &bull; ${m.location || 'Remote'}</span><br/>
          <span style="display: inline-block; margin-top: 6px; padding: 2px 8px; background-color: #fef3c7; color: #78350f; font-size: 11px; font-weight: bold; border-radius: 4px;">
            Match Score: ${m.fit_score || 85}%
          </span>
        </li>
      `
      )
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">🚀 New Matches Found on Launchpad!</h2>
        <p style="color: #475569; font-size: 14px;">
          Hi ${candidateName || 'Candidate'},
        </p>
        <p style="color: #475569; font-size: 14px;">
          Our periodic AI web agent just finished scanning and discovered <strong>${newMatches.length} new high-compatibility postings</strong> matching your profile:
        </p>
        <ul style="list-style: none; padding: 0;">
          ${matchItemsHtml}
        </ul>
        <div style="margin-top: 24px; text-align: center;">
          <a href="https://launchpad-app.vercel.app/opportunities" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            View Matches on Launchpad Dashboard
          </a>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Launchpad Agent <onboarding@resend.dev>',
      to: [toEmail],
      subject: `🚀 ${newMatches.length} New Job & Scholarship Matches Discovered`,
      html: htmlContent,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (err: any) {
    console.error('Failed to send Resend email notification:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
