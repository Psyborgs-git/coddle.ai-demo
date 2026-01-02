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

  it('logs manual scheduled notification to database', async () => {
    const futureDate = new Date(Date.now() + 5000);
    const result = await NotificationService.scheduleNotification({
      title: 'Test',
      body: 'Body',
      scheduledForISO: futureDate.toISOString(),
      scheduleBlockId: 'manual-1',
    });

    // ensure expo scheduling was attempted
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    // ensure db.logNotification was called
    const { db } = require('../database');
    expect(db.logNotification).toHaveBeenCalled();
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('log');
  });

  it('filters invalid notification rows when fetching logs', async () => {
    const { db } = require('../database');
    db.getNotificationLogs.mockResolvedValueOnce([
      // valid
      { id: '1', title: 'Good', body: 'x', scheduledForISO: new Date(Date.now() + 5000).toISOString(), notificationId: 'a', status: 'scheduled', createdAtISO: new Date().toISOString() },
      // invalid - missing title
      { id: '2', title: '', body: 'x', scheduledForISO: new Date(Date.now() + 5000).toISOString(), notificationId: 'b', status: 'scheduled', createdAtISO: new Date().toISOString() },
      // invalid - bad ISO
      { id: '3', title: 'BadISO', body: 'x', scheduledForISO: 'not-a-date', notificationId: 'c', status: 'scheduled', createdAtISO: new Date().toISOString() },
      // invalid - bad status
      { id: '4', title: 'BadStatus', body: 'x', scheduledForISO: new Date(Date.now() + 5000).toISOString(), notificationId: 'd', status: 'unknown', createdAtISO: new Date().toISOString() },
    ]);

    const logs = await NotificationService.getNotificationLog();
    expect(Array.isArray(logs)).toBe(true);
    // Only one valid row expected
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe('1');
  });
});
