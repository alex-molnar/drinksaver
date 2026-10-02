import type { ReactNode } from 'react';
import { Button, Card, CardActions, CardContent, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

interface CatalogCardProps {
  name: string;
  details?: ReactNode;
  preview?: ReactNode;
  childHref?: string;
  childLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const CatalogCard = ({ name, details, preview, childHref, childLabel, onEdit, onDelete }: CatalogCardProps) => (
  <Card className="catalog-card">
    <CardContent>
      <div className="catalog-card-head">
        <div><Typography component="h2" variant="h5" className="catalog-name">{name}</Typography>{details}</div>
        {preview}
      </div>
    </CardContent>
    <CardActions className="catalog-actions">
      {childHref && <Button component={Link} to={childHref}>{childLabel}</Button>}
      <Button onClick={onEdit}>Edit {name}</Button>
      <Button color="error" onClick={onDelete}>Delete {name}</Button>
    </CardActions>
  </Card>
);

export default CatalogCard;
