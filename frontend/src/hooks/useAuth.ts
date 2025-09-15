import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useCurrentUser() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await api.getCurrentUser();
      } catch (error: any) {
        // If we get a 401, clear the invalid token
        if (error?.status === 401) {
          localStorage.removeItem('access_token');
          queryClient.clear();
        }
        throw error;
      }
    },
    retry: false,
    enabled: !!localStorage.getItem('access_token'),
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent excessive refetching
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.login,
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token);
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.register,
    onSuccess: () => {
      // Registration successful, user can now login
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem('access_token');
    queryClient.clear(); // Clear all queries
  };
}