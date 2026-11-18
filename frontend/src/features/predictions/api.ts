import { request } from '../../services/apiClient';
import type { Prediction, PredictionListResult, SavePredictionDTO, SettleResult, CheckAllResult } from './types';

export const predictionsApi = {
  list: (page = 1, limit = 10, search = '') => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search.trim(),
    });
    return request<PredictionListResult>(`/api/predictions?${params.toString()}`);
  },

  getById: (id: number) => {
    return request<{ success: boolean; prediction: Prediction }>(`/api/predictions/${id}`);
  },

  save: (data: SavePredictionDTO) => {
    return request<{ success: boolean; prediction: Prediction }>('/api/predictions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number) => {
    return request<{ success: boolean }>(`/api/predictions/${id}`, {
      method: 'DELETE',
    });
  },

  settle: (id: number, homeGoals: number, awayGoals: number) => {
    return request<{ success: boolean; result: SettleResult }>(`/api/predictions/${id}/settle`, {
      method: 'POST',
      body: JSON.stringify({ home_goals: homeGoals, away_goals: awayGoals }),
    });
  },

  checkAll: () => {
    return request<{ success: boolean; summary: CheckAllResult }>('/api/predictions/check-all', {
      method: 'POST',
    });
  },
};
