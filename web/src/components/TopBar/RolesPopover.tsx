import { useState, useEffect } from 'react';
import { Box, CircularProgress, Divider, IconButton, InputAdornment, Popover, TextField, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useGetRolesConfigQuery, useSetRolesConfigMutation } from '../../services/dashboardApi';

/**
 * Inline-editable role name field.
 *
 * Default state: read-only text field with a pencil icon on the right.
 * Editing state: editable field, pencil replaced by undo + checkmark icons.
 * - Undo reverts to the original value and exits edit mode.
 * - Checkmark saves via PUT /v2/config/roles, shows a spinner during the call,
 *   then returns to read-only with the new value.
 */
const RoleField = ({
  label,
  value,
  roleKey,
}: {
  label: string;
  value: string;
  roleKey: 'user' | 'assistant';
}) => {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [setRoles] = useSetRolesConfigMutation();

  // Sync when upstream value changes (e.g. after save or external update)
  useEffect(() => {
    if (!editing) setLocalValue(value);
  }, [value, editing]);

  const handleEdit = () => {
    setLocalValue(value);
    setEditing(true);
  };

  const handleUndo = () => {
    setLocalValue(value);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!localValue.trim()) return;
    setSaving(true);
    await setRoles({ [roleKey]: localValue.trim() }).unwrap();
    setSaving(false);
    setEditing(false);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ minWidth: 72, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <TextField
        size="small"
        variant="outlined"
        value={editing ? localValue : value}
        onChange={(e) => setLocalValue(e.target.value)}
        disabled={!editing || saving}
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            fontSize: 13,
            fontWeight: 600,
            height: 32,
            '& fieldset': {
              borderColor: editing ? undefined : 'transparent',
            },
            '&:hover fieldset': {
              borderColor: editing ? undefined : 'divider',
            },
          },
        }}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end" sx={{ gap: 0 }}>
                {!editing ? (
                  <Tooltip title="Edit" arrow>
                    <IconButton size="small" onClick={handleEdit} sx={{ p: 0.25 }}>
                      <EditRoundedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                ) : saving ? (
                  <CircularProgress size={15} />
                ) : (
                  <>
                    <Tooltip title="Undo" arrow>
                      <IconButton size="small" onClick={handleUndo} sx={{ p: 0.25 }}>
                        <UndoRoundedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Save" arrow>
                      <IconButton
                        size="small"
                        onClick={handleSave}
                        disabled={!localValue.trim() || localValue.trim() === value}
                        sx={{ p: 0.25, color: 'success.main' }}
                      >
                        <CheckRoundedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
};

export interface RolesPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

/**
 * Popover anchored to the user icon in the TopBar.
 *
 * Shows the current role name mapping (user name + fox name) with inline
 * editing. Role names control how the extraction LLM attributes memories
 * to the correct person — "Thomas prefers…" vs generic "User prefers…".
 */
const RolesPopover = ({ anchorEl, onClose }: RolesPopoverProps) => {
  const { data: rolesConfig, isLoading } = useGetRolesConfigQuery();

  const userName = rolesConfig?.data?.user ?? 'user';
  const foxName = rolesConfig?.data?.assistant ?? 'assistant';

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: (theme) => ({
            mt: 1,
            p: 2.5,
            width: 300,
            borderRadius: 2,
            backdropFilter: 'blur(18px)',
            backgroundColor: alpha(theme.palette.background.paper, 0.85),
            boxShadow: `0 8px 32px rgba(0,0,0,0.18), inset 0 0 0 1px ${alpha(theme.palette.common.white, 0.08)}`,
          }),
        },
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
        Identity
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <>
          <RoleField label="User Name" value={userName} roleKey="user" />
          <RoleField label="Fox Name" value={foxName} roleKey="assistant" />
        </>
      )}

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
        <InfoOutlinedIcon sx={{ fontSize: 14, mt: 0.25, color: 'text.secondary', flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, fontStyle: 'italic' }}>
          Be respectful! If your fox named itself, you should not change their name without asking.
        </Typography>
      </Box>
    </Popover>
  );
};

export default RolesPopover;
