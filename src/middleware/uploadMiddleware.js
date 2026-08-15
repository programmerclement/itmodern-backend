import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new ApiError(400, 'Only image files are allowed'));
    return;
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const SPREADSHEET_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

function spreadsheetFileFilter(req, file, cb) {
  if (!SPREADSHEET_MIMETYPES.includes(file.mimetype)) {
    cb(new ApiError(400, 'Only .xlsx or .xls files are allowed'));
    return;
  }
  cb(null, true);
}

export const uploadSpreadsheet = multer({
  storage,
  fileFilter: spreadsheetFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
