import { asyncHandler } from '../utils/asyncHandler.js';
import * as heroSlideService from '../services/heroSlide.service.js';

export const list = asyncHandler(async (req, res) => {
  const slides = await heroSlideService.listSlides({ activeOnly: true });
  res.json({ success: true, message: 'Hero slides', data: { slides } });
});

export const listAll = asyncHandler(async (req, res) => {
  const slides = await heroSlideService.listSlides({ activeOnly: false });
  res.json({ success: true, message: 'All hero slides', data: { slides } });
});

export const create = asyncHandler(async (req, res) => {
  const slide = await heroSlideService.createSlide(req.body);
  res.status(201).json({ success: true, message: 'Hero slide created', data: { slide } });
});

export const update = asyncHandler(async (req, res) => {
  const slide = await heroSlideService.updateSlide(req.params.id, req.body);
  res.json({ success: true, message: 'Hero slide updated', data: { slide } });
});

export const remove = asyncHandler(async (req, res) => {
  await heroSlideService.deleteSlide(req.params.id);
  res.json({ success: true, message: 'Hero slide deleted' });
});

export const reorder = asyncHandler(async (req, res) => {
  const slides = await heroSlideService.reorderSlides(req.body.orderedIds);
  res.json({ success: true, message: 'Hero slides reordered', data: { slides } });
});
