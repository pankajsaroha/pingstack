import { NextResponse } from 'next/server';
import { getOnboardingMetrics } from '@/lib/server/onboarding-telemetry';

export async function GET() {
  try {
    const metrics = await getOnboardingMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (err: any) {
    console.error('Failed to get onboarding metrics:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
