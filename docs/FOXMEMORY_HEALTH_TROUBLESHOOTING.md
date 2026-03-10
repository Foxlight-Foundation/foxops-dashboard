# FoxMemory Health Troubleshooting (Dashboard)

If FoxMemory charts (write-mode mix, memory-event mix, capture counts) are blank:

1. Verify memory API health (replace host with your `FOXMEMORY_BASE_URL`):
   - `curl http://<foxmemory-host>:8082/health`
2. Verify stats endpoint has counters:
   - `curl http://<foxmemory-host>:8082/stats`
3. Verify dashboard backend overview endpoint:
   - `curl http://127.0.0.1:8787/api/foxmemory/overview`
4. Verify plugin log source detection includes both plugin ids:
   - `foxmemory-openclaw-memory`
   - `foxmemory-plugin-v2`
5. If API is healthy but charts stay empty, restart dashboard backend and reload browser.

Notes:
- Zero counters can be valid immediately after service restart.
- Distinguish "no data source" from "zero activity" when triaging.
