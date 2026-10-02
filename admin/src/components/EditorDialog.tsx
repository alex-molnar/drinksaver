import type { FormEvent, ReactNode } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

export interface EditorDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  pending: boolean;
  error?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  children: ReactNode;
}

export const EditorDialog = ({ open, title, submitLabel, pending, error, onSubmit, onClose, children }: EditorDialogProps) => (
  <Dialog open={open} onClose={() => !pending && onClose()} fullWidth maxWidth="sm" aria-labelledby="editor-title">
    <form onSubmit={onSubmit}>
      <DialogTitle id="editor-title">{title}</DialogTitle>
      <DialogContent className="editor-fields">
        {children}
        {error && <Alert severity="error" role="alert">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
      </DialogActions>
    </form>
  </Dialog>
);

export default EditorDialog;
