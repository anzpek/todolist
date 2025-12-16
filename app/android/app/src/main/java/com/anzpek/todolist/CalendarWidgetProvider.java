package com.anzpek.todolist;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

public class CalendarWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";
    private static final String ACTION_DATE_CLICK = "com.anzpek.todolist.DATE_CLICK";
    private static final String ACTION_PREV_MONTH = "com.anzpek.todolist.PREV_MONTH";
    private static final String ACTION_NEXT_MONTH = "com.anzpek.todolist.NEXT_MONTH";
    private static final String EXTRA_DATE_KEY = "selected_date_key";
    private static final int MAX_TASKS = 15;

    private static final int[] DAY_VIEW_IDS = {
        R.id.day_0, R.id.day_1, R.id.day_2, R.id.day_3, R.id.day_4, R.id.day_5, R.id.day_6,
        R.id.day_7, R.id.day_8, R.id.day_9, R.id.day_10, R.id.day_11, R.id.day_12, R.id.day_13,
        R.id.day_14, R.id.day_15, R.id.day_16, R.id.day_17, R.id.day_18, R.id.day_19, R.id.day_20,
        R.id.day_21, R.id.day_22, R.id.day_23, R.id.day_24, R.id.day_25, R.id.day_26, R.id.day_27,
        R.id.day_28, R.id.day_29, R.id.day_30, R.id.day_31, R.id.day_32, R.id.day_33, R.id.day_34,
        R.id.day_35, R.id.day_36, R.id.day_37, R.id.day_38, R.id.day_39, R.id.day_40, R.id.day_41
    };

    private static final int[] TASK_IDS = {
        R.id.task_0, R.id.task_1, R.id.task_2, R.id.task_3, R.id.task_4,
        R.id.task_5, R.id.task_6, R.id.task_7, R.id.task_8, R.id.task_9,
        R.id.task_10, R.id.task_11, R.id.task_12, R.id.task_13, R.id.task_14
    };

    /**
     * ISO 날짜 문자열에서 yyyy-MM-dd 부분만 추출
     */
    private static String extractDateKey(String isoDate) {
        if (isoDate == null || isoDate.isEmpty()) return "";
        // "2024-12-22" 또는 "2024-12-22T09:00:00.000Z" 형식 처리
        if (isoDate.length() >= 10) {
            return isoDate.substring(0, 10);
        }
        return "";
    }

    /**
     * 앱의 MonthlyCalendarView.tsx getTodosForDate와 동일한 로직
     * 미완료 할일만 표시
     */
    private static boolean shouldShowOnDate(JSONObject task, String targetDateKey, String todayDateKey) {
        try {
            boolean completed = task.optBoolean("completed", false);
            if (completed) return false;
            
            String startDateKey = extractDateKey(task.optString("startDate", ""));
            String dueDateKey = extractDateKey(task.optString("dueDate", ""));
            
            boolean hasStart = !startDateKey.isEmpty();
            boolean hasDue = !dueDateKey.isEmpty();
            
            // 시작일과 마감일이 모두 있는 경우: 기간 내에 있는지 확인
            if (hasStart && hasDue) {
                return targetDateKey.compareTo(startDateKey) >= 0 && targetDateKey.compareTo(dueDateKey) <= 0;
            }
            
            // 시작일만 있는 경우: 시작일 당일 + 오늘까지 이월 (미래 제외)
            if (hasStart && !hasDue) {
                // 시작일 당일
                if (targetDateKey.equals(startDateKey)) return true;
                // 시작일이 지났고 대상 날짜가 오늘 이하인 경우 (이월)
                if (targetDateKey.compareTo(startDateKey) > 0 && targetDateKey.compareTo(todayDateKey) <= 0) {
                    return true;
                }
                return false;
            }
            
            // 마감일만 있는 경우: 마감일 당일에만 표시
            if (!hasStart && hasDue) {
                return targetDateKey.equals(dueDateKey);
            }
            
            // 날짜가 없는 할일: 표시하지 않음
            return false;
        } catch (Exception e) {
            android.util.Log.e("CalendarWidget", "shouldShowOnDate error: " + e.getMessage());
            return false;
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_layout_v2);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        try {
            int displayYear = prefs.getInt("calendar_display_year", -1);
            int displayMonth = prefs.getInt("calendar_display_month", -1);
            
            Calendar displayCal = Calendar.getInstance();
            if (displayYear > 0 && displayMonth >= 0) {
                displayCal.set(Calendar.YEAR, displayYear);
                displayCal.set(Calendar.MONTH, displayMonth);
            }
            
            Calendar today = Calendar.getInstance();
            int todayYear = today.get(Calendar.YEAR);
            int todayMonth = today.get(Calendar.MONTH);
            int todayDay = today.get(Calendar.DAY_OF_MONTH);
            
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayKey = dateKeyFormat.format(today.getTime());
            
            String selectedDateKey = prefs.getString("calendar_selected_date_key", todayKey);
            
            SimpleDateFormat monthFormat = new SimpleDateFormat("MMM yyyy", Locale.ENGLISH);
            views.setTextViewText(R.id.widget_calendar_month_title, monthFormat.format(displayCal.getTime()));

            // 월 이동 버튼
            Intent prevIntent = new Intent(context, CalendarWidgetProvider.class);
            prevIntent.setAction(ACTION_PREV_MONTH);
            PendingIntent prevPendingIntent = PendingIntent.getBroadcast(context, 2000, prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_prev_month, prevPendingIntent);
            
            Intent nextIntent = new Intent(context, CalendarWidgetProvider.class);
            nextIntent.setAction(ACTION_NEXT_MONTH);
            PendingIntent nextPendingIntent = PendingIntent.getBroadcast(context, 2001, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_next_month, nextPendingIntent);

            // 오른쪽 영역 클릭시 앱 열기
            Intent appIntent = new Intent(context, MainActivity.class);
            PendingIntent appPendingIntent = PendingIntent.getActivity(context, 2002, appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.task_list_container, appPendingIntent);

            // 할일 로드 (combined 형식에서 calendar 키 파싱)
            String todoJson = prefs.getString(PREF_PREFIX_KEY + "data", "[]");
            JSONArray allTasks;
            if (todoJson.startsWith("{")) {
                JSONObject combined = new JSONObject(todoJson);
                allTasks = combined.optJSONArray("calendar");
                if (allTasks == null) {
                    allTasks = new JSONArray();
                }
            } else {
                allTasks = new JSONArray(todoJson);
            }
            
            android.util.Log.d("CalendarWidget", "Loaded " + allTasks.length() + " calendar tasks");

            // 달력 계산 (일요일 시작)
            Calendar cal = (Calendar) displayCal.clone();
            cal.set(Calendar.DAY_OF_MONTH, 1);
            int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
            int offset = dayOfWeek - Calendar.SUNDAY;
            cal.add(Calendar.DAY_OF_MONTH, -offset);

            // 날짜별 할일 분류
            Map<String, List<String>> tasksByDate = new HashMap<>();
            Calendar tempCal = (Calendar) cal.clone();
            for (int i = 0; i < 42; i++) {
                String dateKey = dateKeyFormat.format(tempCal.getTime());
                List<String> tasksForDay = new ArrayList<>();
                
                for (int j = 0; j < allTasks.length(); j++) {
                    JSONObject task = allTasks.getJSONObject(j);
                    if (shouldShowOnDate(task, dateKey, todayKey)) {
                        tasksForDay.add(task.optString("title", ""));
                    }
                }
                
                if (!tasksForDay.isEmpty()) {
                    tasksByDate.put(dateKey, tasksForDay);
                    android.util.Log.d("CalendarWidget", dateKey + " has " + tasksForDay.size() + " tasks");
                }
                tempCal.add(Calendar.DAY_OF_MONTH, 1);
            }

            // 42개 날짜 채우기
            int displayMonthValue = displayCal.get(Calendar.MONTH);
            for (int i = 0; i < 42; i++) {
                int dayOfMonth = cal.get(Calendar.DAY_OF_MONTH);
                int month = cal.get(Calendar.MONTH);
                int year = cal.get(Calendar.YEAR);
                String dateKey = dateKeyFormat.format(cal.getTime());
                
                boolean hasTask = tasksByDate.containsKey(dateKey);
                String dayText = dayOfMonth + "\n" + (hasTask ? "•" : " ");
                views.setTextViewText(DAY_VIEW_IDS[i], dayText);
                
                int color;
                boolean isSelected = dateKey.equals(selectedDateKey);
                boolean isToday = (year == todayYear && month == todayMonth && dayOfMonth == todayDay);
                
                if (isSelected) {
                    color = Color.parseColor("#10B981");
                } else if (isToday) {
                    color = Color.parseColor("#3B82F6");
                } else if (month != displayMonthValue) {
                    color = Color.parseColor("#4B5563");
                } else {
                    color = Color.WHITE;
                }
                views.setTextColor(DAY_VIEW_IDS[i], color);

                Intent clickIntent = new Intent(context, CalendarWidgetProvider.class);
                clickIntent.setAction(ACTION_DATE_CLICK);
                clickIntent.putExtra(EXTRA_DATE_KEY, dateKey);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 
                    1000 + i, clickIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                views.setOnClickPendingIntent(DAY_VIEW_IDS[i], pendingIntent);
                
                cal.add(Calendar.DAY_OF_MONTH, 1);
            }

            // 선택된 날짜의 할일 표시
            List<String> tasksForSelectedDate = tasksByDate.get(selectedDateKey);
            
            if (tasksForSelectedDate == null || tasksForSelectedDate.isEmpty()) {
                views.setViewVisibility(R.id.task_empty, android.view.View.VISIBLE);
                views.setViewVisibility(R.id.task_more, android.view.View.GONE);
                for (int id : TASK_IDS) {
                    views.setViewVisibility(id, android.view.View.GONE);
                }
            } else {
                views.setViewVisibility(R.id.task_empty, android.view.View.GONE);
                
                int displayCount = Math.min(tasksForSelectedDate.size(), MAX_TASKS);
                for (int i = 0; i < MAX_TASKS; i++) {
                    if (i < displayCount) {
                        views.setTextViewText(TASK_IDS[i], "☐ " + tasksForSelectedDate.get(i));
                        views.setViewVisibility(TASK_IDS[i], android.view.View.VISIBLE);
                    } else {
                        views.setViewVisibility(TASK_IDS[i], android.view.View.GONE);
                    }
                }
                
                if (tasksForSelectedDate.size() > MAX_TASKS) {
                    views.setTextViewText(R.id.task_more, "+ " + (tasksForSelectedDate.size() - MAX_TASKS) + " More");
                    views.setViewVisibility(R.id.task_more, android.view.View.VISIBLE);
                } else {
                    views.setViewVisibility(R.id.task_more, android.view.View.GONE);
                }
            }

        } catch (Exception e) {
            android.util.Log.e("CalendarWidget", "ERROR: " + e.getMessage(), e);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        if (ACTION_DATE_CLICK.equals(action)) {
            String selectedDateKey = intent.getStringExtra(EXTRA_DATE_KEY);
            if (selectedDateKey != null) {
                prefs.edit().putString("calendar_selected_date_key", selectedDateKey).apply();
                refreshWidget(context);
            }
        } else if (ACTION_PREV_MONTH.equals(action)) {
            Calendar cal = getDisplayCalendar(prefs);
            cal.add(Calendar.MONTH, -1);
            prefs.edit()
                .putInt("calendar_display_year", cal.get(Calendar.YEAR))
                .putInt("calendar_display_month", cal.get(Calendar.MONTH))
                .apply();
            refreshWidget(context);
        } else if (ACTION_NEXT_MONTH.equals(action)) {
            Calendar cal = getDisplayCalendar(prefs);
            cal.add(Calendar.MONTH, 1);
            prefs.edit()
                .putInt("calendar_display_year", cal.get(Calendar.YEAR))
                .putInt("calendar_display_month", cal.get(Calendar.MONTH))
                .apply();
            refreshWidget(context);
        } else if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)) {
            refreshWidget(context);
        }
    }
    
    private Calendar getDisplayCalendar(SharedPreferences prefs) {
        int year = prefs.getInt("calendar_display_year", -1);
        int month = prefs.getInt("calendar_display_month", -1);
        Calendar cal = Calendar.getInstance();
        if (year > 0 && month >= 0) {
            cal.set(Calendar.YEAR, year);
            cal.set(Calendar.MONTH, month);
        }
        return cal;
    }
    
    private void refreshWidget(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, CalendarWidgetProvider.class);
        int[] ids = mgr.getAppWidgetIds(thisWidget);
        onUpdate(context, mgr, ids);
    }
    
    @Override
    public void onEnabled(Context context) {}

    @Override
    public void onDisabled(Context context) {}
}
