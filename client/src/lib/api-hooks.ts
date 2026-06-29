import { useQuery, useMutation } from '@tanstack/react-query';
import type { MagicSquareData } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  dateOfBirth: string;
  mobile: string | null;
  createdAt: string;
}

export function useListEmployees() {
  return useQuery<Employee[]>({
    queryKey: ['/api/employees'],
    queryFn: () => apiFetch('/api/employees'),
  });
}

export function useCreateEmployee(options?: {
  mutation?: { onSuccess?: (data: Employee) => void; onError?: (err: Error) => void };
}) {
  return useMutation<Employee, Error, { data: Partial<Employee> }>({
    mutationFn: ({ data }) => apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: options?.mutation?.onSuccess,
    onError: options?.mutation?.onError,
  });
}

export function useDeleteEmployee(options?: {
  mutation?: { onSuccess?: () => void };
}) {
  return useMutation<void, Error, { id: number }>({
    mutationFn: ({ id }) => apiFetch(`/api/employees/${id}`, { method: 'DELETE' }),
    onSuccess: options?.mutation?.onSuccess,
  });
}

export function useGenerateCard(options?: {
  mutation?: { onSuccess?: (data: MagicSquareData) => void };
}) {
  return useMutation<MagicSquareData, Error, { data: { name: string; dateOfBirth: string } }>({
    mutationFn: ({ data }) =>
      apiFetch('/api/generate-card', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: options?.mutation?.onSuccess,
  });
}
