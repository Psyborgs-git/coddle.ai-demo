import { ScheduleBlock } from '../types';
import { differenceInSeconds, format } from 'date-fns';
import { safeParseISO } from '../utils/date';
import Toast from 'react-native-toast-message';
import { db } from './database';
import { v4 as uuidv4 } from 'uuid';

// In-app notification log for verification
export interface NotificationLogEntry {
  id: string;
  scheduleBlockId?: string;
  title: string;
  body: string;
  scheduledForISO: string;
  notificationId?: string;
  status: 'scheduled' | 'canceled' | 'delivered';
  createdAtISO: string;
  canceledAtISO?: string;
}

async function getNotificationsModule() {
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return Notifications;
  } catch (e) {
    // Dynamic `import()` may fail in some test environments (Node/Jest). Try a
    // synchronous `require` fallback so tests can mock the module.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      return Notifications;
    } catch (err) {
      console.warn('expo-notifications not available:', e);
      return null;
    }
  }
}

export const NotificationService = {
  async requestPermissions() {
    try {
      const Notifications = await getNotificationsModule();
      if (!Notifications) return false;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('Notification permissions unavailable:', e);
      return false;
    }
  },

  async scheduleNotifications(schedule: ScheduleBlock[]) {
    const Notifications = await getNotificationsModule();
    
    // Cancel all existing and mark in log
    await this.cancelAllNotifications();

    for (const block of schedule) {
      const triggerDate = safeParseISO(block.startISO);
      if (!triggerDate) continue;
      const seconds = differenceInSeconds(triggerDate, new Date());
      
      if (seconds > 0) {
        let title = '';
        let body = '';
        
        if (block.kind === 'windDown') {
          title = 'Wind Down Time 🌙';
          body = 'Start winding down for sleep.';
        } else if (block.kind === 'nap') {
          title = 'Nap Time 😴';
          body = `It's time for a nap (${format(triggerDate, 'h:mm a')})`;
        } else if (block.kind === 'bedtime') {
          title = 'Bedtime 💤';
          body = 'Time for bed.';
        }

        const logId = uuidv4();
        let notificationId: string | undefined;

        if (Notifications) {
          try {
            notificationId = await Notifications.scheduleNotificationAsync({
              content: { title, body, data: { scheduleBlockId: block.id } },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds,
                repeats: false,
              } as any,
            });
          } catch (e) {
            console.warn('Failed to schedule notification:', e);
          }
        }

        // Save to database
        await db.logNotification({
          id: logId,
          scheduleBlockId: block.id,
          title,
          body,
          scheduledForISO: block.startISO,
          notificationId,
          status: 'scheduled',
        });
      }
    }

    // Show in-app toast for new schedule
    if (schedule.length > 0) {
      const nextBlock = schedule.find(b => {
        const d = safeParseISO(b.startISO);
        return d && d > new Date();
      });
      
      if (nextBlock) {
        const nextTime = safeParseISO(nextBlock.startISO);
        Toast.show({
          type: 'info',
          text1: 'Schedule Updated',
          text2: `Next: ${nextBlock.kind} at ${nextTime ? format(nextTime, 'h:mm a') : 'soon'}`,
        });
      }
    }

    return await db.getNotificationLogs();
  },

  async cancelAllNotifications() {
    const Notifications = await getNotificationsModule();
    
    // Mark existing scheduled as canceled in database
    const logs = await db.getNotificationLogs();
    for (const log of logs) {
      if (log.status === 'scheduled') {
        await db.logNotification({
          id: log.id,
          scheduleBlockId: log.scheduleBlockId,
          title: log.title,
          body: log.body,
          scheduledForISO: log.scheduledForISO,
          notificationId: log.notificationId,
          status: 'canceled',
        });
      }
    }

    if (Notifications) {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (e) {
        console.warn('Failed to cancel notifications:', e);
      }
    }
  },

  async getScheduledNotifications() {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return [];
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (e) {
      return [];
    }
  },

  async getNotificationLog(): Promise<NotificationLogEntry[]> {
    const logs = await db.getNotificationLogs();
    return logs.map(log => ({
      ...log,
      status: log.status as 'scheduled' | 'canceled' | 'delivered'
    }));
  },

  async clearNotificationLog() {
    // Clear old logs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await db.clearOldNotificationLogs(thirtyDaysAgo.toISOString());
  },

  // Show in-app notification (for immediate alerts)
  showInAppNotification(title: string, body: string, type: 'success' | 'error' | 'info' = 'info') {
    Toast.show({
      type,
      text1: title,
      text2: body,
    });
  },

  // Setup listener for when app receives a notification
  async setupNotificationListener(callback: (title: string, body: string) => void) {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return () => {};

    const subscription = Notifications.addNotificationReceivedListener(async notification => {
      const { title, body } = notification.request.content;
      const id = notification.request.identifier;
      
      // Mark as delivered in database
      const logs = await db.getNotificationLogs();
      const log = logs.find(n => n.notificationId === id);
      if (log) {
        await db.logNotification({
          id: log.id,
          scheduleBlockId: log.scheduleBlockId,
          title: log.title,
          body: log.body,
          scheduledForISO: log.scheduledForISO,
          notificationId: id,
          status: 'delivered',
        });
      }

      if (title && body) {
        callback(title, body);
      }
    });

    return () => subscription.remove();
  },
};
