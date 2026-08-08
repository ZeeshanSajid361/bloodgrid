/**
 * Custom hooks — seeker dashboard data.
 *
 * useSeekerRequests  — fetches GET /api/seekers/requests/mine
 * useCompatibility   — fetches GET /api/seekers/compatibility for a blood group
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

// ── useSeekerRequests ──────────────────────────────────────────────────────
export function useSeekerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [total,    setTotal]    = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/seekers/requests/mine?limit=50');
      setRequests(data.data.requests);
      setTotal(data.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { requests, loading, error, total, refetch: fetch };
}

// ── useDonorSearch ──────────────────────────────────────────────────────────
export function useDonorSearch() {
  const [results,       setResults]       = useState(null);     // null = not yet searched
  const [hospitalStock, setHospitalStock] = useState([]);
  const [summary,       setSummary]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const search = useCallback(async (patientBloodGroup, city) => {
    setLoading(true);
    setError('');
    setResults(null);
    setHospitalStock([]);
    try {
      const params = new URLSearchParams({ patientBloodGroup });
      if (city) params.set('city', city);

      const { data } = await api.get(`/seekers/search?${params.toString()}`);
      setResults(data.data.results || []);
      setHospitalStock(data.data.hospitalStock || []);
      setSummary(data.data.compatibilitySummary);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, hospitalStock, summary, loading, error, search };
}
