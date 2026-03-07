import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { SessionsResponse, FoxmemoryResponse, FoxmemoryPromptsResponse, FoxmemoryGraphStats, FoxmemoryGraphData, KillArgs, KillResponse, DeleteSessionArgs, DeleteSessionResponse, CronJobsResponse } from '../types';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Sessions', 'Foxmemory', 'Crons', 'FoxmemoryPrompts', 'FoxmemoryGraph'],
  endpoints: (builder) => ({
    getSessions: builder.query<SessionsResponse, void>({
      query: () => '/sessions',
      providesTags: ['Sessions'],
    }),
    getFoxmemoryOverview: builder.query<FoxmemoryResponse, void>({
      query: () => '/foxmemory/overview',
      providesTags: ['Foxmemory'],
    }),
    getFoxmemoryPrompts: builder.query<FoxmemoryPromptsResponse, void>({
      query: () => '/foxmemory/prompts',
      providesTags: ['FoxmemoryPrompts'],
    }),
    getFoxmemoryGraphStats: builder.query<{ ok: boolean; data: FoxmemoryGraphStats }, void>({
      query: () => '/foxmemory/graph-stats',
      providesTags: ['FoxmemoryGraph'],
    }),
    getFoxmemoryGraphData: builder.query<{ ok: boolean; data: FoxmemoryGraphData }, void>({
      query: () => '/foxmemory/graph-data',
      providesTags: ['FoxmemoryGraph'],
    }),
    setFoxmemoryExtractionPrompt: builder.mutation<{ ok: boolean }, { prompt: string | null }>({
      query: (body) => ({ url: '/foxmemory/config/prompt', method: 'PUT', body }),
      invalidatesTags: ['FoxmemoryPrompts'],
    }),
    setFoxmemoryUpdatePrompt: builder.mutation<{ ok: boolean }, { prompt: string | null }>({
      query: (body) => ({ url: '/foxmemory/config/update-prompt', method: 'PUT', body }),
      invalidatesTags: ['FoxmemoryPrompts'],
    }),
    setFoxmemoryGraphPrompt: builder.mutation<{ ok: boolean }, { prompt: string | null }>({
      query: (body) => ({ url: '/foxmemory/config/graph-prompt', method: 'PUT', body }),
      invalidatesTags: ['FoxmemoryPrompts'],
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
  useGetFoxmemoryPromptsQuery,
  useGetFoxmemoryGraphStatsQuery,
  useGetFoxmemoryGraphDataQuery,
  useSetFoxmemoryExtractionPromptMutation,
  useSetFoxmemoryUpdatePromptMutation,
  useSetFoxmemoryGraphPromptMutation,
  useGetCronsQuery,
  useKillSessionMutation,
  useDeleteSessionMutation,
} = dashboardApi;
