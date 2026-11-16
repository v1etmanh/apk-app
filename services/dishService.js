/**
 * dishService.js — API client & data models cho chi tiết món ăn và các bước chế biến (cooking steps).
 */

import { api } from './api';
import i18n from '../i18n';

/**
 * @typedef {Object} CookingStep
 * @property {number} step_no - Số thứ tự bước nấu (1, 2, 3, ...)
 * @property {string} instruction - Nội dung hướng dẫn chi tiết của bước
 */

/**
 * @typedef {Object} CookingStepsResponse
 * @property {string} dish_id - ID món ăn (chuỗi số nguyên dương, vd: "15879785")
 * @property {string} title - Tên món ăn (đã dịch theo ngôn ngữ vi/en nếu có)
 * @property {number|null} cook_time_minutes - Thời gian nấu (phút)
 * @property {string|null} cooking_method_id - Mã phương pháp nấu (vd: "nau_canh", "xao", "kho"...)
 * @property {number} total_steps - Tổng số bước nấu
 * @property {CookingStep[]} steps - Danh sách các bước đã sắp xếp theo step_no tăng dần
 * @property {string} language - Ngôn ngữ phản hồi ("vi" | "en")
 */

/**
 * Chuẩn hoá dữ liệu trả về từ endpoint cooking-steps để đảm bảo an toàn kiểu dữ liệu cho UI.
 * @param {any} raw
 * @param {string} fallbackDishId
 * @returns {CookingStepsResponse}
 */
export function normalizeCookingStepsResponse(raw, fallbackDishId = '') {
  const data = raw && typeof raw === 'object' ? raw : {};
  const rawSteps = Array.isArray(data.steps) ? data.steps : [];

  /** @type {CookingStep[]} */
  const steps = rawSteps
    .map((item, idx) => ({
      step_no: Number.isFinite(Number(item?.step_no)) ? Number(item.step_no) : idx + 1,
      instruction: typeof item?.instruction === 'string' ? item.instruction.trim() : '',
    }))
    .filter((step) => step.instruction.length > 0)
    .sort((a, b) => a.step_no - b.step_no);

  const totalSteps = Number.isFinite(Number(data.total_steps))
    ? Number(data.total_steps)
    : steps.length;

  return {
    dish_id: String(data.dish_id ?? fallbackDishId),
    title: typeof data.title === 'string' ? data.title : '',
    cook_time_minutes:
      data.cook_time_minutes != null && Number.isFinite(Number(data.cook_time_minutes))
        ? Number(data.cook_time_minutes)
        : null,
    cooking_method_id: typeof data.cooking_method_id === 'string' ? data.cooking_method_id : null,
    total_steps: steps.length === 0 ? 0 : totalSteps,
    steps,
    language: typeof data.language === 'string' ? data.language : (i18n.language || 'vi'),
  };
}

/**
 * Gọi API lấy danh sách các bước nấu ăn cho 1 món ăn.
 * Endpoint: GET /api/v1/dishes/{dish_id}/cooking-steps
 * Header Authorization: Bearer <access_token> được gắn tự động qua request interceptor của `api`.
 *
 * @param {string|number} dishId - ID món ăn (chuỗi số nguyên dương, vd: "15879785")
 * @param {{ lang?: 'vi' | 'en' }} [options] - Tuỳ chọn ngôn ngữ
 * @returns {Promise<CookingStepsResponse>}
 */
export async function getDishCookingSteps(dishId, options = {}) {
  const cleanId = String(dishId ?? '').trim();
  if (!cleanId || !/^\d+$/.test(cleanId)) {
    const invalidErr = new Error('Invalid dish_id');
    invalidErr.status = 404;
    invalidErr.code = 'NOT_FOUND';
    throw invalidErr;
  }

  const lang = options.lang || ((i18n.language || 'vi').startsWith('en') ? 'en' : 'vi');

  try {
    const response = await api.get(`/api/v1/dishes/${encodeURIComponent(cleanId)}/cooking-steps`, {
      params: { lang },
      headers: { 'Accept-Language': lang },
    });

    return normalizeCookingStepsResponse(response.data, cleanId);
  } catch (error) {
    const status = error?.response?.status;
    const normalizedError = new Error(
      error?.response?.data?.detail || error?.message || 'Failed to fetch cooking steps'
    );
    normalizedError.status = status || null;
    normalizedError.originalError = error;

    if (status === 401 || error?.isAuthExpired) {
      normalizedError.code = 'UNAUTHORIZED';
    } else if (status === 404) {
      normalizedError.code = 'NOT_FOUND';
    } else {
      normalizedError.code = 'NETWORK_ERROR';
    }

    throw normalizedError;
  }
}
