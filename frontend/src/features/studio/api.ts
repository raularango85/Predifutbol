import { request } from '../../services/apiClient';
import type { Team, League, TypePrediction, EngineStatus } from './types';

export const studioApi = {
  searchTeams: (query: string, limit = 25) => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return request<{ results: Team[] }>(`/api/teams?${params.toString()}`);
  },

  searchLeagues: (query: string, limit = 30) => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return request<{ results: League[] }>(`/api/leagues?${params.toString()}`);
  },

  getTypePredictions: () => {
    return request<{ results: TypePrediction[] }>('/api/type-predictions');
  },

  getStatus: () => {
    return request<EngineStatus>('/api/status');
  },

  getLocalization: (lang: 'es' | 'en') => {
    return request<Record<string, string>>(`/api/localize/${lang}`);
  },
};
