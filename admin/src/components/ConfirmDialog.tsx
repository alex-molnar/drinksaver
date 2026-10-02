import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  pending: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog = ({ open, title, description, pending, error, onConfirm, onClose }: ConfirmDialogProps) => (
  <Dialog open={open} onClose={() => !pending && onClose()} aria-labelledby="confirm-title" aria-describedby="confirm-description">
    <DialogTitle id="confirm-title">{title}</DialogTitle>
    <DialogContent>
      <DialogContentText id="confirm-description">{description}</DialogContentText>
      {error && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={pending}>Cancel</Button>
      <Button color="error" variant="contained" onClick={onConfirm} disabled={pending}>
        {pending ? 'Working…' : 'Confirm'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
