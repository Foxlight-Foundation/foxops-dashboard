import { useState, useEffect } from 'react';
import { Box, Button, CardContent, Chip, CircularProgress, Grid, Slider, TextField, Typography } from '@mui/material';
import { GlassCard } from '../shared/styled';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import { useGetCaptureConfigQuery, useSetCaptureConfigMutation, useRevertCaptureConfigMutation } from '../../services/dashboardApi';
import type { FoxMemoryAgentsViewProps } from './FoxMemoryAgentsView.types';

const ModelChip = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>{label}</Typography>
    <Chip label={value || '—'} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
  </Box>
);

const PromptEditor = ({
  label,
  description,
  currentPrompt,
  effectivePrompt,
  source,
  onSave,
}: {
  label: string;
  description: string;
  currentPrompt: string | null;
  effectivePrompt: string | null;
  source: string;
  onSave: (prompt: string | null) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentPrompt ?? effectivePrompt ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editing) setValue(currentPrompt ?? effectivePrompt ?? '');
  }, [currentPrompt, effectivePrompt, editing]);

  const handleEdit = () => {
    setValue(currentPrompt ?? effectivePrompt ?? '');
    setEditing(true);
    setSaved(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(value.trim() || null);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <GlassCard sx={{ borderRadius: 1, mb: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>{label}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{description}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Source: <strong>{source}</strong>
        </Typography>
        <TextField
          multiline
          fullWidth
          minRows={5}
          maxRows={18}
          value={editing ? value : (effectivePrompt ?? currentPrompt ?? '')}
          onChange={(e) => setValue(e.target.value)}
          disabled={!editing}
          size="small"
          sx={{ mb: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: 12 } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {!editing ? (
            <Button variant="outlined" size="small" onClick={handleEdit}>Edit</Button>
          ) : (
            <>
              <Button
                variant="contained"
                size="small"
                disabled={saving}
                onClick={handleSave}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="text" size="small" disabled={saving} onClick={handleCancel}>Cancel</Button>
            </>
          )}
          {saved && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
              <CheckCircleOutlineRoundedIcon fontSize="small" />
              <Typography variant="caption">Saved</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </GlassCard>
  );
};

/**
 * Capture Config Card
 *
 * Controls `capture_message_limit` — the number of recent conversation messages
 * the plugin sends to the memory stack on each capture call. Lower values reduce
 * LLM cost but may miss context; higher values capture more but cost more tokens.
 *
 * - Fetches current value via GET /v2/config/capture
 * - Persists changes via PUT (survives service restarts)
 * - "Revert" clears the persisted override (DELETE), falling back to env var or default
 */
const CaptureConfigCard = () => {
  const { data: captureConfig, isLoading } = useGetCaptureConfigQuery();
  const [setCaptureConfig] = useSetCaptureConfigMutation();
  const [revertCaptureConfig] = useRevertCaptureConfigMutation();

  const currentValue = captureConfig?.data?.capture_message_limit ?? 10;
  const defaultValue = captureConfig?.data?.default ?? 10;
  const source = captureConfig?.data?.source ?? 'unknown';

  const [localValue, setLocalValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync local slider with upstream when data arrives or changes externally
  useEffect(() => {
    if (captureConfig?.data) setLocalValue(captureConfig.data.capture_message_limit);
  }, [captureConfig]);

  const isDirty = localValue !== currentValue;
  const isOverridden = source === 'persisted';

  const handleSave = async () => {
    setSaving(true);
    await setCaptureConfig({ capture_message_limit: localValue }).unwrap();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRevert = async () => {
    setSaving(true);
    await revertCaptureConfig().unwrap();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <GlassCard sx={{ borderRadius: 1, height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Capture Window</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Messages sent per capture call. Lower = cheaper, higher = more context for fact extraction.
        </Typography>
        {isLoading ? (
          <CircularProgress size={20} />
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Slider
                value={localValue}
                onChange={(_, v) => setLocalValue(v as number)}
                min={1}
                max={50}
                step={1}
                valueLabelDisplay="auto"
                sx={{ flex: 1 }}
              />
              <Typography variant="h6" fontWeight={700} sx={{ minWidth: 32, textAlign: 'right' }}>
                {localValue}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                Source: <strong>{source}</strong>
              </Typography>
              {source !== 'default' && (
                <Typography variant="caption" color="text.secondary">
                  · Default: {defaultValue}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                disabled={!isDirty || saving}
                onClick={handleSave}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                {saving ? 'Saving…' : 'Apply'}
              </Button>
              {isOverridden && (
                <Button variant="text" size="small" disabled={saving} onClick={handleRevert}>
                  Revert to default
                </Button>
              )}
              {saved && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                  <CheckCircleOutlineRoundedIcon fontSize="small" />
                  <Typography variant="caption">Saved</Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </GlassCard>
  );
};

const FoxMemoryAgentsView = ({ foxmemory, prompts, promptsLoading, onSaveExtractionPrompt, onSaveUpdatePrompt, onSaveGraphPrompt }: FoxMemoryAgentsViewProps) => (
  <>
    <Grid container spacing={2} mb={2}>
      <Grid item xs={12} md={4}>
        <GlassCard sx={{ borderRadius: 1, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Models</Typography>
            <ModelChip label="LLM" value={foxmemory?.llmModel} />
            <ModelChip label="Embedding" value={foxmemory?.embedModel} />
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>Graph</Typography>
                <Chip
                  label={foxmemory?.diagnostics?.graphEnabled ? 'enabled' : 'disabled'}
                  size="small"
                  sx={{
                    fontSize: 11,
                    bgcolor: foxmemory?.diagnostics?.graphEnabled ? 'rgba(45,206,137,0.15)' : 'action.hover',
                    color: foxmemory?.diagnostics?.graphEnabled ? '#2dce89' : 'text.secondary',
                    fontWeight: 600,
                  }}
                />
              </Box>
              {foxmemory?.diagnostics?.graphEnabled && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>Neo4j</Typography>
                    <Chip
                      label={foxmemory?.diagnostics?.neo4jConnected ? 'connected' : 'disconnected'}
                      size="small"
                      sx={{
                        fontSize: 11,
                        bgcolor: foxmemory?.diagnostics?.neo4jConnected ? 'rgba(45,206,137,0.15)' : 'rgba(245,54,92,0.12)',
                        color: foxmemory?.diagnostics?.neo4jConnected ? '#2dce89' : '#f5365c',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <ModelChip label="Graph LLM" value={foxmemory?.diagnostics?.graphLlmModel} />
                </>
              )}
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
      <Grid item xs={12} md={4}>
        <CaptureConfigCard />
      </Grid>
      <Grid item xs={12} md={4}>
        <GlassCard sx={{ borderRadius: 1, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>About the agent pipeline</Typography>
            <Typography variant="body2" color="text.secondary">
              FoxMemory uses a three-call LLM pipeline for every write. <strong>Call 1</strong> extracts discrete facts from the conversation. <strong>Call 2</strong> decides whether each fact is an ADD, UPDATE, DELETE, or NONE relative to existing memories. <strong>Call 3</strong> extracts entity relationships for the Neo4j knowledge graph (runs only when graph is enabled).
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Editing a prompt and saving will persist it across service restarts. Clear the prompt to revert to the built-in default.
            </Typography>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>

    {promptsLoading && !prompts ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    ) : (
      <>
        <PromptEditor
          label="Call 1 — Fact Extraction"
          description="Extracts discrete, storable facts from a conversation. Runs first on every write."
          currentPrompt={prompts?.extractionPrompt.prompt ?? null}
          effectivePrompt={prompts?.extractionPrompt.effective_prompt ?? null}
          source={prompts?.extractionPrompt.source ?? '—'}
          onSave={onSaveExtractionPrompt}
        />
        <PromptEditor
          label="Call 2 — Update Decision"
          description="Decides ADD / UPDATE / DELETE / NONE for each extracted fact against existing memories."
          currentPrompt={prompts?.updatePrompt.prompt ?? null}
          effectivePrompt={prompts?.updatePrompt.effective_prompt ?? null}
          source={prompts?.updatePrompt.source ?? '—'}
          onSave={onSaveUpdatePrompt}
        />
        <PromptEditor
          label="Call 3 — Graph Entity Extraction"
          description="Extracts entity relationships from conversation for the Neo4j knowledge graph. Runs third on every write when graph is enabled."
          currentPrompt={prompts?.graphPrompt.prompt ?? null}
          effectivePrompt={prompts?.graphPrompt.effective_prompt ?? null}
          source={prompts?.graphPrompt.source ?? '—'}
          onSave={onSaveGraphPrompt}
        />
      </>
    )}
  </>
);

export default FoxMemoryAgentsView;
