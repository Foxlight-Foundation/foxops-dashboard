import { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Grid, TextField, Typography } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
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
    <Card sx={{ borderRadius: 1, mb: 2 }}>
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
          value={editing ? value : (effectivePrompt ?? '')}
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
    </Card>
  );
};

const FoxMemoryAgentsView = ({ foxmemory, prompts, promptsLoading, onSaveExtractionPrompt, onSaveUpdatePrompt }: FoxMemoryAgentsViewProps) => (
  <>
    <Grid container spacing={2} mb={2}>
      <Grid item xs={12} md={4}>
        <Card sx={{ borderRadius: 1, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Models</Typography>
            <ModelChip label="LLM" value={foxmemory?.llmModel} />
            <ModelChip label="Embedding" value={foxmemory?.embedModel} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card sx={{ borderRadius: 1, height: '100%' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>About the agent pipeline</Typography>
            <Typography variant="body2" color="text.secondary">
              FoxMemory uses a two-call LLM pipeline for every write. <strong>Call 1</strong> extracts discrete facts from the conversation. <strong>Call 2</strong> decides whether each fact is an ADD, UPDATE, DELETE, or NONE relative to existing memories.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Editing a prompt and saving will persist it across service restarts. Clear the prompt to revert to the built-in default.
            </Typography>
          </CardContent>
        </Card>
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
      </>
    )}
  </>
);

export default FoxMemoryAgentsView;
