import SiteSettings from '../models/SiteSettings.js';

// The site only ever has one settings document — created lazily on first read.
export async function getSettings() {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({});
  }
  return settings;
}

export async function updateSettings(data) {
  const settings = await getSettings();
  Object.assign(settings, data);
  await settings.save();
  return settings;
}
