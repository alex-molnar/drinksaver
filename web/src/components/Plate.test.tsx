import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Plate from './Plate';
import { DRINK_IDENTITIES } from '../drink/identity';

describe('Plate', () => {
  describe('drink variant', () => {
    it('is a real button whose accessible name is the drink name', () => {
      render(<Plate variant="drink" name="Heineken pint" rotation={0.5} onClick={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeInTheDocument();
    });

    it("draws the drink's glass silhouette", () => {
      render(<Plate variant="drink" name="Glass of red" rotation={0.5} onClick={vi.fn()} />);

      expect(screen.getByTestId('glass-wine')).toBeInTheDocument();
    });

    it('falls back to a neutral glass for a name outside the identity table', () => {
      render(<Plate variant="drink" name="Mystery cocktail" rotation={0.5} onClick={vi.fn()} />);

      expect(screen.getByTestId('glass-highball')).toBeInTheDocument();
    });

    it("carries the drink's field colour as a CSS custom property, never a literal", () => {
      render(<Plate variant="drink" name="Duvel bottle" rotation={0.5} onClick={vi.fn()} />);

      const button = screen.getByRole('button', { name: 'Duvel bottle' });
      expect(button.style.getPropertyValue('--fld')).toBe(DRINK_IDENTITIES['Duvel bottle'].field);
      expect(button.style.color).not.toBe('');
    });

    it('applies the given rotation as a CSS custom property', () => {
      render(<Plate variant="drink" name="Heineken pint" rotation={-0.7} onClick={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Heineken pint' }).style.getPropertyValue('--rot')).toBe('-0.7deg');
    });

    it('renders an optional caption at full opacity, not the reduced opacity the prototype used', () => {
      render(<Plate variant="drink" name="Heineken pint" caption="0.5 L draft" rotation={0.5} onClick={vi.fn()} />);

      const caption = screen.getByText('0.5 L draft');
      expect(caption).toBeInTheDocument();
      expect(caption).not.toHaveStyle({ opacity: '0.72' });
    });

    it('renders no caption element when none is given', () => {
      const { container } = render(<Plate variant="drink" name="Heineken pint" rotation={0.5} onClick={vi.fn()} />);

      expect(container.querySelector('.caption')).toBeNull();
    });

    it('defaults to idle: not busy, no saved stamp, not disabled', () => {
      render(<Plate variant="drink" name="Heineken pint" rotation={0.5} onClick={vi.fn()} />);

      const button = screen.getByRole('button', { name: 'Heineken pint' });
      expect(button).not.toHaveAttribute('aria-busy');
      expect(button).not.toHaveAttribute('data-done');
      expect(button).toBeEnabled();
    });

    it('marks itself busy and disabled while saving', () => {
      render(<Plate variant="drink" name="Heineken pint" status="saving" rotation={0.5} onClick={vi.fn()} />);

      const button = screen.getByRole('button', { name: 'Heineken pint' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
    });

    it('raises the stamp when done, without disabling the plate', () => {
      render(<Plate variant="drink" name="Heineken pint" status="done" rotation={0.5} onClick={vi.fn()} />);

      const button = screen.getByRole('button', { name: 'Heineken pint' });
      expect(button).toHaveAttribute('data-done', '');
      expect(button).not.toHaveAttribute('aria-busy');
      expect(button).toBeEnabled();
    });

    it('respects an explicit disabled prop even when idle', () => {
      render(<Plate variant="drink" name="Heineken pint" disabled rotation={0.5} onClick={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeDisabled();
    });

    it('calls onClick when tapped', async () => {
      const onClick = vi.fn();
      render(<Plate variant="drink" name="Heineken pint" rotation={0.5} onClick={onClick} />);

      await userEvent.click(screen.getByRole('button', { name: 'Heineken pint' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const onClick = vi.fn();
      render(<Plate variant="drink" name="Heineken pint" disabled rotation={0.5} onClick={onClick} />);

      await userEvent.click(screen.getByRole('button', { name: 'Heineken pint' }));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('add variant', () => {
    it('is a real button whose accessible name is its label', () => {
      render(<Plate variant="add" label="Something else" rotation={0.5} onClick={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Something else' })).toBeInTheDocument();
    });

    it('hides its plus glyph from assistive technology', () => {
      const { container } = render(<Plate variant="add" label="Something else" rotation={0.5} onClick={vi.fn()} />);

      const plus = container.querySelector('.plus');
      expect(plus).toHaveAttribute('aria-hidden', 'true');
    });

    it('calls onClick when tapped', async () => {
      const onClick = vi.fn();
      render(<Plate variant="add" label="Something else" rotation={0.5} onClick={onClick} />);

      await userEvent.click(screen.getByRole('button', { name: 'Something else' }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('can be disabled, e.g. while another plate is saving', () => {
      render(<Plate variant="add" label="Something else" disabled rotation={0.5} onClick={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Something else' })).toBeDisabled();
    });
  });
});
