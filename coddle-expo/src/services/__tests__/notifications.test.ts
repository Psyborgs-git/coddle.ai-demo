import { NotificationService } from '../notifications';

jest.mock('expo-notifications', () => {
  return {
    SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notif-id'),
    setNotificationHandler: jest.fn(),
    addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  };
});

jest.mock('../database', () => ({
  db: {
    logNotification: jest.fn().mockResolvedValue(undefined),
    getNotificationLogs: jest.fn().mockResolvedValue([]),
    clearOldNotificationLogs: jest.fn().mockResolvedValue(undefined),
  },
}));

const Notifications = require('expo-notifications');

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Freeze time for deterministic seconds calculation
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules notifications with type on trigger', async () => {
    const futureDate = new Date(Date.now() + 5000); // 5 seconds in future
    const scheduleBlock = {
      id: 'block-1',
      kind: 'nap',
      startISO: futureDate.toISOString(),
      endISO: new Date(futureDate.getTime() + 20 * 60 * 1000).toISOString(),
      confidence: 0.5,
      rationale: 'test',
    } as any;

    await NotificationService.scheduleNotifications([scheduleBlock]);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    const arg = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(arg).toHaveProperty('trigger');
    expect(arg.trigger).toHaveProperty('type', Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL);
    expect(arg.trigger).toHaveProperty('seconds');
    expect(typeof arg.trigger.seconds).toBe('number');
    expect(arg.trigger.seconds).toBeGreaterThanOrEqual(4);
  });
});
