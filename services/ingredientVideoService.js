import { api } from './api';
import { normalizeIngredientVideos } from '../utils/foodVideos';

export const getIngredientVideos = async (language = 'vi') => {
  const response = await api.get('/api/v1/ingredient-videos');
  return normalizeIngredientVideos(response.data, language);
};

export default {
  getIngredientVideos,
};
