/**
 * Calendar Heatmap Data Builder
 * Transforms time-series activity data into calendar heatmap format
 *
 * Input: Historical data with daily metrics
 * Output: Day-by-day calendar data with activity values
 */

import { CalendarHeatmapData, CalendarDay } from '../../visualization/webview/visualizations/CalendarHeatmap';

export interface DailyActivity {
  date: Date | string;
  value: number;
  details?: Record<string, any>;
}

export interface CommitActivity {
  date: Date | string;
  commits: number;
  additions: number;
  deletions: number;
  files: number;
}

export class CalendarHeatmapDataBuilder {
  /**
   * Build from daily activity data
   */
  static buildFromDailyActivity(activities: DailyActivity[], metric: string): CalendarHeatmapData {
    if (activities.length === 0) {
      return this.buildSampleData();
    }

    const days: CalendarDay[] = activities.map(activity => ({
      date: typeof activity.date === 'string' ? new Date(activity.date) : activity.date,
      value: activity.value,
      details: activity.details
    }));

    // Sort by date
    days.sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateA.getTime() - dateB.getTime();
    });

    const maxValue = Math.max(...days.map(d => d.value));

    return { days, metric, maxValue };
  }

  /**
   * Build from analysis history
   */
  static buildFromAnalysisHistory(analyses: any[]): CalendarHeatmapData {
    if (!analyses || analyses.length === 0) {
      return this.buildSampleData();
    }

    const dayMap = new Map<string, CalendarDay>();

    analyses.forEach(analysis => {
      const date = analysis.timestamp || analysis.date;
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const dayKey = dateObj.toISOString().split('T')[0];

      // Calculate total issues for this analysis
      let totalIssues = 0;
      let criticalIssues = 0;
      let highIssues = 0;

      if (analysis.categories) {
        analysis.categories.forEach((cat: any) => {
          const issues = cat.issues?.length || 0;
          totalIssues += issues;

          if (cat.issues) {
            criticalIssues += cat.issues.filter((i: any) => i.severity === 'critical').length;
            highIssues += cat.issues.filter((i: any) => i.severity === 'high').length;
          }
        });
      }

      // Aggregate if multiple analyses on same day
      if (dayMap.has(dayKey)) {
        const existing = dayMap.get(dayKey)!;
        existing.value += totalIssues;
        if (existing.details) {
          existing.details.critical = (existing.details.critical || 0) + criticalIssues;
          existing.details.high = (existing.details.high || 0) + highIssues;
          existing.details.analyses = (existing.details.analyses || 1) + 1;
        }
      } else {
        dayMap.set(dayKey, {
          date: dateObj,
          value: totalIssues,
          details: {
            critical: criticalIssues,
            high: highIssues,
            analyses: 1
          }
        });
      }
    });

    const days = Array.from(dayMap.values()).sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateA.getTime() - dateB.getTime();
    });

    const maxValue = Math.max(...days.map(d => d.value));

    return { days, metric: 'Total Issues', maxValue };
  }

  /**
   * Build from commit activity
   */
  static buildFromCommitActivity(commits: CommitActivity[]): CalendarHeatmapData {
    if (commits.length === 0) {
      return this.buildSampleData();
    }

    const days: CalendarDay[] = commits.map(commit => ({
      date: typeof commit.date === 'string' ? new Date(commit.date) : commit.date,
      value: commit.commits,
      details: {
        commits: commit.commits,
        additions: commit.additions,
        deletions: commit.deletions,
        files: commit.files
      }
    }));

    // Sort by date
    days.sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateA.getTime() - dateB.getTime();
    });

    const maxValue = Math.max(...days.map(d => d.value));

    return { days, metric: 'Commits', maxValue };
  }

  /**
   * Build sample data for demonstration
   */
  static buildSampleData(): CalendarHeatmapData {
    const days: CalendarDay[] = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      const dayOfWeek = date.getDay();

      // Simulate realistic activity patterns
      // Weekends have lower activity
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseActivity = isWeekend ? 0.3 : 1.0;

      // Add some randomness and trends
      const monthProgress = date.getMonth() / 12;
      const trend = Math.sin(monthProgress * Math.PI * 4); // Cyclical pattern
      const random = Math.random();

      const value = Math.floor(baseActivity * (10 + trend * 5 + random * 10));

      days.push({
        date: new Date(date),
        value,
        details: {
          commits: Math.floor(value * 0.3),
          issues: Math.floor(value * 0.5),
          tests: Math.floor(value * 0.2)
        }
      });
    }

    return {
      days,
      metric: 'Activity',
      maxValue: Math.max(...days.map(d => d.value))
    };
  }

  /**
   * Aggregate by day (combine multiple entries for same day)
   */
  static aggregateByDay(data: CalendarHeatmapData): CalendarHeatmapData {
    const dayMap = new Map<string, CalendarDay>();

    data.days.forEach(day => {
      const dateObj = typeof day.date === 'string' ? new Date(day.date) : day.date;
      const dayKey = dateObj.toISOString().split('T')[0];

      if (dayMap.has(dayKey)) {
        const existing = dayMap.get(dayKey)!;
        existing.value += day.value;

        // Merge details
        if (day.details && existing.details) {
          Object.entries(day.details).forEach(([key, value]) => {
            if (typeof value === 'number') {
              existing.details![key] = (existing.details![key] as number || 0) + value;
            }
          });
        }
      } else {
        dayMap.set(dayKey, {
          date: new Date(dateObj),
          value: day.value,
          details: day.details ? { ...day.details } : undefined
        });
      }
    });

    const aggregatedDays = Array.from(dayMap.values()).sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateA.getTime() - dateB.getTime();
    });

    return {
      days: aggregatedDays,
      metric: data.metric,
      maxValue: Math.max(...aggregatedDays.map(d => d.value))
    };
  }

  /**
   * Fill gaps with zero values for all days in range
   */
  static fillGaps(data: CalendarHeatmapData): CalendarHeatmapData {
    if (data.days.length === 0) return data;

    const filled: CalendarDay[] = [];

    // Get date range
    const sortedDays = [...data.days].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateA.getTime() - dateB.getTime();
    });

    const startDate = typeof sortedDays[0].date === 'string'
      ? new Date(sortedDays[0].date)
      : sortedDays[0].date;
    const endDate = typeof sortedDays[sortedDays.length - 1].date === 'string'
      ? new Date(sortedDays[sortedDays.length - 1].date)
      : sortedDays[sortedDays.length - 1].date;

    // Create map for quick lookup
    const dayMap = new Map(
      data.days.map(d => {
        const dateObj = typeof d.date === 'string' ? new Date(d.date) : d.date;
        return [dateObj.toISOString().split('T')[0], d];
      })
    );

    // Fill all days in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayKey = d.toISOString().split('T')[0];
      const existing = dayMap.get(dayKey);

      if (existing) {
        filled.push(existing);
      } else {
        filled.push({
          date: new Date(d),
          value: 0
        });
      }
    }

    return {
      days: filled,
      metric: data.metric,
      maxValue: data.maxValue
    };
  }

  /**
   * Filter by date range
   */
  static filterByDateRange(
    data: CalendarHeatmapData,
    startDate: Date,
    endDate: Date
  ): CalendarHeatmapData {
    const filtered = data.days.filter(day => {
      const dateObj = typeof day.date === 'string' ? new Date(day.date) : day.date;
      return dateObj >= startDate && dateObj <= endDate;
    });

    return {
      days: filtered,
      metric: data.metric,
      maxValue: Math.max(...filtered.map(d => d.value))
    };
  }

  /**
   * Get statistics for the calendar data
   */
  static getStatistics(data: CalendarHeatmapData): {
    totalDays: number;
    activeDays: number;
    totalValue: number;
    averageValue: number;
    maxValue: number;
    streakCurrent: number;
    streakLongest: number;
  } {
    const totalDays = data.days.length;
    const activeDays = data.days.filter(d => d.value > 0).length;
    const totalValue = data.days.reduce((sum, d) => sum + d.value, 0);
    const averageValue = totalDays > 0 ? totalValue / totalDays : 0;
    const maxValue = data.maxValue || Math.max(...data.days.map(d => d.value));

    // Calculate streaks
    let streakCurrent = 0;
    let streakLongest = 0;
    let currentStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort by date
    const sortedDays = [...data.days].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateB.getTime() - dateA.getTime(); // Descending for current streak
    });

    for (const day of sortedDays) {
      const dateObj = typeof day.date === 'string' ? new Date(day.date) : day.date;
      dateObj.setHours(0, 0, 0, 0);

      if (day.value > 0) {
        currentStreak++;
        streakLongest = Math.max(streakLongest, currentStreak);

        // Check if this is part of current streak (from today backwards)
        if (streakCurrent === 0 && dateObj <= today) {
          streakCurrent = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }

    return {
      totalDays,
      activeDays,
      totalValue,
      averageValue,
      maxValue,
      streakCurrent,
      streakLongest
    };
  }

  /**
   * Get weekly aggregates
   */
  static getWeeklyAggregates(data: CalendarHeatmapData): Array<{
    week: number;
    year: number;
    startDate: Date;
    totalValue: number;
    activeDays: number;
  }> {
    const weekMap = new Map<string, {
      week: number;
      year: number;
      startDate: Date;
      totalValue: number;
      activeDays: number;
    }>();

    data.days.forEach(day => {
      const dateObj = typeof day.date === 'string' ? new Date(day.date) : day.date;
      const year = dateObj.getFullYear();
      const week = this.getWeekNumber(dateObj);
      const key = `${year}-W${week}`;

      if (weekMap.has(key)) {
        const weekData = weekMap.get(key)!;
        weekData.totalValue += day.value;
        if (day.value > 0) weekData.activeDays++;
      } else {
        // Calculate week start date
        const weekStart = new Date(dateObj);
        weekStart.setDate(dateObj.getDate() - dateObj.getDay());

        weekMap.set(key, {
          week,
          year,
          startDate: weekStart,
          totalValue: day.value,
          activeDays: day.value > 0 ? 1 : 0
        });
      }
    });

    return Array.from(weekMap.values()).sort((a, b) =>
      a.startDate.getTime() - b.startDate.getTime()
    );
  }

  /**
   * Get week number within year
   */
  private static getWeekNumber(date: Date): number {
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - yearStart.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek);
  }
}
