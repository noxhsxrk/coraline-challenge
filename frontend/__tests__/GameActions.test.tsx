import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameActions } from '../src/components/GameActions/GameActions';

describe('GameActions', () => {
  it('renders all three action buttons', () => {
    render(<GameActions onSelect={vi.fn()} disabled={false} />);

    expect(screen.getByTestId('btn-rock')).toBeInTheDocument();
    expect(screen.getByTestId('btn-paper')).toBeInTheDocument();
    expect(screen.getByTestId('btn-scissors')).toBeInTheDocument();
  });

  it('calls onSelect with correct action when clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<GameActions onSelect={onSelect} disabled={false} />);

    await user.click(screen.getByTestId('btn-rock'));
    expect(onSelect).toHaveBeenCalledWith('rock');

    await user.click(screen.getByTestId('btn-paper'));
    expect(onSelect).toHaveBeenCalledWith('paper');

    await user.click(screen.getByTestId('btn-scissors'));
    expect(onSelect).toHaveBeenCalledWith('scissors');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<GameActions onSelect={vi.fn()} disabled={true} />);

    expect(screen.getByTestId('btn-rock')).toBeDisabled();
    expect(screen.getByTestId('btn-paper')).toBeDisabled();
    expect(screen.getByTestId('btn-scissors')).toBeDisabled();
  });

  it('does not call onSelect when disabled and clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<GameActions onSelect={onSelect} disabled={true} />);

    await user.click(screen.getByTestId('btn-rock'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
