"""
Mood Analytics — SQL-based stress statistics.

Computes:
- Daily stress trend
- Weekday grouping to find the "easiest day"
"""
from typing import List, Dict, Any
from collections import defaultdict
from datetime import datetime, date

from app.schemas.mood import DailyStress, WeekdayStats, MoodStats

WEEKDAY_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]


def compute_mood_stats(entries: List[Dict[str, Any]]) -> MoodStats:
    """
    Compute mood statistics from raw mood entries.

    Args:
        entries: List of dicts with keys: stress_level (int), created_at (str ISO)

    Returns:
        MoodStats with daily trend, weekday analysis, and easiest day.
    """
    if not entries:
        return MoodStats(
            daily_trend=[],
            weekday_stats=[],
            easiest_day="Нет данных",
            easiest_day_avg=0.0,
            overall_avg=0.0,
            total_entries=0,
        )

    # ── Daily grouping ────────────────────────────────────────────────────────
    daily: Dict[str, List[int]] = defaultdict(list)
    weekday: Dict[int, List[int]] = defaultdict(list)

    for entry in entries:
        created_at = entry.get("created_at", "")
        stress = int(entry.get("stress_level", 5))

        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            day_str = dt.date().isoformat()
            wd = dt.weekday()  # 0=Monday, 6=Sunday
        except (ValueError, AttributeError):
            continue

        daily[day_str].append(stress)
        weekday[wd].append(stress)

    # Build daily trend (sorted by date)
    daily_trend: List[DailyStress] = []
    for day_str in sorted(daily.keys()):
        vals = daily[day_str]
        daily_trend.append(
            DailyStress(
                date=day_str,
                avg_stress=round(sum(vals) / len(vals), 2),
                entries_count=len(vals),
            )
        )

    # ── Weekday grouping ─────────────────────────────────────────────────────
    weekday_stats: List[WeekdayStats] = []
    for wd_num in range(7):
        vals = weekday.get(wd_num, [])
        if not vals:
            continue
        weekday_stats.append(
            WeekdayStats(
                weekday=WEEKDAY_NAMES[wd_num],
                weekday_num=wd_num,
                avg_stress=round(sum(vals) / len(vals), 2),
                entries_count=len(vals),
            )
        )

    # Sort by weekday number
    weekday_stats.sort(key=lambda x: x.weekday_num)

    # ── Easiest day (lowest avg stress) ──────────────────────────────────────
    all_stresses = [s for entry_list in daily.values() for s in entry_list]
    overall_avg = round(sum(all_stresses) / len(all_stresses), 2) if all_stresses else 0.0

    if weekday_stats:
        easiest = min(weekday_stats, key=lambda x: x.avg_stress)
        easiest_day = easiest.weekday
        easiest_day_avg = easiest.avg_stress
    else:
        easiest_day = "Нет данных"
        easiest_day_avg = 0.0

    return MoodStats(
        daily_trend=daily_trend,
        weekday_stats=weekday_stats,
        easiest_day=easiest_day,
        easiest_day_avg=easiest_day_avg,
        overall_avg=overall_avg,
        total_entries=len(entries),
    )
