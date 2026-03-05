import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RegistryResponse, FoxmemoryResponse, KillArgs, KillResponse } from '../types';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Registry', 'Foxmemory'],
  endpoints: (builder) => ({
    getRegistry: builder.query<RegistryResponse, void>({
      query: () => '/registry',
      providesTags: ['Registry'],
    }),
    getFoxmemoryOverview: builder.query<FoxmemoryResponse, void>({
      query: () => '/foxmemory/overview',
      providesTags: ['Foxmemory'],
    }),
    killRegistryRun: builder.mutation<KillResponse, KillArgs>({
      query: ({ runId, childSessionKey, reason }) => ({
        url: '/registry/kill',
        method: 'POST',
        body: { runId, childSessionKey, reason },
      }),
      invalidatesTags: ['Registry', 'Foxmemory'],
    }),
  }),
});

export const {
  useGetRegistryQuery,
  useGetFoxmemoryOverviewQuery,
  useKillRegistryRunMutation,
} = dashboardApi;
