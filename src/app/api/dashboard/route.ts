import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileFilter = searchParams.get('profile') || 'all'; // 'all', 'user', 'friend'

    // Fetch all opportunities to perform client-side filtering and mapping
    const { data: opportunities, error: oppsError } = await supabaseAdmin
      .from('opportunities')
      .select('*');

    if (oppsError) throw new Error(oppsError.message);

    // Fetch all applications
    const { data: applications, error: appsError } = await supabaseAdmin
      .from('applications')
      .select('*');

    if (appsError) throw new Error(appsError.message);

    // Build opportunity map for quick lookup
    const oppMap = new Map<string, any>();
    opportunities?.forEach((opp) => oppMap.set(opp.id, opp));

    // Helper to determine owner of an opportunity
    const getOwner = (opp: any) => {
      if (!opp || !opp.dedupe_key) return 'user';
      if (opp.dedupe_key.startsWith('friend:')) return 'friend';
      return 'user'; // default to user
    };

    // Filter opportunities by profile
    const filteredOpps = opportunities?.filter((opp) => {
      const owner = getOwner(opp);
      if (profileFilter === 'all') return true;
      return owner === profileFilter;
    }) || [];

    // Filter applications by profile
    const filteredApps = applications?.filter((app) => {
      const opp = oppMap.get(app.opportunity_id);
      const owner = getOwner(opp);
      if (profileFilter === 'all') return true;
      return owner === profileFilter;
    }) || [];

    // 1. Calculate new matches count
    const newMatchesCount = filteredOpps.filter((opp) => opp.status === 'new').length;

    // 2. Applied counts and status breakdown from applications
    const appliedStatuses = ['submitted', 'interview', 'offer'];
    let jobsAppliedCount = 0;
    let scholarshipsAppliedCount = 0;

    const statusBreakdown = {
      to_apply: 0,
      drafted: 0,
      submitted: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };

    filteredApps.forEach((app) => {
      const statusKey = app.status as keyof typeof statusBreakdown;
      if (statusBreakdown[statusKey] !== undefined) {
        statusBreakdown[statusKey]++;
      }

      if (appliedStatuses.includes(app.status)) {
        if (app.kind === 'job') {
          jobsAppliedCount++;
        } else if (app.kind === 'scholarship') {
          scholarshipsAppliedCount++;
        }
      }
    });

    // 3. Find upcoming deadlines in next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const upcomingDeadlines: any[] = [];

    const checkDeadline = (item: any, sourceTable: 'opportunity' | 'application') => {
      if (!item.deadline || item.deadline === 'N/A') return;
      const parsedDate = Date.parse(item.deadline);
      if (isNaN(parsedDate)) return;
      const deadlineDate = new Date(parsedDate);

      if (deadlineDate >= now && deadlineDate <= thirtyDaysFromNow) {
        upcomingDeadlines.push({
          id: item.id,
          title: item.title,
          org: item.org,
          kind: item.kind,
          url: item.url,
          deadline: item.deadline,
          daysLeft: Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          source: sourceTable,
        });
      }
    };

    // Parse opportunities that are active ('new' or 'shortlisted') and match profile
    filteredOpps
      .filter((opp) => ['new', 'shortlisted'].includes(opp.status))
      .forEach((opp) => checkDeadline(opp, 'opportunity'));

    // Parse applications
    filteredApps.forEach((app) => checkDeadline(app, 'application'));

    // Sort deadlines: soonest first
    upcomingDeadlines.sort((a, b) => a.daysLeft - b.daysLeft);

    return NextResponse.json({
      scholarshipsAppliedCount,
      jobsAppliedCount,
      newMatchesCount,
      statusBreakdown,
      upcomingDeadlines: upcomingDeadlines.slice(0, 10),
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

