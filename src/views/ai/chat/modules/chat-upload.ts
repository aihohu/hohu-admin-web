import { fetchUploadFile } from '@/service/api';

const USER_IMPORT_EXTENSIONS = ['.csv', '.xlsx'];
const PRIVATE_QUARANTINE_EXTENSIONS = ['.xls'];

function hasAnyExtension(file: File, extensions: string[]): boolean {
  const fileName = file.name.trim().toLowerCase();
  return extensions.some(extension => fileName.endsWith(extension));
}

/** Keep upload classification in one place so images and ordinary files stay out of the import scope. */
export function uploadChatFile(file: File) {
  const mustStayPrivate =
    hasAnyExtension(file, USER_IMPORT_EXTENSIONS) || hasAnyExtension(file, PRIVATE_QUARANTINE_EXTENSIONS);
  return fetchUploadFile(file, mustStayPrivate ? 'user-import' : 'ai-chat');
}
