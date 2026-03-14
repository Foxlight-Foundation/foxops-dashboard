import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { SessionsResponse, FoxmemoryResponse, FoxmemoryPromptsResponse, FoxmemoryGraphStats, FoxmemoryGraphData, FoxmemoryGraphSearchResult, FoxmemoryMemorySearchResult, KillArgs, KillResponse, DeleteSessionArgs, DeleteSessionResponse, CronJobsResponse, CronRunsResponse, FoxmemoryModelsResponse, FoxmemoryCatalogResponse, ModelRoleKey, CatalogModel, TenantRecord, AgentRecord } from '../types';

const withAgent = (path: string, agentId?: string) =>
  agentId ? `${path}${path.includes('?') ? '&' : '?'}agentId=${agentId}` : path;

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Sessions', 'Foxmemory', 'Crons', 'FoxmemoryPrompts', 'FoxmemoryGraph', 'FoxmemoryModels', 'Tenants', 'Agents'],
  endpoints: (builder) => ({
    getSessions: builder.query<SessionsResponse, void>({
      query: () => '/sessions',
      providesTags: ['Sessions'],
    }),
    getTenants: builder.query<{ ok: boolean; data: TenantRecord[] }, void>({
      query: () => '/tenants',
      providesTags: ['Tenants'],
    }),
    getAgents: builder.query<{ ok: boolean; data: AgentRecord[] }, string>({
      query: (tenantId) => `/tenants/${tenantId}/agents`,
      providesTags: (_, __, tenantId) => [{ type: 'Agents' as const, id: tenantId }],
    }),
    getFoxmemoryOverview: builder.query<FoxmemoryResponse, string | undefined>({
      query: (agentId) => withAgent('/foxmemory/overview', agentId),
      providesTags: (_, __, agentId) => [{ type: 'Foxmemory' as const, id: agentId ?? 'GLOBAL' }],
    }),
    getFoxmemoryPrompts: builder.query<FoxmemoryPromptsResponse, string | undefined>({
      query: (agentId) => withAgent('/foxmemory/prompts', agentId),
      providesTags: (_, __, agentId) => [{ type: 'FoxmemoryPrompts' as const, id: agentId ?? 'GLOBAL' }],
    }),
    getFoxmemoryGraphStats: builder.query<{ ok: boolean; data: FoxmemoryGraphStats }, string | undefined>({
      query: (agentId) => withAgent('/foxmemory/graph-stats', agentId),
      providesTags: (_, __, agentId) => [{ type: 'FoxmemoryGraph' as const, id: agentId ?? 'GLOBAL' }],
    }),
    getFoxmemoryGraphData: builder.query<{ ok: boolean; data: FoxmemoryGraphData }, string | undefined>({
      query: (agentId) => withAgent('/foxmemory/graph-data', agentId),
      providesTags: (_, __, agentId) => [{ type: 'FoxmemoryGraph' as const, id: agentId ?? 'GLOBAL' }],
    }),
    getFoxmemoryModels: builder.query<FoxmemoryModelsResponse, string | undefined>({
      query: (agentId) => withAgent('/foxmemory/config/models', agentId),
      providesTags: (_, __, agentId) => [{ type: 'FoxmemoryModels' as const, id: agentId ?? 'GLOBAL' }],
    }),
    getFoxmemoryCatalog: builder.query<FoxmemoryCatalogResponse, string | undefined>({
      query: (agentId) => withAgent('/foxmemory/config/models/catalog', agentId),
      providesTags: (_, __, agentId) => [{ type: 'FoxmemoryModels' as const, id: agentId ?? 'GLOBAL' }],
    }),
    setFoxmemoryModel: builder.mutation<{ ok: boolean; data: { key: string; value: string; reloaded: boolean } }, { key: ModelRoleKey; value: string; agentId?: string }>({
      query: ({ key, value, agentId }) => ({ url: withAgent('/foxmemory/config/model', agentId), method: 'PUT', body: { key, value } }),
      invalidatesTags: (_, __, { agentId }) => [{ type: 'FoxmemoryModels' as const, id: agentId ?? 'GLOBAL' }],
    }),
    revertFoxmemoryModel: builder.mutation<{ ok: boolean }, { key: ModelRoleKey; agentId?: string }>({
      query: ({ key, agentId }) => ({ url: withAgent(`/foxmemory/config/model/${key}`, agentId), method: 'DELETE' }),
      invalidatesTags: (_, __, { agentId }) => [{ type: 'FoxmemoryModels' as const, id: agentId ?? 'GLOBAL' }],
    }),
    addCatalogModel: builder.mutation<{ ok: boolean; data: { model: CatalogModel } }, Omit<CatalogModel, 'created_at'> & { agentId?: string }>({
      query: ({ agentId, ...body }) => ({ url: withAgent('/foxmemory/config/models/catalog', agentId), method: 'POST', body }),
      invalidatesTags: (_, __, { agentId }) => [{ type: 'FoxmemoryModels' as const, id: agentId ?? 'GLOBAL' }],
    }),
    updateCatalogModel: builder.mutation<{ ok: boolean; data: { model: CatalogModel } }, Omit<CatalogModel, 'created_at'> & { agentId?: string }>({
      query: ({ id, agentId, ...rest }) => ({ url: withAgent(`/foxmemory/config/models/catalog/${encodeURIComponent(id)}`, agentId), method: 'PUT', body: { id, ...rest } }),
      invalidatesTags: (_, __, { agentId }) => [{ type: 'FoxmemoryModels' as const, id: agentId ?? 'GLOBAL' }],
    }),
    deleteCatalogModel: builder.mutation<{ ok: boolean; data: { deleted: string } }, { id: string; agentId?: string }>({
      query: ({ id, agentId }) => ({ url: withAgent(`/foxmemory/config/models/catalog/${encodeURIComponent(id)}`, agentId), method: 'DELETE' }),
      invalidatesTags: (_, __, { agentId }) => [{ type: 'FoxmemoryModels' as const, id: agentId ?? 'GLOBAL' }],
    }),
    setFoxmemoryExtractionPrompt: builder.mutation<{ ok: boolean }, { prompt: string | null; agentId?: string }>({
      query: ({ prompt, agentId }) => ({ url: withAgent('/foxmemory/config/prompt', agentId), method: 'PUT', body: { prompt } }),
      invalidatesTags: (_, __, { agentId }) => [{ type: 'FoxmemoryPrompts' as const, id: agentId ?? 'GLOBAL' }],
    }),
    setFoxmemoryUpdatePrompt: builder.mutation<{ ok: boolean }, { prompt: string | null; agentId?: string }>({
      query: ({ prompt, agentId }) => ({ url: withAgent('/foxmemory/config/update-prompt', agentId), method: 'PUT', body: { prompt } }),
      invalidatesTags: (_, __, { agentId }) => [{ type: 'FoxmemoryPrompts' as const, id: agentId ?? 'GLOBAL' }],
    }),
    setFoxmemoryGraphPrompt: builder.mutation<{ ok: boolean }, { prompt: string | null; agentId?: string }>({
      query: ({ prompt, agentId }) => ({ url: withAgent('/foxmemory/config/graph-prompt', agentId), method: 'PUT', body: { prompt } }),
      invalidatesTags: (_, __, { agentId }) => [{ type: 'FoxmemoryPrompts' as const, id: agentId ?? 'GLOBAL' }],
    }),
    searchFoxmemoryGraph: builder.mutation<{ ok: boolean; data: FoxmemoryGraphSearchResult }, { query: string; agentId?: string }>({
      query: ({ query, agentId }) => ({ url: withAgent('/foxmemory/graph/search', agentId), method: 'POST', body: { query } }),
    }),
    searchFoxmemoryMemories: builder.mutation<{ ok: boolean; data: FoxmemoryMemorySearchResult }, { query: string; top_k?: number; agentId?: string }>({
      query: ({ query, top_k, agentId }) => ({ url: withAgent('/foxmemory/memories/search', agentId), method: 'POST', body: { query, top_k } }),
    }),
    getCrons: builder.query<CronJobsResponse, void>({
      query: () => '/crons',
      providesTags: ['Crons'],
    }),
    getCronRuns: builder.query<CronRunsResponse, { id: string; limit?: number }>({
      query: ({ id, limit = 20 }) => `/crons/${id}/runs?limit=${limit}`,
    }),
    runCronJob: builder.mutation<{ ok: boolean; ran: boolean; reason: string | null }, string>({
      query: (id) => ({ url: `/crons/${id}/run`, method: 'POST' }),
      invalidatesTags: ['Crons'],
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
  useGetTenantsQuery,
  useGetAgentsQuery,
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
  useGetCronRunsQuery,
  useRunCronJobMutation,
  useKillSessionMutation,
  useDeleteSessionMutation,
} = dashboardApi;
