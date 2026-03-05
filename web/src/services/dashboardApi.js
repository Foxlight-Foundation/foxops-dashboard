import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Registry', 'Foxmemory'],
  endpoints: (builder) => ({
    getRegistry: builder.query({
      query: () => '/registry',
      providesTags: ['Registry'],
    }),
    getFoxmemoryOverview: builder.query({
      query: () => '/foxmemory/overview',
      providesTags: ['Foxmemory'],
    }),
    killRegistryRun: builder.mutation({
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
