import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBoard } from '../src/components/ScoreBoard/ScoreBoard';

describe('ScoreBoard', () => {
  it('renders yourScore and highScore', () => {
    render(<ScoreBoard yourScore={5} highScore={10} />);

    expect(screen.getByTestId('your-score')).toHaveTextContent('5');
    expect(screen.getByTestId('high-score')).toHaveTextContent('10');
  });

  it('renders zero when scores are 0', () => {
    render(<ScoreBoard yourScore={0} highScore={0} />);

    expect(screen.getByTestId('your-score')).toHaveTextContent('0');
    expect(screen.getByTestId('high-score')).toHaveTextContent('0');
  });

  it('renders labels correctly', () => {
    render(<ScoreBoard yourScore={0} highScore={0} />);

    expect(screen.getByText('Your Score')).toBeInTheDocument();
    expect(screen.getByText('High Score')).toBeInTheDocument();
  });
});
