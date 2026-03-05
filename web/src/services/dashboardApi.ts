import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { SessionsResponse, FoxmemoryResponse, KillArgs, KillResponse, DeleteSessionArgs, DeleteSessionResponse, CronJobsResponse } from '../types';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Sessions', 'Foxmemory', 'Crons'],
  endpoints: (builder) => ({
    getSessions: builder.query<SessionsResponse, void>({
      query: () => '/sessions',
      providesTags: ['Sessions'],
    }),
    getFoxmemoryOverview: builder.query<FoxmemoryResponse, void>({
      query: () => '/foxmemory/overview',
      providesTags: ['Foxmemory'],
    }),
    getCrons: builder.query<CronJobsResponse, void>({
      query: () => '/crons',
      providesTags: ['Crons'],
    }),
    killSession: builder.mutation<KillResponse, KillArgs>({
      query: ({ sessionKey, sessionId, reason }) => ({
        url: '/sessions/kill',
        method: 'POST',
        body: { sessionKey, sessionId, reason },
      }),
      invalidatesTags: ['Sessions'],
    }),
    deleteSession: builder.mutation<DeleteSessionResponse, DeleteSessionArgs>({
      query: ({ sessionKey, sessionId }) => ({
        url: '/sessions/delete',
        method: 'POST',
        body: { sessionKey, sessionId },
      }),
      invalidatesTags: ['Sessions'],
    }),
  }),
});

export const {
  useGetSessionsQuery,
  useGetFoxmemoryOverviewQuery,
  useGetCronsQuery,
  useKillSessionMutation,
  useDeleteSessionMutation,
} = dashboardApi;
