import { render, screen } from '../../test-utils';
import Window from '../Window';

describe('Window Component', () => {
  const defaultProps = {
    id: 'test-window',
    title: 'Test Window',
    children: <div>Window Content</div>,
    onClose: jest.fn(),
    onMinimize: jest.fn(),
    onMaximize: jest.fn(),
  };

  it('should render window with title', () => {
    render(<Window {...defaultProps} />);
    expect(screen.getByText('Test Window')).toBeInTheDocument();
  });

  it('should render window content', () => {
    render(<Window {...defaultProps} />);
    expect(screen.getByText('Window Content')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Window {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.click();
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should have proper ARIA attributes', () => {
    render(<Window {...defaultProps} />);
    const windowElement = screen.getByRole('dialog');
    expect(windowElement).toHaveAttribute('aria-labelledby', 'test-window-title');
  });
});
