import { createFileRoute } from '@tanstack/react-router';
import UploadPage from '../pages/UploadPage';

export const Route = createFileRoute('/')({
  component: UploadPage,
});