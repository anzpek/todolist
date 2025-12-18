package com.anzpek.todolist;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

public class TodoListWidget extends AppWidgetProvider {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";
    private static final String ACTION_PREV_DAY = "com.anzpek.todolist.PREV_DAY";
    private static final String ACTION_NEXT_DAY = "com.anzpek.todolist.NEXT_DAY";
    private static final String ACTION_TODAY = "com.anzpek.todolist.GO_TODAY";
    private static final String ACTION_TOGGLE_TASK = "com.anzpek.todolist.TOGGLE_TASK";
    private static final String ACTION_REFRESH = "com.anzpek.todolist.REFRESH_WIDGET";
    private static final String EXTRA_TASK_ID = "task_id";

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        android.util.Log.d("TodoListWidget", "updateAppWidget ID: " + appWidgetId);
        
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_list_layout);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        try {
            // 선택된 날짜 가져오기 (기본값: 오늘)
            Calendar today = Calendar.getInstance();
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayKey = dateKeyFormat.format(today.getTime());
            
            String selectedDateKey = prefs.getString("today_widget_selected_date", todayKey);
            
            // 선택된 날짜의 표시 텍스트
            String displayText;
            if (selectedDateKey.equals(todayKey)) {
                displayText = "Today";
            } else {
                try {
                    Calendar selectedCal = Calendar.getInstance();
                    String[] parts = selectedDateKey.split("-");
                    selectedCal.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1, Integer.parseInt(parts[2]));
                    SimpleDateFormat displayFormat = new SimpleDateFormat("M/d (E)", Locale.KOREAN);
                    displayText = displayFormat.format(selectedCal.getTime());
                } catch (Exception e) {
                    displayText = selectedDateKey;
                }
            }
            
            views.setTextViewText(R.id.widget_title, displayText);
            
            // 데이터 로드
            String todoJson = prefs.getString(PREF_PREFIX_KEY + "data", "[]");
            JSONArray calendarTasks = new JSONArray();
            
            if (todoJson.startsWith("{")) {
                JSONObject combined = new JSONObject(todoJson);
                calendarTasks = combined.optJSONArray("calendar");
                if (calendarTasks == null) calendarTasks = new JSONArray();
            } else {
                calendarTasks = new JSONArray(todoJson);
            }
            
            // 선택된 날짜에 표시할 할일만 카운트
            int taskCount = 0;
            for (int i = 0; i < calendarTasks.length(); i++) {
                JSONObject task = calendarTasks.getJSONObject(i);
                if (shouldShowOnDate(task, selectedDateKey, todayKey)) {
                    taskCount++;
                }
            }
            views.setTextViewText(R.id.widget_count, String.valueOf(taskCount));
            
            android.util.Log.d("TodoListWidget", "Loaded " + taskCount + " tasks for " + selectedDateKey);
            
            // ListView 설정
            views.setViewVisibility(R.id.widget_empty_view, android.view.View.GONE);
            views.setViewVisibility(R.id.widget_list_view, android.view.View.VISIBLE);

            Intent intent = new Intent(context, TodoListWidgetService.class);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            intent.putExtra("selected_date", selectedDateKey);
            intent.setData(Uri.parse(intent.toUri(Intent.URI_INTENT_SCHEME)));
            
            views.setRemoteAdapter(R.id.widget_list_view, intent);
            views.setEmptyView(R.id.widget_list_view, R.id.widget_empty_view);

        } catch (Exception e) {
            android.util.Log.e("TodoListWidget", "ERROR: " + e.getMessage(), e);
        }

        // Click handlers
        try {
            // Previous Day Button
            Intent prevIntent = new Intent(context, TodoListWidget.class);
            prevIntent.setAction(ACTION_PREV_DAY);
            PendingIntent prevPendingIntent = PendingIntent.getBroadcast(context, 100, prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_prev_day, prevPendingIntent);
            
            // Next Day Button
            Intent nextIntent = new Intent(context, TodoListWidget.class);
            nextIntent.setAction(ACTION_NEXT_DAY);
            PendingIntent nextPendingIntent = PendingIntent.getBroadcast(context, 101, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_next_day, nextPendingIntent);
            
            // Today Button
            Intent todayIntent = new Intent(context, TodoListWidget.class);
            todayIntent.setAction(ACTION_TODAY);
            PendingIntent todayPendingIntent = PendingIntent.getBroadcast(context, 102, todayIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_today, todayPendingIntent);
            
            // Title Click -> Go to Today
            views.setOnClickPendingIntent(R.id.widget_title, todayPendingIntent);
            
            // Add Button -> Open App with Add Modal (타임스탬프로 고유화)
            Intent addIntent = new Intent(context, MainActivity.class);
            addIntent.setAction(Intent.ACTION_VIEW);
            addIntent.setData(Uri.parse("todolist://add?t=" + System.currentTimeMillis()));
            addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent addPendingIntent = PendingIntent.getActivity(context, 1, addIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.widget_add_button, addPendingIntent);
            
            // Refresh Button
            Intent refreshIntent = new Intent(context, TodoListWidget.class);
            refreshIntent.setAction(ACTION_REFRESH);
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(context, 103, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_refresh, refreshPendingIntent);
            
            // List Item Click Template -> Toggle Task
            Intent itemClickIntent = new Intent(context, TodoListWidget.class);
            itemClickIntent.setAction(ACTION_TOGGLE_TASK);
            PendingIntent itemClickPendingIntent = PendingIntent.getBroadcast(context, 0, itemClickIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setPendingIntentTemplate(R.id.widget_list_view, itemClickPendingIntent);
            
        } catch (Exception e) {
            android.util.Log.e("TodoListWidget", "Intent ERROR: " + e.getMessage());
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        if (ACTION_PREV_DAY.equals(action)) {
            navigateDate(context, prefs, -1);
            
        } else if (ACTION_NEXT_DAY.equals(action)) {
            navigateDate(context, prefs, 1);
            
        } else if (ACTION_TODAY.equals(action)) {
            Calendar today = Calendar.getInstance();
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayKey = dateKeyFormat.format(today.getTime());
            prefs.edit().putString("today_widget_selected_date", todayKey).apply();
            refreshWidget(context);
            
        } else if (ACTION_REFRESH.equals(action)) {
            android.util.Log.d("TodoListWidget", "Manual refresh triggered");
            refreshWidget(context);
            
        } else if (ACTION_TOGGLE_TASK.equals(action)) {
            String clickAction = intent.getStringExtra("action");
            String taskId = intent.getStringExtra("task_id");
            
            if ("toggle".equals(clickAction)) {
                // 체크박스 클릭 → SharedPreferences에서 직접 토글
                if (taskId != null && !taskId.isEmpty() && !taskId.startsWith("vac_")) {
                    android.util.Log.d("TodoListWidget", "Toggle task directly: " + taskId);
                    toggleTaskInPrefs(context, taskId);
                    refreshWidget(context);
                    
                    // 앱에도 알림 (Firebase 동기화용)
                    Intent toggleBroadcast = new Intent("com.anzpek.todolist.TOGGLE_TODO");
                    toggleBroadcast.putExtra("task_id", taskId);
                    toggleBroadcast.setPackage(context.getPackageName());
                    context.sendBroadcast(toggleBroadcast);
                }
            } else if ("open_app".equals(clickAction)) {
                // 텍스트 클릭 → 앱 열기
                android.util.Log.d("TodoListWidget", "Open app for task: " + taskId);
                Intent appIntent = new Intent(context, MainActivity.class);
                appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                context.startActivity(appIntent);
            }
            
        } else if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, TodoListWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view);
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }
    
    private void navigateDate(Context context, SharedPreferences prefs, int days) {
        Calendar today = Calendar.getInstance();
        SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        String todayKey = dateKeyFormat.format(today.getTime());
        
        String currentDateKey = prefs.getString("today_widget_selected_date", todayKey);
        
        try {
            Calendar cal = Calendar.getInstance();
            String[] parts = currentDateKey.split("-");
            cal.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1, Integer.parseInt(parts[2]));
            cal.add(Calendar.DAY_OF_MONTH, days);
            
            String newDateKey = dateKeyFormat.format(cal.getTime());
            prefs.edit().putString("today_widget_selected_date", newDateKey).apply();
        } catch (Exception e) {
            android.util.Log.e("TodoListWidget", "Date parse error: " + e.getMessage());
        }
        
        refreshWidget(context);
    }
    
    private void refreshWidget(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, TodoListWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view);
        
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
    
    @Override
    public void onEnabled(Context context) {}

    @Override
    public void onDisabled(Context context) {}
    
    private static boolean shouldShowOnDate(JSONObject task, String targetDateKey, String todayDateKey) {
        try {
            boolean completed = task.optBoolean("completed", false);
            
            String startDateKey = extractDateKey(task.optString("startDate", ""));
            String dueDateKey = extractDateKey(task.optString("dueDate", ""));

            boolean hasStart = !startDateKey.isEmpty();
            boolean hasDue = !dueDateKey.isEmpty();

            if (hasStart && hasDue) {
                return targetDateKey.compareTo(startDateKey) >= 0 && targetDateKey.compareTo(dueDateKey) <= 0;
            }

            if (hasStart && !hasDue) {
                if (targetDateKey.equals(startDateKey)) return true;
                if (!completed && targetDateKey.compareTo(startDateKey) > 0 && targetDateKey.compareTo(todayDateKey) <= 0) {
                    return true;
                }
                return false;
            }
            
            if (!hasStart && hasDue) {
                return targetDateKey.equals(dueDateKey);
            }
            
            return false;
        } catch (Exception e) {
            return false;
        }
    }
    
    private static String extractDateKey(String isoDate) {
        if (isoDate == null || isoDate.isEmpty()) return "";
        if (isoDate.length() >= 10) {
            return isoDate.substring(0, 10);
        }
        return "";
    }
    
    // SharedPreferences에서 할일 완료 상태 토글
    private void toggleTaskInPrefs(Context context, String taskId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String dataStr = prefs.getString(PREF_PREFIX_KEY + "data", "");
            
            if (dataStr.isEmpty()) {
                android.util.Log.w("TodoListWidget", "No data in prefs");
                return;
            }
            
            JSONObject combinedData = new JSONObject(dataStr);
            JSONArray calendarArray = combinedData.optJSONArray("calendar");
            
            if (calendarArray == null) {
                android.util.Log.w("TodoListWidget", "No calendar data");
                return;
            }
            
            boolean found = false;
            for (int i = 0; i < calendarArray.length(); i++) {
                JSONObject todo = calendarArray.getJSONObject(i);
                String id = todo.optString("id", "");
                
                if (id.equals(taskId)) {
                    boolean currentCompleted = todo.optBoolean("completed", false);
                    todo.put("completed", !currentCompleted);
                    
                    // completedAt 설정/제거
                    if (!currentCompleted) {
                        todo.put("completedAt", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new java.util.Date()));
                    } else {
                        todo.remove("completedAt");
                    }
                    
                    calendarArray.put(i, todo);
                    found = true;
                    android.util.Log.d("TodoListWidget", "Toggled task " + taskId + " to completed=" + !currentCompleted);
                    break;
                }
            }
            
            if (found) {
                combinedData.put("calendar", calendarArray);
                prefs.edit().putString(PREF_PREFIX_KEY + "data", combinedData.toString()).apply();
                android.util.Log.d("TodoListWidget", "Saved updated data to prefs");
            } else {
                android.util.Log.w("TodoListWidget", "Task not found: " + taskId);
            }
            
        } catch (Exception e) {
            android.util.Log.e("TodoListWidget", "Error toggling task: " + e.getMessage());
        }
    }
}
