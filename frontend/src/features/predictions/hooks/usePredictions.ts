import { useState, useCallback, useEffect } from 'react';
import { predictionsApi } from '../api';
import type { Prediction, CheckAllResult } from '../types';

export function usePredictions(initialPage = 1, initialLimit = 10) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checker service state
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkSummary, setCheckSummary] = useState<CheckAllResult | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictionsApi.list(page, limit, search);
      setPredictions(data.predictions);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar predicciones');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const deletePrediction = useCallback(async (id: number) => {
    try {
      await predictionsApi.delete(id);
      await fetchPredictions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      return false;
    }
  }, [fetchPredictions]);

  const settlePrediction = useCallback(async (id: number, homeGoals: number, awayGoals: number) => {
    try {
      const res = await predictionsApi.settle(id, homeGoals, awayGoals);
      await fetchPredictions();
      return res.result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar pronóstico');
      return null;
    }
  }, [fetchPredictions]);

  const checkAllPredictions = useCallback(async () => {
    setCheckingAll(true);
    setError(null);
    try {
      const res = await predictionsApi.checkAll();
      setCheckSummary(res.summary);
      setSummaryModalOpen(true);
      await fetchPredictions();
      return res.summary;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar predicciones');
      return null;
    } finally {
      setCheckingAll(false);
    }
  }, [fetchPredictions]);

  const closeSummaryModal = useCallback(() => {
    setSummaryModalOpen(false);
  }, []);

  return {
    predictions,
    total,
    totalPages,
    page,
    limit,
    search,
    loading,
    error,
    checkingAll,
    checkSummary,
    summaryModalOpen,
    setPage,
    setLimit,
    setSearch,
    refetch: fetchPredictions,
    deletePrediction,
    settlePrediction,
    checkAllPredictions,
    closeSummaryModal,
  };
}
