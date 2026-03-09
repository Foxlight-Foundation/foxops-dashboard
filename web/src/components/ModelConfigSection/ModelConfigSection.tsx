import { useState } from 'react';
import { Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, FormControl, FormControlLabel, IconButton, MenuItem, Select, TextField, Typography } from '@mui/material';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useGetFoxmemoryModelsQuery, useGetFoxmemoryCatalogQuery, useSetFoxmemoryModelMutation, useRevertFoxmemoryModelMutation, useAddCatalogModelMutation, useUpdateCatalogModelMutation, useDeleteCatalogModelMutation } from '../../services/dashboardApi';
import type { CatalogModel, ModelRoleKey } from '../../types';

const fmtCost = (v?: number | null) => v == null ? '—' : `$${v.toFixed(3)}`;

const PricingRow = ({ label, value }: { label: string; value?: number | null }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{label}</Typography>
    <Typography variant="caption" sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>{fmtCost(value)}/MTok</Typography>
  </Box>
);

interface ModelCardProps {
  title: string;
  icon: React.ReactNode;
  roleKey: ModelRoleKey;
  role: 'llm' | 'graph_llm';
  currentValue: string;
  source: 'env' | 'persisted';
  catalogModel: CatalogModel | null;
  catalog: CatalogModel[];
  onApply: (key: ModelRoleKey, value: string) => Promise<void>;
  onRevert: (key: ModelRoleKey) => Promise<void>;
  saving: boolean;
}

