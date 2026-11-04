import type { Metadata } from 'next';
import TrackerView from '@/app/components/tracker/TrackerView';

export const metadata: Metadata = {
  title: 'Site tracker · Command Hub',
};

export default async function TrackerPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return <TrackerView siteId={siteId} />;
}
