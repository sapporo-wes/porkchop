import { createFileRoute } from '@tanstack/react-router';
import LogPage from '../pages/LogPage';

export const Route = createFileRoute('/log')({
  component: LogPage,
});