const ModelCard = ({ title, icon, roleKey, role, currentValue, source, catalogModel, catalog, onApply, onRevert, saving }: ModelCardProps) => {
  const eligible = catalog.filter((m) => m.roles.includes(role));
  const [selected, setSelected] = useState(
    eligible.find((m) => m.id === currentValue)?.id ?? (eligible[0]?.id ?? '')
  );
  const [confirming, setConfirming] = useState(false);
  const isDirty = selected !== currentValue && eligible.some((m) => m.id === currentValue)
    ? selected !== currentValue
    : eligible.some((m) => m.id === selected) && selected !== currentValue;
  const selectedMeta = eligible.find((m) => m.id === selected);

  return (
    <Card sx={{ borderRadius: 1, flex: 1 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          <Chip
            label={source}
            size="small"
            sx={{
              ml: 'auto',
              fontSize: 10,
              height: 18,
              fontWeight: 700,
              bgcolor: source === 'persisted' ? 'rgba(94,114,228,0.12)' : 'rgba(0,0,0,0.06)',
              color: source === 'persisted' ? '#5e72e4' : 'text.secondary',
              border: source === 'persisted' ? '1px solid rgba(94,114,228,0.3)' : '1px solid transparent',
            }}
          />
        </Box>

        {/* Current effective value */}
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1, px: 1.5, py: 1, mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block', mb: 0.25 }}>Active</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
            {catalogModel?.name ?? currentValue}
          </Typography>
          {catalogModel?.description && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: 0.5, lineHeight: 1.4 }}>
              {catalogModel.description}
            </Typography>
          )}
          {catalogModel && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <PricingRow label="Input" value={catalogModel.input_mtok} />
              <PricingRow label="Cached" value={catalogModel.cached_mtok} />
              <PricingRow label="Output" value={catalogModel.output_mtok} />
            </Box>
          )}
        </Box>

        {/* Selector */}
        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <Select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            sx={{ fontSize: 13 }}
          >
            {eligible.map((m) => (
              <MenuItem key={m.id} value={m.id} sx={{ fontSize: 13 }}>
                <Box>
                  <Box sx={{ fontWeight: 600 }}>{m.name}</Box>
                  {m.description && (
                    <Box sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{m.description}</Box>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Selected model pricing preview */}
        {selectedMeta && selected !== currentValue && (
          <Box sx={{ bgcolor: 'rgba(94,114,228,0.06)', border: '1px solid rgba(94,114,228,0.18)', borderRadius: 1, px: 1.5, py: 0.75, mb: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              <PricingRow label="Input" value={selectedMeta.input_mtok} />
              <PricingRow label="Cached" value={selectedMeta.cached_mtok} />
              <PricingRow label="Output" value={selectedMeta.output_mtok} />
            </Box>
          </Box>
        )}

        {/* Actions */}
        {confirming ? (
          <Box sx={{ bgcolor: 'rgba(251,99,64,0.08)', border: '1px solid rgba(251,99,64,0.25)', borderRadius: 1, px: 1.5, py: 1 }}>
            <Typography variant="caption" sx={{ fontSize: 11, display: 'block', mb: 1, color: 'text.primary', fontWeight: 600 }}>
              Switch to <span style={{ fontFamily: 'monospace' }}>{selectedMeta?.name ?? selected}</span>? This hot-reloads the memory system.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={saving}
                onClick={async () => { await onApply(roleKey, selected); setConfirming(false); }}
                sx={{ flex: 1, fontSize: 12, fontWeight: 600, textTransform: 'none', bgcolor: '#fb6340', boxShadow: 'none', '&:hover': { bgcolor: '#e55a35', boxShadow: 'none' } }}
              >
                {saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : 'Confirm'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={saving}
                onClick={() => setConfirming(false)}
                sx={{ fontSize: 12, fontWeight: 600, textTransform: 'none', borderColor: 'rgba(0,0,0,0.2)', color: 'text.secondary' }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              disabled={!isDirty || saving}
              onClick={() => setConfirming(true)}
              sx={{
                flex: 1,
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)',
                boxShadow: 'none',
                '&:hover': { background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)', boxShadow: 'none' },
                '&.Mui-disabled': { background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.26)' },
              }}
            >
              Apply
            </Button>
            {source === 'persisted' && (
              <Button
                variant="outlined"
                size="small"
                disabled={saving}
                onClick={() => onRevert(roleKey)}
                sx={{ fontSize: 12, fontWeight: 600, textTransform: 'none', borderColor: 'rgba(0,0,0,0.2)', color: 'text.secondary' }}
              >
                Revert to env
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

type CatalogFormData = { id: string; name: string; description: string; roles: ('llm' | 'graph_llm')[]; input_mtok: string; cached_mtok: string; output_mtok: string };

const emptyCatalogForm = (): CatalogFormData => ({ id: '', name: '', description: '', roles: ['llm', 'graph_llm'], input_mtok: '', cached_mtok: '', output_mtok: '' });

const modelToCatalogForm = (m: CatalogModel): CatalogFormData => ({
  id: m.id, name: m.name, description: m.description ?? '', roles: m.roles,
  input_mtok: m.input_mtok?.toString() ?? '', cached_mtok: m.cached_mtok?.toString() ?? '', output_mtok: m.output_mtok?.toString() ?? '',
});

interface CatalogFormProps {
  initial: CatalogFormData;
  isNew: boolean;
  saving: boolean;
  onSave: (data: CatalogFormData) => Promise<void>;
  onCancel: () => void;
}

const ROLES = ['llm', 'graph_llm'] as const;

const CatalogForm = ({ initial, isNew, saving, onSave, onCancel }: CatalogFormProps) => {
  const [form, setForm] = useState<CatalogFormData>(initial);
  const set = (k: keyof CatalogFormData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const toggleRole = (r: 'llm' | 'graph_llm') =>
    set('roles', form.roles.includes(r) ? form.roles.filter((x) => x !== r) : [...form.roles, r]);
  const valid = form.name.trim() && (isNew ? form.id.trim() : true) && form.roles.length > 0;

  return (
    <Box sx={{ bgcolor: 'rgba(94,114,228,0.05)', border: '1px solid rgba(94,114,228,0.2)', borderRadius: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {isNew && (
          <TextField
            label="ID" size="small" value={form.id} onChange={(e) => set('id', e.target.value)}
            sx={{ flex: '0 0 180px' }} inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
          />
        )}
        <TextField
          label="Name" size="small" value={form.name} onChange={(e) => set('name', e.target.value)}
          sx={{ flex: 1, minWidth: 140 }}
        />
      </Box>
      <TextField
        label="Description" size="small" value={form.description} onChange={(e) => set('description', e.target.value)}
        fullWidth multiline minRows={1}
      />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {ROLES.map((r) => (
            <FormControlLabel
              key={r}
              control={<Checkbox size="small" checked={form.roles.includes(r)} onChange={() => toggleRole(r)} sx={{ p: 0.5 }} />}
              label={<Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{r}</Typography>}
              sx={{ mr: 0.5 }}
            />
          ))}
        </Box>
        <TextField label="Input $/MTok" size="small" value={form.input_mtok} onChange={(e) => set('input_mtok', e.target.value)} sx={{ width: 110 }} inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }} />
        <TextField label="Cached $/MTok" size="small" value={form.cached_mtok} onChange={(e) => set('cached_mtok', e.target.value)} sx={{ width: 120 }} inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }} />
        <TextField label="Output $/MTok" size="small" value={form.output_mtok} onChange={(e) => set('output_mtok', e.target.value)} sx={{ width: 120 }} inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" onClick={onCancel} disabled={saving} sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
        <Button
          variant="contained" size="small" disabled={!valid || saving}
          onClick={() => onSave(form)}
          sx={{ fontSize: 12, fontWeight: 600, textTransform: 'none', background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)', boxShadow: 'none', '&:hover': { background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)', boxShadow: 'none' } }}
        >
          {saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : (isNew ? 'Add' : 'Save')}
        </Button>
      </Box>
    </Box>
  );
};

const ModelConfigSection = () => {
  const { data: modelsData, isLoading: modelsLoading } = useGetFoxmemoryModelsQuery();
  const { data: catalogData, isLoading: catalogLoading } = useGetFoxmemoryCatalogQuery();
  const [setModel] = useSetFoxmemoryModelMutation();
  const [revertModel] = useRevertFoxmemoryModelMutation();
  const [addCatalog] = useAddCatalogModelMutation();
  const [updateCatalog] = useUpdateCatalogModelMutation();
  const [deleteCatalog] = useDeleteCatalogModelMutation();
  const [savingKey, setSavingKey] = useState<ModelRoleKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [catalogSaving, setCatalogSaving] = useState(false);

  const handleApply = async (key: ModelRoleKey, value: string) => {
    setSavingKey(key);
    try {
      await setModel({ key, value }).unwrap();
    } finally {
      setSavingKey(null);
    }
  };

  const handleRevert = async (key: ModelRoleKey) => {
    setSavingKey(key);
    try {
      await revertModel(key).unwrap();
    } finally {
      setSavingKey(null);
    }
  };

  const formToCatalog = (f: CatalogFormData) => ({
    id: f.id.trim(),
    name: f.name.trim(),
    description: f.description.trim() || null,
    roles: f.roles,
    input_mtok: f.input_mtok ? parseFloat(f.input_mtok) : null,
    cached_mtok: f.cached_mtok ? parseFloat(f.cached_mtok) : null,
    output_mtok: f.output_mtok ? parseFloat(f.output_mtok) : null,
  });

  const handleAdd = async (form: CatalogFormData) => {
    setCatalogSaving(true);
    try { await addCatalog(formToCatalog(form) as CatalogModel).unwrap(); setAddingNew(false); }
    finally { setCatalogSaving(false); }
  };

  const handleUpdate = async (form: CatalogFormData) => {
    setCatalogSaving(true);
    try { await updateCatalog(formToCatalog(form) as CatalogModel).unwrap(); setEditingId(null); }
    finally { setCatalogSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setCatalogSaving(true);
    try { await deleteCatalog(id).unwrap(); setDeletingId(null); }
    finally { setCatalogSaving(false); }
  };

  if (modelsLoading || catalogLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const models = modelsData?.data;
  const catalog = catalogData?.data?.models ?? [];

  return (
    <>
      <Typography variant="h6" fontWeight={700} mb={2.5}>Model Configuration</Typography>

      {!models ? (
        <Typography variant="body2" color="text.secondary">Unable to load model config.</Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <ModelCard
            title="Memory Model"
            icon={<MemoryRoundedIcon fontSize="small" />}
            roleKey="llm_model"
            role="llm"
            currentValue={models.llmModel.value}
            source={models.llmModel.source}
            catalogModel={models.llmModel.model}
            catalog={catalog}
            onApply={handleApply}
            onRevert={handleRevert}
            saving={savingKey === 'llm_model'}
          />
          <ModelCard
            title="Graph Model"
            icon={<AccountTreeRoundedIcon fontSize="small" />}
            roleKey="graph_llm_model"
            role="graph_llm"
            currentValue={models.graphLlmModel.value}
            source={models.graphLlmModel.source}
            catalogModel={models.graphLlmModel.model}
            catalog={catalog}
            onApply={handleApply}
            onRevert={handleRevert}
            saving={savingKey === 'graph_llm_model'}
          />
        </Box>
      )}

      {/* Catalog */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
            Model Catalog
          </Typography>
          <IconButton
            size="small"
            onClick={() => { setAddingNew(true); setEditingId(null); setDeletingId(null); }}
            disabled={addingNew}
            sx={{ ml: 1, width: 24, height: 24, background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)', color: '#fff', boxShadow: '0 2px 6px rgba(30,60,200,0.35)', '&:hover': { background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)' }, '&.Mui-disabled': { background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.26)', boxShadow: 'none' } }}
          >
            <AddRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {addingNew && (
            <CatalogForm
              initial={emptyCatalogForm()}
              isNew
              saving={catalogSaving}
              onSave={handleAdd}
              onCancel={() => setAddingNew(false)}
            />
          )}

          {catalog.map((m) => (
            <Box key={m.id}>
              {editingId === m.id ? (
                <CatalogForm
                  initial={modelToCatalogForm(m)}
                  isNew={false}
                  saving={catalogSaving}
                  onSave={handleUpdate}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <Card sx={{ borderRadius: 1 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    {deletingId === m.id ? (
                      <Box sx={{ bgcolor: 'rgba(245,54,92,0.07)', border: '1px solid rgba(245,54,92,0.22)', borderRadius: 1, px: 1.5, py: 1 }}>
                        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, display: 'block', mb: 1 }}>
                          Delete <span style={{ fontFamily: 'monospace' }}>{m.id}</span> from catalog?
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button variant="contained" size="small" disabled={catalogSaving} onClick={() => handleDelete(m.id)}
                            sx={{ fontSize: 12, fontWeight: 600, textTransform: 'none', bgcolor: '#f5365c', boxShadow: 'none', '&:hover': { bgcolor: '#d42e51', boxShadow: 'none' } }}>
                            {catalogSaving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : 'Delete'}
                          </Button>
                          <Button size="small" onClick={() => setDeletingId(null)} sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary' }}>Cancel</Button>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13 }}>{m.name}</Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.05)', px: 0.75, py: 0.25, borderRadius: 0.5 }}>{m.id}</Typography>
                            {m.roles.map((r) => (
                              <Chip key={r} label={r} size="small" sx={{ fontSize: 9, height: 16, fontFamily: 'monospace' }} />
                            ))}
                          </Box>
                          {m.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, display: 'block', mt: 0.25 }}>{m.description}</Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', display: 'block' }}>In</Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>{fmtCost(m.input_mtok)}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', display: 'block' }}>Cache</Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>{fmtCost(m.cached_mtok)}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', display: 'block' }}>Out</Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>{fmtCost(m.output_mtok)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                            <IconButton size="small" onClick={() => { setEditingId(m.id); setDeletingId(null); setAddingNew(false); }}
                              sx={{ width: 24, height: 24, background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)', color: '#fff', boxShadow: '0 2px 6px rgba(30,60,200,0.35)', '&:hover': { background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)' } }}>
                              <EditRoundedIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                            <IconButton size="small" onClick={() => { setDeletingId(m.id); setEditingId(null); }}
                              sx={{ width: 24, height: 24, bgcolor: '#f5365c', color: '#fff', boxShadow: '0 2px 6px rgba(245,54,92,0.4)', '&:hover': { bgcolor: '#d42e51' } }}>
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
};

export default ModelConfigSection;
