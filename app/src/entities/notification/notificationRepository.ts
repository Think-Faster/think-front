import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { SendEmailRequest, SendEmailResponse } from './types';

// Доставка асинхронная — BFF публикует уведомление в очередь, реально шлёт
// письмо отдельный сервис инфраструктуры. 200 здесь значит «принято в
// обработку», не «письмо доставлено» — итог смотреть по каждому элементу
// SendEmailResponse.results, а не по коду ответа (частично неверные адреса
// или залимиченные получатели всё равно дают 200 с отчётом).
export const notificationRepository = {
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const { data } = await apiClient.post<SendEmailResponse>(endpoints.bff.notifications.sendEmail, request);
    return data;
  },
};
