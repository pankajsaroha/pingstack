import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/server/admin-auth';
import { runTestSuite, runAllAutomatedSuites, getAllLatestResults } from '@/lib/server/admin-tests/test-runner';
import { TestSuiteType } from '@/lib/server/admin-tests/types';

export async function GET(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse) return errorResponse;

  try {
    const results = await getAllLatestResults();
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('[Admin Test Center GET] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch test results' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { admin, errorResponse } = await verifyAdminApi(req);
  if (errorResponse || !admin) return errorResponse;

  try {
    const body = await req.json();
    const { suiteId, dryRun = true, customRecipient, customPrompt } = body;

    if (!suiteId) {
      return NextResponse.json({ error: 'Missing required field "suiteId"' }, { status: 400 });
    }

    if (suiteId === 'all_automated') {
      const results = await runAllAutomatedSuites(admin.email, admin.id);
      return NextResponse.json({
        success: true,
        suiteId: 'all_automated',
        results,
        allPassed: results.every((r) => r.status === 'passed'),
      });
    }

    const result = await runTestSuite({
      suiteId: suiteId as TestSuiteType,
      adminEmail: admin.email,
      adminUserId: admin.id,
      dryRun: Boolean(dryRun),
      customRecipient,
      customPrompt,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('[Admin Test Center Run] Error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to execute test suite' }, { status: 500 });
  }
}
