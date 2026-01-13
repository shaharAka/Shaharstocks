import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isMarketOpen } from './utils';

describe('jobs/utils', () => {
  describe('isMarketOpen', () => {
    let originalDate: DateConstructor;
    
    beforeEach(() => {
      // Store original Date constructor
      originalDate = global.Date;
    });

    afterEach(() => {
      // Restore original Date constructor
      global.Date = originalDate;
    });

    it('should return false on weekends (Saturday)', () => {
      // Mock Date to be a Saturday (day 6)
      const saturday = new Date('2024-01-06T14:30:00-05:00'); // Saturday, 2:30 PM ET
      vi.spyOn(global, 'Date').mockImplementation(() => saturday as any);
      vi.spyOn(Date, 'now').mockReturnValue(saturday.getTime());
      
      expect(isMarketOpen()).toBe(false);
    });

    it('should return false on weekends (Sunday)', () => {
      // Mock Date to be a Sunday (day 0)
      const sunday = new Date('2024-01-07T14:30:00-05:00'); // Sunday, 2:30 PM ET
      vi.spyOn(global, 'Date').mockImplementation(() => sunday as any);
      vi.spyOn(Date, 'now').mockReturnValue(sunday.getTime());
      
      expect(isMarketOpen()).toBe(false);
    });

    it('should return true during market hours on weekdays', () => {
      // Mock Date to be Monday 10:00 AM ET (market is open)
      const mondayMorning = new Date('2024-01-08T10:00:00-05:00'); // Monday, 10:00 AM ET
      vi.spyOn(global, 'Date').mockImplementation(() => mondayMorning as any);
      vi.spyOn(Date, 'now').mockReturnValue(mondayMorning.getTime());
      
      expect(isMarketOpen()).toBe(true);
    });

    it('should return true at market open (9:30 AM ET)', () => {
      // Mock Date to be Monday 9:30 AM ET (exactly market open)
      const mondayOpen = new Date('2024-01-08T09:30:00-05:00'); // Monday, 9:30 AM ET
      vi.spyOn(global, 'Date').mockImplementation(() => mondayOpen as any);
      vi.spyOn(Date, 'now').mockReturnValue(mondayOpen.getTime());
      
      expect(isMarketOpen()).toBe(true);
    });

    it('should return false before market open (9:29 AM ET)', () => {
      // Mock Date to be Monday 9:29 AM ET (before market open)
      const mondayBeforeOpen = new Date('2024-01-08T09:29:00-05:00'); // Monday, 9:29 AM ET
      vi.spyOn(global, 'Date').mockImplementation(() => mondayBeforeOpen as any);
      vi.spyOn(Date, 'now').mockReturnValue(mondayBeforeOpen.getTime());
      
      expect(isMarketOpen()).toBe(false);
    });

    it('should return false at market close (4:00 PM ET)', () => {
      // Mock Date to be Monday 4:00 PM ET (exactly market close)
      const mondayClose = new Date('2024-01-08T16:00:00-05:00'); // Monday, 4:00 PM ET
      vi.spyOn(global, 'Date').mockImplementation(() => mondayClose as any);
      vi.spyOn(Date, 'now').mockReturnValue(mondayClose.getTime());
      
      expect(isMarketOpen()).toBe(false);
    });

    it('should return false after market close (4:01 PM ET)', () => {
      // Mock Date to be Monday 4:01 PM ET (after market close)
      const mondayAfterClose = new Date('2024-01-08T16:01:00-05:00'); // Monday, 4:01 PM ET
      vi.spyOn(global, 'Date').mockImplementation(() => mondayAfterClose as any);
      vi.spyOn(Date, 'now').mockReturnValue(mondayAfterClose.getTime());
      
      expect(isMarketOpen()).toBe(false);
    });

    it('should return true in the middle of trading day (12:00 PM ET)', () => {
      // Mock Date to be Monday 12:00 PM ET (middle of trading day)
      const mondayNoon = new Date('2024-01-08T12:00:00-05:00'); // Monday, 12:00 PM ET
      vi.spyOn(global, 'Date').mockImplementation(() => mondayNoon as any);
      vi.spyOn(Date, 'now').mockReturnValue(mondayNoon.getTime());
      
      expect(isMarketOpen()).toBe(true);
    });

    it('should handle timezone conversion correctly', () => {
      // Test that it properly converts to Eastern Time
      // If current time is 3:00 PM ET, market should be open
      const mondayAfternoon = new Date('2024-01-08T15:00:00-05:00'); // Monday, 3:00 PM ET
      vi.spyOn(global, 'Date').mockImplementation(() => mondayAfternoon as any);
      vi.spyOn(Date, 'now').mockReturnValue(mondayAfternoon.getTime());
      
      expect(isMarketOpen()).toBe(true);
    });
  });
});

