import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material';

interface DesignSelectProps {
  label: string;
  value: number | '';
  rows: { id: number; name: string }[];
  required: boolean;
  helperText?: string;
  onChange: (value: number | '') => void;
}

export const DesignSelect = ({ label, value, rows, required, helperText, onChange }: DesignSelectProps) => {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return <FormControl required={required} fullWidth>
    <InputLabel id={`${id}-label`}>{label}</InputLabel>
    <Select<number | ''> labelId={`${id}-label`} id={id} label={label} value={value} required={required} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}>
      {!required && <MenuItem value="">None</MenuItem>}
      {rows.map((row) => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}
    </Select>
    {helperText && <FormHelperText>{helperText}</FormHelperText>}
  </FormControl>;
};

export default DesignSelect;
