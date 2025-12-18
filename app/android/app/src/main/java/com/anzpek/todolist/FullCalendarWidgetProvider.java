package com.anzpek.todolist;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class FullCalendarWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";
    private static final String ACTION_PREV_MONTH = "com.anzpek.todolist.FULLCAL_PREV";
    private static final String ACTION_NEXT_MONTH = "com.anzpek.todolist.FULLCAL_NEXT";
    private static final String ACTION_GO_TODAY = "com.anzpek.todolist.FULLCAL_TODAY";
    private static final String ACTION_REFRESH = "com.anzpek.todolist.FULLCAL_REFRESH";
    
    private static final int TOTAL_CELLS = 35; // 5주 x 7일
    private static final int MAX_TASKS = 8; // 각 셀에 8개 할일
    
    // 35개 날짜 셀 IDs
    private static final int[] DAY_IDS = {
        R.id.day_0, R.id.day_1, R.id.day_2, R.id.day_3, R.id.day_4, R.id.day_5, R.id.day_6,
        R.id.day_7, R.id.day_8, R.id.day_9, R.id.day_10, R.id.day_11, R.id.day_12, R.id.day_13,
        R.id.day_14, R.id.day_15, R.id.day_16, R.id.day_17, R.id.day_18, R.id.day_19, R.id.day_20,
        R.id.day_21, R.id.day_22, R.id.day_23, R.id.day_24, R.id.day_25, R.id.day_26, R.id.day_27,
        R.id.day_28, R.id.day_29, R.id.day_30, R.id.day_31, R.id.day_32, R.id.day_33, R.id.day_34
    };
    
    // 각 셀의 task IDs - 8개 할일 + more
    private static final int[][] TASK_IDS = {
        {R.id.task_0_0, R.id.task_0_1, R.id.task_0_2, R.id.task_0_3, R.id.task_0_4, R.id.task_0_5, R.id.task_0_6, R.id.task_0_7, R.id.task_0_more},
        {R.id.task_1_0, R.id.task_1_1, R.id.task_1_2, R.id.task_1_3, R.id.task_1_4, R.id.task_1_5, R.id.task_1_6, R.id.task_1_7, R.id.task_1_more},
        {R.id.task_2_0, R.id.task_2_1, R.id.task_2_2, R.id.task_2_3, R.id.task_2_4, R.id.task_2_5, R.id.task_2_6, R.id.task_2_7, R.id.task_2_more},
        {R.id.task_3_0, R.id.task_3_1, R.id.task_3_2, R.id.task_3_3, R.id.task_3_4, R.id.task_3_5, R.id.task_3_6, R.id.task_3_7, R.id.task_3_more},
        {R.id.task_4_0, R.id.task_4_1, R.id.task_4_2, R.id.task_4_3, R.id.task_4_4, R.id.task_4_5, R.id.task_4_6, R.id.task_4_7, R.id.task_4_more},
        {R.id.task_5_0, R.id.task_5_1, R.id.task_5_2, R.id.task_5_3, R.id.task_5_4, R.id.task_5_5, R.id.task_5_6, R.id.task_5_7, R.id.task_5_more},
        {R.id.task_6_0, R.id.task_6_1, R.id.task_6_2, R.id.task_6_3, R.id.task_6_4, R.id.task_6_5, R.id.task_6_6, R.id.task_6_7, R.id.task_6_more},
        {R.id.task_7_0, R.id.task_7_1, R.id.task_7_2, R.id.task_7_3, R.id.task_7_4, R.id.task_7_5, R.id.task_7_6, R.id.task_7_7, R.id.task_7_more},
        {R.id.task_8_0, R.id.task_8_1, R.id.task_8_2, R.id.task_8_3, R.id.task_8_4, R.id.task_8_5, R.id.task_8_6, R.id.task_8_7, R.id.task_8_more},
        {R.id.task_9_0, R.id.task_9_1, R.id.task_9_2, R.id.task_9_3, R.id.task_9_4, R.id.task_9_5, R.id.task_9_6, R.id.task_9_7, R.id.task_9_more},
        {R.id.task_10_0, R.id.task_10_1, R.id.task_10_2, R.id.task_10_3, R.id.task_10_4, R.id.task_10_5, R.id.task_10_6, R.id.task_10_7, R.id.task_10_more},
        {R.id.task_11_0, R.id.task_11_1, R.id.task_11_2, R.id.task_11_3, R.id.task_11_4, R.id.task_11_5, R.id.task_11_6, R.id.task_11_7, R.id.task_11_more},
        {R.id.task_12_0, R.id.task_12_1, R.id.task_12_2, R.id.task_12_3, R.id.task_12_4, R.id.task_12_5, R.id.task_12_6, R.id.task_12_7, R.id.task_12_more},
        {R.id.task_13_0, R.id.task_13_1, R.id.task_13_2, R.id.task_13_3, R.id.task_13_4, R.id.task_13_5, R.id.task_13_6, R.id.task_13_7, R.id.task_13_more},
        {R.id.task_14_0, R.id.task_14_1, R.id.task_14_2, R.id.task_14_3, R.id.task_14_4, R.id.task_14_5, R.id.task_14_6, R.id.task_14_7, R.id.task_14_more},
        {R.id.task_15_0, R.id.task_15_1, R.id.task_15_2, R.id.task_15_3, R.id.task_15_4, R.id.task_15_5, R.id.task_15_6, R.id.task_15_7, R.id.task_15_more},
        {R.id.task_16_0, R.id.task_16_1, R.id.task_16_2, R.id.task_16_3, R.id.task_16_4, R.id.task_16_5, R.id.task_16_6, R.id.task_16_7, R.id.task_16_more},
        {R.id.task_17_0, R.id.task_17_1, R.id.task_17_2, R.id.task_17_3, R.id.task_17_4, R.id.task_17_5, R.id.task_17_6, R.id.task_17_7, R.id.task_17_more},
        {R.id.task_18_0, R.id.task_18_1, R.id.task_18_2, R.id.task_18_3, R.id.task_18_4, R.id.task_18_5, R.id.task_18_6, R.id.task_18_7, R.id.task_18_more},
        {R.id.task_19_0, R.id.task_19_1, R.id.task_19_2, R.id.task_19_3, R.id.task_19_4, R.id.task_19_5, R.id.task_19_6, R.id.task_19_7, R.id.task_19_more},
        {R.id.task_20_0, R.id.task_20_1, R.id.task_20_2, R.id.task_20_3, R.id.task_20_4, R.id.task_20_5, R.id.task_20_6, R.id.task_20_7, R.id.task_20_more},
        {R.id.task_21_0, R.id.task_21_1, R.id.task_21_2, R.id.task_21_3, R.id.task_21_4, R.id.task_21_5, R.id.task_21_6, R.id.task_21_7, R.id.task_21_more},
        {R.id.task_22_0, R.id.task_22_1, R.id.task_22_2, R.id.task_22_3, R.id.task_22_4, R.id.task_22_5, R.id.task_22_6, R.id.task_22_7, R.id.task_22_more},
        {R.id.task_23_0, R.id.task_23_1, R.id.task_23_2, R.id.task_23_3, R.id.task_23_4, R.id.task_23_5, R.id.task_23_6, R.id.task_23_7, R.id.task_23_more},
        {R.id.task_24_0, R.id.task_24_1, R.id.task_24_2, R.id.task_24_3, R.id.task_24_4, R.id.task_24_5, R.id.task_24_6, R.id.task_24_7, R.id.task_24_more},
        {R.id.task_25_0, R.id.task_25_1, R.id.task_25_2, R.id.task_25_3, R.id.task_25_4, R.id.task_25_5, R.id.task_25_6, R.id.task_25_7, R.id.task_25_more},
        {R.id.task_26_0, R.id.task_26_1, R.id.task_26_2, R.id.task_26_3, R.id.task_26_4, R.id.task_26_5, R.id.task_26_6, R.id.task_26_7, R.id.task_26_more},
        {R.id.task_27_0, R.id.task_27_1, R.id.task_27_2, R.id.task_27_3, R.id.task_27_4, R.id.task_27_5, R.id.task_27_6, R.id.task_27_7, R.id.task_27_more},
        {R.id.task_28_0, R.id.task_28_1, R.id.task_28_2, R.id.task_28_3, R.id.task_28_4, R.id.task_28_5, R.id.task_28_6, R.id.task_28_7, R.id.task_28_more},
        {R.id.task_29_0, R.id.task_29_1, R.id.task_29_2, R.id.task_29_3, R.id.task_29_4, R.id.task_29_5, R.id.task_29_6, R.id.task_29_7, R.id.task_29_more},
        {R.id.task_30_0, R.id.task_30_1, R.id.task_30_2, R.id.task_30_3, R.id.task_30_4, R.id.task_30_5, R.id.task_30_6, R.id.task_30_7, R.id.task_30_more},
        {R.id.task_31_0, R.id.task_31_1, R.id.task_31_2, R.id.task_31_3, R.id.task_31_4, R.id.task_31_5, R.id.task_31_6, R.id.task_31_7, R.id.task_31_more},
        {R.id.task_32_0, R.id.task_32_1, R.id.task_32_2, R.id.task_32_3, R.id.task_32_4, R.id.task_32_5, R.id.task_32_6, R.id.task_32_7, R.id.task_32_more},
        {R.id.task_33_0, R.id.task_33_1, R.id.task_33_2, R.id.task_33_3, R.id.task_33_4, R.id.task_33_5, R.id.task_33_6, R.id.task_33_7, R.id.task_33_more},
        {R.id.task_34_0, R.id.task_34_1, R.id.task_34_2, R.id.task_34_3, R.id.task_34_4, R.id.task_34_5, R.id.task_34_6, R.id.task_34_7, R.id.task_34_more}
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_full_calendar_layout);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        try {
            Calendar today = Calendar.getInstance();
            String todayKey = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(today.getTime());
            
            int displayMonth = prefs.getInt("fullcal_widget_month", today.get(Calendar.MONTH));
            int displayYear = prefs.getInt("fullcal_widget_year", today.get(Calendar.YEAR));
            
            Calendar displayCal = Calendar.getInstance();
            displayCal.set(displayYear, displayMonth, 1);
            
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            SimpleDateFormat monthFormat = new SimpleDateFormat("yyyy년 M월", Locale.KOREAN);
            views.setTextViewText(R.id.widget_month_title, monthFormat.format(displayCal.getTime()));
            
            // 네비게이션
            Intent prevIntent = new Intent(context, FullCalendarWidgetProvider.class);
            prevIntent.setAction(ACTION_PREV_MONTH);
            views.setOnClickPendingIntent(R.id.btn_prev_month, PendingIntent.getBroadcast(context, 4000, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));
            
            Intent nextIntent = new Intent(context, FullCalendarWidgetProvider.class);
            nextIntent.setAction(ACTION_NEXT_MONTH);
            views.setOnClickPendingIntent(R.id.btn_next_month, PendingIntent.getBroadcast(context, 4001, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));
            
            Intent goTodayIntent = new Intent(context, FullCalendarWidgetProvider.class);
            goTodayIntent.setAction(ACTION_GO_TODAY);
            views.setOnClickPendingIntent(R.id.widget_month_title, PendingIntent.getBroadcast(context, 4002, goTodayIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));
            
            Intent addIntent = new Intent(context, MainActivity.class);
            addIntent.setAction(Intent.ACTION_VIEW);
            addIntent.setData(Uri.parse("todolist://add?t=" + System.currentTimeMillis()));
            addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            views.setOnClickPendingIntent(R.id.btn_add_todo, PendingIntent.getActivity(context, 4003, addIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));
            
            Intent refreshIntent = new Intent(context, FullCalendarWidgetProvider.class);
            refreshIntent.setAction(ACTION_REFRESH);
            views.setOnClickPendingIntent(R.id.btn_refresh, PendingIntent.getBroadcast(context, 4004, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));
            
            // 데이터 로드
            String dataStr = prefs.getString(PREF_PREFIX_KEY + "data", "");
            Map<String, List<TaskInfo>> tasksByDate = new HashMap<>();
            
            if (dataStr != null && !dataStr.isEmpty() && dataStr.startsWith("{")) {
                JSONObject combinedData = new JSONObject(dataStr);
                
                // 휴가 처리
                JSONArray vacationsArray = combinedData.optJSONArray("vacations");
                if (vacationsArray != null) {
                    for (int i = 0; i < vacationsArray.length(); i++) {
                        JSONObject vacation = vacationsArray.getJSONObject(i);
                        String vacDate = vacation.optString("date", "");
                        if (!vacDate.isEmpty()) {
                            String employeeName = vacation.optString("employeeName", "");
                            String type = vacation.optString("type", "휴가");
                            String title = employeeName.isEmpty() ? type : employeeName + " " + type;
                            addTask(tasksByDate, vacDate, title, "vacation", true);
                        }
                    }
                }
                
                // 할일 처리
                JSONArray calendarArray = combinedData.optJSONArray("calendar");
                if (calendarArray != null) {
                    for (int i = 0; i < calendarArray.length(); i++) {
                        JSONObject todo = calendarArray.getJSONObject(i);
                        boolean completed = todo.optBoolean("completed", false);
                        boolean isVacation = todo.optBoolean("isVacation", false);
                        
                        if (completed && !isVacation) continue;
                        
                        String title = todo.optString("title", "");
                        String priority = todo.optString("priority", "medium");
                        String startDate = todo.optString("startDate", "");
                        String dueDate = todo.optString("dueDate", "");
                        
                        String startDateKey = (startDate != null && startDate.length() >= 10) ? startDate.substring(0, 10) : "";
                        String dueDateKey = (dueDate != null && dueDate.length() >= 10) ? dueDate.substring(0, 10) : "";
                        
                        if (!startDateKey.isEmpty() && !dueDateKey.isEmpty()) {
                            // 시작일~종료일 범위
                            Calendar startCal = Calendar.getInstance();
                            Calendar endCal = Calendar.getInstance();
                            startCal.setTime(dateKeyFormat.parse(startDateKey));
                            endCal.setTime(dateKeyFormat.parse(dueDateKey));
                            while (!startCal.after(endCal)) {
                                addTask(tasksByDate, dateKeyFormat.format(startCal.getTime()), title, priority, isVacation);
                                startCal.add(Calendar.DAY_OF_MONTH, 1);
                            }
                        } else if (!startDateKey.isEmpty()) {
                            // 시작일만 있는 경우 (반복 할일 포함)
                            Calendar startCal = Calendar.getInstance();
                            startCal.setTime(dateKeyFormat.parse(startDateKey));
                            
                            // 시작일이 미래인 경우: 해당 날짜에만 표시
                            // 시작일이 과거이고 미완료인 경우: 시작일부터 오늘까지 표시
                            if (startCal.after(today)) {
                                // 미래 날짜: 해당 날짜에만 표시
                                addTask(tasksByDate, startDateKey, title, priority, isVacation);
                            } else {
                                // 과거 또는 오늘: 시작일부터 오늘까지 표시 (이월)
                                Calendar endCal = (Calendar) today.clone();
                                while (!startCal.after(endCal)) {
                                    addTask(tasksByDate, dateKeyFormat.format(startCal.getTime()), title, priority, isVacation);
                                    startCal.add(Calendar.DAY_OF_MONTH, 1);
                                }
                            }
                        } else if (!dueDateKey.isEmpty()) {
                            addTask(tasksByDate, dueDateKey, title, priority, isVacation);
                        }
                    }
                }
            }
            
            // 달력 시작 날짜
            Calendar calStart = (Calendar) displayCal.clone();
            calStart.add(Calendar.DAY_OF_MONTH, -(calStart.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY));
            int currentMonth = displayCal.get(Calendar.MONTH);
            
            // 35개 셀 채우기
            for (int i = 0; i < TOTAL_CELLS; i++) {
                Calendar cellCal = (Calendar) calStart.clone();
                cellCal.add(Calendar.DAY_OF_MONTH, i);
                
                int dayOfMonth = cellCal.get(Calendar.DAY_OF_MONTH);
                String dayKey = dateKeyFormat.format(cellCal.getTime());
                boolean isCurrentMonth = cellCal.get(Calendar.MONTH) == currentMonth;
                boolean isToday = dayKey.equals(todayKey);
                int cellDayOfWeek = cellCal.get(Calendar.DAY_OF_WEEK);
                
                views.setTextViewText(DAY_IDS[i], String.valueOf(dayOfMonth));
                
                if (isToday) views.setTextColor(DAY_IDS[i], Color.parseColor("#3B82F6"));
                else if (!isCurrentMonth) views.setTextColor(DAY_IDS[i], Color.parseColor("#6B7280"));
                else if (cellDayOfWeek == Calendar.SUNDAY) views.setTextColor(DAY_IDS[i], Color.parseColor("#EF4444"));
                else if (cellDayOfWeek == Calendar.SATURDAY) views.setTextColor(DAY_IDS[i], Color.parseColor("#3B82F6"));
                else views.setTextColor(DAY_IDS[i], Color.WHITE);
                
                List<TaskInfo> tasks = tasksByDate.get(dayKey);
                
                for (int taskIdx = 0; taskIdx < MAX_TASKS; taskIdx++) {
                    int taskViewId = TASK_IDS[i][taskIdx];
                    if (tasks != null && taskIdx < tasks.size()) {
                        TaskInfo task = tasks.get(taskIdx);
                        views.setTextViewText(taskViewId, task.title);
                        views.setInt(taskViewId, "setBackgroundResource", getBorderDrawable(task.priority, task.isVacation));
                        views.setViewVisibility(taskViewId, android.view.View.VISIBLE);
                    } else {
                        views.setViewVisibility(taskViewId, android.view.View.GONE);
                    }
                }
                
                int moreViewId = TASK_IDS[i][MAX_TASKS];
                if (tasks != null && tasks.size() > MAX_TASKS) {
                    views.setTextViewText(moreViewId, "+" + (tasks.size() - MAX_TASKS) + "개");
                    views.setViewVisibility(moreViewId, android.view.View.VISIBLE);
                } else {
                    views.setViewVisibility(moreViewId, android.view.View.GONE);
                }
            }
            
        } catch (Exception e) {
            android.util.Log.e("FullCalWidget", "Error: " + e.getMessage(), e);
        }
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
    
    private static int getBorderDrawable(String priority, boolean isVacation) {
        if (isVacation) return R.drawable.task_border_low;
        if (priority == null) return R.drawable.task_border_medium;
        switch (priority) {
            case "urgent": return R.drawable.task_border_urgent;
            case "high": return R.drawable.task_border_high;
            case "medium": return R.drawable.task_border_medium;
            case "low": return R.drawable.task_border_low;
            case "vacation": return R.drawable.task_border_low;
            default: return R.drawable.task_border_default;
        }
    }
    
    private static void addTask(Map<String, List<TaskInfo>> tasksByDate, String dateKey, String title, String priority, boolean isVacation) {
        if (!tasksByDate.containsKey(dateKey)) tasksByDate.put(dateKey, new ArrayList<TaskInfo>());
        if (isVacation) tasksByDate.get(dateKey).add(0, new TaskInfo(title, priority, isVacation));
        else tasksByDate.get(dateKey).add(new TaskInfo(title, priority, isVacation));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) return;
        
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        Calendar today = Calendar.getInstance();
        int displayMonth = prefs.getInt("fullcal_widget_month", today.get(Calendar.MONTH));
        int displayYear = prefs.getInt("fullcal_widget_year", today.get(Calendar.YEAR));
        
        if (ACTION_PREV_MONTH.equals(action)) {
            if (--displayMonth < 0) { displayMonth = 11; displayYear--; }
            prefs.edit().putInt("fullcal_widget_month", displayMonth).putInt("fullcal_widget_year", displayYear).apply();
            refreshWidget(context);
        } else if (ACTION_NEXT_MONTH.equals(action)) {
            if (++displayMonth > 11) { displayMonth = 0; displayYear++; }
            prefs.edit().putInt("fullcal_widget_month", displayMonth).putInt("fullcal_widget_year", displayYear).apply();
            refreshWidget(context);
        } else if (ACTION_GO_TODAY.equals(action)) {
            prefs.edit().putInt("fullcal_widget_month", today.get(Calendar.MONTH)).putInt("fullcal_widget_year", today.get(Calendar.YEAR)).apply();
            refreshWidget(context);
        } else if (ACTION_REFRESH.equals(action)) {
            android.util.Log.d("FullCalWidget", "Manual refresh triggered");
            refreshWidget(context);
        }
    }
    
    private void refreshWidget(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, FullCalendarWidgetProvider.class);
        for (int id : appWidgetManager.getAppWidgetIds(thisWidget)) {
            updateAppWidget(context, appWidgetManager, id);
        }
    }
    
    private static class TaskInfo {
        String title, priority;
        boolean isVacation;
        TaskInfo(String title, String priority, boolean isVacation) {
            this.title = title; this.priority = priority; this.isVacation = isVacation;
        }
    }
}
