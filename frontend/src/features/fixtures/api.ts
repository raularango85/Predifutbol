import { request } from '../../services/apiClient';
import type { Fixture, FixtureFilter, SyncFixtureRequest, SyncFixtureResponse } from './types';

export async function searchFixtures(filter: FixtureFilter = {}): Promise<Fixture[]> {
  const params = new URLSearchParams();
  if (filter.query) params.set('q', filter.query);
  if (filter.date) params.set('date', filter.date);
  if (filter.upcomingOnly !== undefined) params.set('upcomingOnly', String(filter.upcomingOnly));
  if (filter.limit) params.set('limit', String(filter.limit));

  const url = `/api/fixtures?${params.toString()}`;
  const data = await request<{ results: Fixture[] }>(url);
  return data.results || [];
}

export async function syncFixtures(req: SyncFixtureRequest = {}): Promise<SyncFixtureResponse> {
  return request<SyncFixtureResponse>('/api/fixtures/sync', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
