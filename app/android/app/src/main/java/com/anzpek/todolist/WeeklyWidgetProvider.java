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

public class WeeklyWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";
    private static final String ACTION_PREV_WEEK = "com.anzpek.todolist.WEEKLY_PREV";
    private static final String ACTION_NEXT_WEEK = "com.anzpek.todolist.WEEKLY_NEXT";
    private static final String ACTION_GO_TODAY = "com.anzpek.todolist.WEEKLY_TODAY";
    private static final String ACTION_SELECT_DAY = "com.anzpek.todolist.WEEKLY_SELECT_DAY";
    private static final String ACTION_REFRESH = "com.anzpek.todolist.WEEKLY_REFRESH";
    
    private static final int MAX_TASKS_PER_COLUMN = 12;
    
    private static final int[] DAY_IDS = {
        R.id.day_0, R.id.day_1, R.id.day_2, R.id.day_3, R.id.day_4, R.id.day_5, R.id.day_6
    };
    
    // 열 클릭용 ID (날짜 헤더 + 태스크 열 전체)
    private static final int[] DAY_COL_IDS = {
        R.id.day_col_0, R.id.day_col_1, R.id.day_col_2, R.id.day_col_3, R.id.day_col_4, R.id.day_col_5, R.id.day_col_6
    };
    
    private static final int[] COL_IDS = {
        R.id.col_0, R.id.col_1, R.id.col_2, R.id.col_3, R.id.col_4, R.id.col_5, R.id.col_6
    };
    
    // 각 날짜별 할일 12개 + more (13개)
    private static final int[][] TASK_IDS = {
        {R.id.task_0_0, R.id.task_0_1, R.id.task_0_2, R.id.task_0_3, R.id.task_0_4, R.id.task_0_5, R.id.task_0_6, R.id.task_0_7, R.id.task_0_8, R.id.task_0_9, R.id.task_0_10, R.id.task_0_11, R.id.task_0_more},
        {R.id.task_1_0, R.id.task_1_1, R.id.task_1_2, R.id.task_1_3, R.id.task_1_4, R.id.task_1_5, R.id.task_1_6, R.id.task_1_7, R.id.task_1_8, R.id.task_1_9, R.id.task_1_10, R.id.task_1_11, R.id.task_1_more},
        {R.id.task_2_0, R.id.task_2_1, R.id.task_2_2, R.id.task_2_3, R.id.task_2_4, R.id.task_2_5, R.id.task_2_6, R.id.task_2_7, R.id.task_2_8, R.id.task_2_9, R.id.task_2_10, R.id.task_2_11, R.id.task_2_more},
        {R.id.task_3_0, R.id.task_3_1, R.id.task_3_2, R.id.task_3_3, R.id.task_3_4, R.id.task_3_5, R.id.task_3_6, R.id.task_3_7, R.id.task_3_8, R.id.task_3_9, R.id.task_3_10, R.id.task_3_11, R.id.task_3_more},
        {R.id.task_4_0, R.id.task_4_1, R.id.task_4_2, R.id.task_4_3, R.id.task_4_4, R.id.task_4_5, R.id.task_4_6, R.id.task_4_7, R.id.task_4_8, R.id.task_4_9, R.id.task_4_10, R.id.task_4_11, R.id.task_4_more},
        {R.id.task_5_0, R.id.task_5_1, R.id.task_5_2, R.id.task_5_3, R.id.task_5_4, R.id.task_5_5, R.id.task_5_6, R.id.task_5_7, R.id.task_5_8, R.id.task_5_9, R.id.task_5_10, R.id.task_5_11, R.id.task_5_more},
        {R.id.task_6_0, R.id.task_6_1, R.id.task_6_2, R.id.task_6_3, R.id.task_6_4, R.id.task_6_5, R.id.task_6_6, R.id.task_6_7, R.id.task_6_8, R.id.task_6_9, R.id.task_6_10, R.id.task_6_11, R.id.task_6_more}
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_weekly_layout);
        
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            
            Calendar today = Calendar.getInstance();
            String todayKey = dateKeyFormat.format(today.getTime());
            
            String storedWeekStart = prefs.getString("weekly_widget_week_start", null);
            Calendar weekStart = Calendar.getInstance();
            if (storedWeekStart != null) {
                try {
                    weekStart.setTime(dateKeyFormat.parse(storedWeekStart));
                } catch (Exception e) {
                    weekStart = getWeekStart(today);
                }
            } else {
                weekStart = getWeekStart(today);
            }
            
            String selectedDateKey = prefs.getString("weekly_widget_selected_date", todayKey);
            
            SimpleDateFormat monthFormat = new SimpleDateFormat("yyyy년 M월 W주", Locale.KOREAN);
            views.setTextViewText(R.id.widget_weekly_title, monthFormat.format(weekStart.getTime()));
            
            // 네비게이션
            Intent prevIntent = new Intent(context, WeeklyWidgetProvider.class);
            prevIntent.setAction(ACTION_PREV_WEEK);
            PendingIntent prevPendingIntent = PendingIntent.getBroadcast(context, 3000, prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_prev_week, prevPendingIntent);
            
            Intent nextIntent = new Intent(context, WeeklyWidgetProvider.class);
            nextIntent.setAction(ACTION_NEXT_WEEK);
            PendingIntent nextPendingIntent = PendingIntent.getBroadcast(context, 3001, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_next_week, nextPendingIntent);
            
            Intent goTodayIntent = new Intent(context, WeeklyWidgetProvider.class);
            goTodayIntent.setAction(ACTION_GO_TODAY);
            PendingIntent goTodayPendingIntent = PendingIntent.getBroadcast(context, 3002, goTodayIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.widget_weekly_title, goTodayPendingIntent);
            
            Intent addIntent = new Intent(context, MainActivity.class);
            addIntent.setAction(Intent.ACTION_VIEW);
            addIntent.setData(Uri.parse("todolist://add?t=" + System.currentTimeMillis()));
            addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent addPendingIntent = PendingIntent.getActivity(context, 3003, addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_add_todo, addPendingIntent);
            
            Intent refreshIntent = new Intent(context, WeeklyWidgetProvider.class);
            refreshIntent.setAction(ACTION_REFRESH);
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(context, 3004, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_refresh, refreshPendingIntent);
            
            // 데이터 로드 (휴가 포함)
            String dataStr = prefs.getString(PREF_PREFIX_KEY + "data", "");
            Map<String, List<TaskInfo>> tasksByDate = new HashMap<>();
            
            if (dataStr != null && !dataStr.isEmpty() && dataStr.startsWith("{")) {
                try {
                    JSONObject combinedData = new JSONObject(dataStr);
                    
                    // 휴가 처리
                    JSONArray vacationsArray = combinedData.optJSONArray("vacations");
                    if (vacationsArray != null) {
                        for (int i = 0; i < vacationsArray.length(); i++) {
                            try {
                                JSONObject vacation = vacationsArray.getJSONObject(i);
                                String vacDate = vacation.optString("date", "");
                                if (!vacDate.isEmpty()) {
                                    String employeeName = vacation.optString("employeeName", "");
                                    String type = vacation.optString("type", "휴가");
                                    String title = employeeName.isEmpty() ? type : employeeName + " " + type;
                                    addTask(tasksByDate, vacDate, title, "vacation", true);
                                }
                            } catch (Exception e) {}
                        }
                    }
                    
                    // 할일 처리
                    JSONArray calendarArray = combinedData.optJSONArray("calendar");
                    if (calendarArray != null) {
                        for (int i = 0; i < calendarArray.length(); i++) {
                            try {
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
                                    try {
                                        Calendar startCal = Calendar.getInstance();
                                        Calendar endCal = Calendar.getInstance();
                                        startCal.setTime(dateKeyFormat.parse(startDateKey));
                                        endCal.setTime(dateKeyFormat.parse(dueDateKey));
                                        
                                        while (!startCal.after(endCal)) {
                                            String dateKey = dateKeyFormat.format(startCal.getTime());
                                            addTask(tasksByDate, dateKey, title, priority, isVacation);
                                            startCal.add(Calendar.DAY_OF_MONTH, 1);
                                        }
                                    } catch (Exception e) {
                                        if (!startDateKey.isEmpty()) {
                                            addTask(tasksByDate, startDateKey, title, priority, isVacation);
                                        }
                                    }
                                } else if (!startDateKey.isEmpty()) {
                                    try {
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
                                                String dateKey = dateKeyFormat.format(startCal.getTime());
                                                addTask(tasksByDate, dateKey, title, priority, isVacation);
                                                startCal.add(Calendar.DAY_OF_MONTH, 1);
                                            }
                                        }
                                    } catch (Exception e) {
                                        addTask(tasksByDate, startDateKey, title, priority, isVacation);
                                    }
                                } else if (!dueDateKey.isEmpty()) {
                                    addTask(tasksByDate, dueDateKey, title, priority, isVacation);
                                }
                            } catch (Exception e) {}
                        }
                    }
                } catch (Exception e) {
                    android.util.Log.e("WeeklyWidget", "JSON parse error: " + e.getMessage());
                }
            }
            
            // 7일 날짜 및 할일
            for (int dayIndex = 0; dayIndex < 7; dayIndex++) {
                Calendar dayCal = (Calendar) weekStart.clone();
                dayCal.add(Calendar.DAY_OF_MONTH, dayIndex);
                String dayKey = dateKeyFormat.format(dayCal.getTime());
                int dayOfMonth = dayCal.get(Calendar.DAY_OF_MONTH);
                
                views.setTextViewText(DAY_IDS[dayIndex], String.valueOf(dayOfMonth));
                
                if (dayKey.equals(selectedDateKey)) {
                    views.setInt(DAY_IDS[dayIndex], "setBackgroundResource", R.drawable.widget_today_button_bg);
                    views.setTextColor(DAY_IDS[dayIndex], Color.WHITE);
                } else if (dayKey.equals(todayKey)) {
                    views.setTextColor(DAY_IDS[dayIndex], Color.parseColor("#3B82F6"));
                    views.setInt(DAY_IDS[dayIndex], "setBackgroundResource", android.R.color.transparent);
                } else {
                    views.setTextColor(DAY_IDS[dayIndex], Color.WHITE);
                    views.setInt(DAY_IDS[dayIndex], "setBackgroundResource", android.R.color.transparent);
                }
                
                // 날짜 헤더 열 전체 클릭
                Intent selectDayIntent1 = new Intent(context, WeeklyWidgetProvider.class);
                selectDayIntent1.setAction(ACTION_SELECT_DAY);
                selectDayIntent1.putExtra("selected_date", dayKey);
                selectDayIntent1.setData(Uri.parse("weekly://daycol/" + dayIndex));
                PendingIntent selectDayPendingIntent1 = PendingIntent.getBroadcast(context, 3020 + dayIndex, selectDayIntent1,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                views.setOnClickPendingIntent(DAY_COL_IDS[dayIndex], selectDayPendingIntent1);
                
                // 할일 열 전체 클릭
                Intent selectDayIntent2 = new Intent(context, WeeklyWidgetProvider.class);
                selectDayIntent2.setAction(ACTION_SELECT_DAY);
                selectDayIntent2.putExtra("selected_date", dayKey);
                selectDayIntent2.setData(Uri.parse("weekly://col/" + dayIndex));
                PendingIntent selectDayPendingIntent2 = PendingIntent.getBroadcast(context, 3030 + dayIndex, selectDayIntent2,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                views.setOnClickPendingIntent(COL_IDS[dayIndex], selectDayPendingIntent2);
                
                List<TaskInfo> tasks = tasksByDate.get(dayKey);
                
                for (int taskIdx = 0; taskIdx < MAX_TASKS_PER_COLUMN; taskIdx++) {
                    int taskViewId = TASK_IDS[dayIndex][taskIdx];
                    
                    if (tasks != null && taskIdx < tasks.size()) {
                        TaskInfo task = tasks.get(taskIdx);
                        views.setTextViewText(taskViewId, task.title);
                        views.setInt(taskViewId, "setBackgroundResource", getBorderDrawable(task.priority, task.isVacation));
                        views.setViewVisibility(taskViewId, android.view.View.VISIBLE);
                    } else {
                        views.setViewVisibility(taskViewId, android.view.View.GONE);
                    }
                }
                
                int moreViewId = TASK_IDS[dayIndex][MAX_TASKS_PER_COLUMN];
                if (tasks != null && tasks.size() > MAX_TASKS_PER_COLUMN) {
                    int more = tasks.size() - MAX_TASKS_PER_COLUMN;
                    views.setTextViewText(moreViewId, "+" + more);
                    views.setViewVisibility(moreViewId, android.view.View.VISIBLE);
                } else {
                    views.setViewVisibility(moreViewId, android.view.View.GONE);
                }
            }
            
            // 선택된 날짜 레이블
            SimpleDateFormat labelFormat = new SimpleDateFormat("M/d (EEE)", Locale.KOREAN);
            try {
                Calendar selectedCal = Calendar.getInstance();
                selectedCal.setTime(dateKeyFormat.parse(selectedDateKey));
                views.setTextViewText(R.id.selected_date_label, labelFormat.format(selectedCal.getTime()) + " 할일");
            } catch (Exception e) {
                views.setTextViewText(R.id.selected_date_label, "오늘 할일");
            }
            
            // ListView 설정 (오늘 할일 위젯과 동일한 방식)
            Intent serviceIntent = new Intent(context, WeeklyRemoteViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.weekly_task_list, serviceIntent);
            
            // ListView 아이템 클릭 처리
            Intent itemClickIntent = new Intent(context, MainActivity.class);
            itemClickIntent.setAction(Intent.ACTION_VIEW);
            itemClickIntent.setData(Uri.parse("todolist://view"));
            itemClickIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent itemClickPendingIntent = PendingIntent.getActivity(context, 3050, itemClickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setPendingIntentTemplate(R.id.weekly_task_list, itemClickPendingIntent);
            
            // ListView 데이터 갱신
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.weekly_task_list);
            
        } catch (Exception e) {
            android.util.Log.e("WeeklyWidget", "Error: " + e.getMessage(), e);
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
        if (!tasksByDate.containsKey(dateKey)) {
            tasksByDate.put(dateKey, new ArrayList<TaskInfo>());
        }
        if (isVacation) {
            tasksByDate.get(dateKey).add(0, new TaskInfo(title, priority, isVacation));
        } else {
            tasksByDate.get(dateKey).add(new TaskInfo(title, priority, isVacation));
        }
    }
    
    private static Calendar getWeekStart(Calendar cal) {
        Calendar weekStart = (Calendar) cal.clone();
        weekStart.set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY);
        return weekStart;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        String action = intent.getAction();
        if (action == null) return;
        
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        
        if (ACTION_PREV_WEEK.equals(action)) {
            navigateWeek(prefs, dateKeyFormat, -7);
            refreshWidget(context);
        } else if (ACTION_NEXT_WEEK.equals(action)) {
            navigateWeek(prefs, dateKeyFormat, 7);
            refreshWidget(context);
        } else if (ACTION_GO_TODAY.equals(action)) {
            Calendar today = Calendar.getInstance();
            Calendar weekStart = getWeekStart(today);
            String todayKey = dateKeyFormat.format(today.getTime());
            prefs.edit()
                .putString("weekly_widget_week_start", dateKeyFormat.format(weekStart.getTime()))
                .putString("weekly_widget_selected_date", todayKey)
                .apply();
            refreshWidget(context);
        } else if (ACTION_SELECT_DAY.equals(action)) {
            String selectedDate = intent.getStringExtra("selected_date");
            if (selectedDate != null) {
                prefs.edit().putString("weekly_widget_selected_date", selectedDate).apply();
                refreshWidget(context);
            }
        } else if (ACTION_REFRESH.equals(action)) {
            android.util.Log.d("WeeklyWidget", "Manual refresh triggered");
            refreshWidget(context);
        }
    }
    
    private void navigateWeek(SharedPreferences prefs, SimpleDateFormat dateKeyFormat, int days) {
        try {
            String storedWeekStart = prefs.getString("weekly_widget_week_start", null);
            Calendar weekStart = Calendar.getInstance();
            if (storedWeekStart != null) {
                try {
                    weekStart.setTime(dateKeyFormat.parse(storedWeekStart));
                } catch (Exception e) {
                    weekStart = getWeekStart(weekStart);
                }
            } else {
                weekStart = getWeekStart(weekStart);
            }
            
            weekStart.add(Calendar.DAY_OF_MONTH, days);
            Calendar selectedDate = (Calendar) weekStart.clone();
            
            prefs.edit()
                .putString("weekly_widget_week_start", dateKeyFormat.format(weekStart.getTime()))
                .putString("weekly_widget_selected_date", dateKeyFormat.format(selectedDate.getTime()))
                .apply();
        } catch (Exception e) {
            android.util.Log.e("WeeklyWidget", "navigateWeek error: " + e.getMessage());
        }
    }
    
    private void refreshWidget(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, WeeklyWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        
        for (int id : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, id);
        }
    }
    
    private static class TaskInfo {
        String title;
        String priority;
        boolean isVacation;
        
        TaskInfo(String title, String priority, boolean isVacation) {
            this.title = title;
            this.priority = priority;
            this.isVacation = isVacation;
        }
    }
}
