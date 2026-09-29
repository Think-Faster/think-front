import { apiClient } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { SendEmailRequest, SendEmailResponse, SendTelegramRequest, SendTelegramResponse } from './types';

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

  // Сообщение от бота по users.telegram — одно на всех, tf-tg шлёт каждому
  // личное. Итог так же по results: notLinked — человек не подключил бота.
  async sendTelegram(request: SendTelegramRequest): Promise<SendTelegramResponse> {
    const { data } = await apiClient.post<SendTelegramResponse>(endpoints.bff.notifications.sendTelegram, request);
    return data;
  },
};
