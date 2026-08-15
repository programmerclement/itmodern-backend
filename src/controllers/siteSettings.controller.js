import { asyncHandler } from '../utils/asyncHandler.js';
import * as siteSettingsService from '../services/siteSettings.service.js';

export const get = asyncHandler(async (req, res) => {
  const settings = await siteSettingsService.getSettings();
  res.json({ success: true, message: 'Site settings', data: { settings } });
});

export const update = asyncHandler(async (req, res) => {
  const settings = await siteSettingsService.updateSettings(req.body);
  res.json({ success: true, message: 'Site settings updated', data: { settings } });
});
