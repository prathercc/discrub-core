import type { INotificationManager } from "../types.ts";

/**
 * Adapter to provide notification functionality
 */
export class NotificationManagerAdapter implements INotificationManager {
  private notifyFn: (message: string, timeout: number) => Promise<void>;

  constructor(notifyFn: (message: string, timeout: number) => Promise<void>) {
    this.notifyFn = notifyFn;
  }

  async notify(message: string, timeout: number): Promise<void> {
    await this.notifyFn(message, timeout);
  }

  /**
   * Create adapter from Redux dispatch function
   */
  static fromReduxDispatch(
    dispatchFn: (params: { message: string; timeout: number }) => Promise<void>,
  ): NotificationManagerAdapter {
    return new NotificationManagerAdapter(async (message, timeout) => {
      await dispatchFn({ message, timeout });
    });
  }
}
