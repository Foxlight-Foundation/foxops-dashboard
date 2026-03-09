import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { SessionsResponse, FoxmemoryResponse, FoxmemoryPromptsResponse, FoxmemoryGraphStats, FoxmemoryGraphData, FoxmemoryGraphSearchResult, FoxmemoryMemorySearchResult, KillArgs, KillResponse, DeleteSessionArgs, DeleteSessionResponse, CronJobsResponse, FoxmemoryModelsResponse, FoxmemoryCatalogResponse, ModelRoleKey, CatalogModel } from '../types';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Sessions', 'Foxmemory', 'Crons', 'FoxmemoryPrompts', 'FoxmemoryGraph', 'FoxmemoryModels'],
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
    getFoxmemoryModels: builder.query<FoxmemoryModelsResponse, void>({
      query: () => '/foxmemory/config/models',
      providesTags: ['FoxmemoryModels'],
    }),
    getFoxmemoryCatalog: builder.query<FoxmemoryCatalogResponse, void>({
      query: () => '/foxmemory/config/models/catalog',
      providesTags: ['FoxmemoryModels'],
    }),
    setFoxmemoryModel: builder.mutation<{ ok: boolean; data: { key: string; value: string; reloaded: boolean } }, { key: ModelRoleKey; value: string }>({
      query: (body) => ({ url: '/foxmemory/config/model', method: 'PUT', body }),
      invalidatesTags: ['FoxmemoryModels'],
    }),
    revertFoxmemoryModel: builder.mutation<{ ok: boolean }, ModelRoleKey>({
      query: (key) => ({ url: `/foxmemory/config/model/${key}`, method: 'DELETE' }),
      invalidatesTags: ['FoxmemoryModels'],
    }),
    addCatalogModel: builder.mutation<{ ok: boolean; data: { model: CatalogModel } }, Omit<CatalogModel, 'created_at'>>({
      query: (body) => ({ url: '/foxmemory/config/models/catalog', method: 'POST', body }),
      invalidatesTags: ['FoxmemoryModels'],
    }),
    updateCatalogModel: builder.mutation<{ ok: boolean; data: { model: CatalogModel } }, Omit<CatalogModel, 'created_at'>>({
      query: ({ id, ...rest }) => ({ url: `/foxmemory/config/models/catalog/${encodeURIComponent(id)}`, method: 'PUT', body: { id, ...rest } }),
      invalidatesTags: ['FoxmemoryModels'],
    }),
    deleteCatalogModel: builder.mutation<{ ok: boolean; data: { deleted: string } }, string>({
      query: (id) => ({ url: `/foxmemory/config/models/catalog/${encodeURIComponent(id)}`, method: 'DELETE' }),
      invalidatesTags: ['FoxmemoryModels'],
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
    searchFoxmemoryGraph: builder.mutation<{ ok: boolean; data: FoxmemoryGraphSearchResult }, { query: string }>({
      query: (body) => ({ url: '/foxmemory/graph/search', method: 'POST', body }),
    }),
    searchFoxmemoryMemories: builder.mutation<{ ok: boolean; data: FoxmemoryMemorySearchResult }, { query: string; top_k?: number }>({
      query: (body) => ({ url: '/foxmemory/memories/search', method: 'POST', body }),
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
  useGetFoxmemoryModelsQuery,
  useGetFoxmemoryCatalogQuery,
  useSetFoxmemoryModelMutation,
  useRevertFoxmemoryModelMutation,
  useAddCatalogModelMutation,
  useUpdateCatalogModelMutation,
  useDeleteCatalogModelMutation,
  useSetFoxmemoryExtractionPromptMutation,
  useSetFoxmemoryUpdatePromptMutation,
  useSetFoxmemoryGraphPromptMutation,
  useSearchFoxmemoryGraphMutation,
  useSearchFoxmemoryMemoriesMutation,
  useGetCronsQuery,
  useKillSessionMutation,
  useDeleteSessionMutation,
} = dashboardApi;
