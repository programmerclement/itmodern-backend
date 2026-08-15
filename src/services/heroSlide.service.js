import HeroSlide from '../models/HeroSlide.js';
import { ApiError } from '../utils/ApiError.js';
import { deleteImage } from './upload.service.js';

export async function listSlides({ activeOnly = true } = {}) {
  const query = activeOnly ? { isActive: true } : {};
  return HeroSlide.find(query).sort({ order: 1, createdAt: 1 });
}

export async function getSlideById(id) {
  const slide = await HeroSlide.findById(id);
  if (!slide) {
    throw new ApiError(404, 'Hero slide not found');
  }
  return slide;
}

export async function createSlide(data) {
  const lastSlide = await HeroSlide.findOne().sort({ order: -1 });
  const order = Number.isFinite(data.order) ? data.order : (lastSlide?.order ?? -1) + 1;
  return HeroSlide.create({ ...data, order });
}

export async function updateSlide(id, data) {
  const slide = await getSlideById(id);
  Object.assign(slide, data);
  await slide.save();
  return slide;
}

export async function deleteSlide(id) {
  const slide = await getSlideById(id);
  await slide.deleteOne();
  await deleteImage(slide.publicId);
}

export async function reorderSlides(orderedIds) {
  await Promise.all(
    orderedIds.map((id, index) => HeroSlide.updateOne({ _id: id }, { $set: { order: index } }))
  );
  return listSlides({ activeOnly: false });
}
