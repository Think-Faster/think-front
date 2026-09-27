import { render, screen } from '@testing-library/react';
import App from './App';

test('renders logs section', () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Логи' })).toBeInTheDocument();
});
