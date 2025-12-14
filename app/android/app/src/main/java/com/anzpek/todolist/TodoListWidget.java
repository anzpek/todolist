package com.anzpek.todolist;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

public class TodoListWidget extends AppWidgetProvider {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";

    private static final int[] TASK_VIEW_IDS = {
        R.id.widget_task_1, R.id.widget_task_2, R.id.widget_task_3, R.id.widget_task_4, R.id.widget_task_5,
        R.id.widget_task_6, R.id.widget_task_7, R.id.widget_task_8, R.id.widget_task_9, R.id.widget_task_10,
        R.id.widget_task_11, R.id.widget_task_12, R.id.widget_task_13, R.id.widget_task_14, R.id.widget_task_15,
        R.id.widget_task_16, R.id.widget_task_17, R.id.widget_task_18, R.id.widget_task_19, R.id.widget_task_20,
        R.id.widget_task_21, R.id.widget_task_22, R.id.widget_task_23, R.id.widget_task_24, R.id.widget_task_25,
        R.id.widget_task_26, R.id.widget_task_27, R.id.widget_task_28, R.id.widget_task_29, R.id.widget_task_30
    };

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        android.util.Log.d("TodoListWidget", "updateAppWidget ID: " + appWidgetId);
        
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.todo_widget);
        
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String todoJson = prefs.getString(PREF_PREFIX_KEY + "data", "[]");

            JSONArray tasks = new JSONArray(todoJson);
            int taskCount = tasks.length();
            
            views.setTextViewText(R.id.widget_title, "오늘 할일");
            views.setTextViewText(R.id.widget_count, taskCount + "개");

            for (int id : TASK_VIEW_IDS) {
                views.setViewVisibility(id, android.view.View.GONE);
            }

            if (taskCount == 0) {
                views.setViewVisibility(R.id.widget_empty_view, android.view.View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_empty_view, android.view.View.GONE);
                
                int displayCount = Math.min(30, taskCount);
                for (int i = 0; i < displayCount; i++) {
                    JSONObject task = tasks.getJSONObject(i);
                    String title = task.optString("title", "");
                    String priority = task.optString("priority", "medium");
                    String description = task.optString("description", "");
                    String dueDate = task.optString("dueDate", "");
                    int progress = task.optInt("progress", -1);
                    boolean completed = task.optBoolean("completed", false);
                    
                    StringBuilder display = new StringBuilder();
                    display.append(completed ? "☑ " : "☐ ");
                    
                    if ("urgent".equals(priority)) display.append("🔴");
                    else if ("high".equals(priority)) display.append("🟠");
                    else if ("medium".equals(priority)) display.append("🔵");
                    else display.append("⚪");
                    
                    display.append(" ").append(title);
                    
                    if (description != null && !description.isEmpty()) {
                         // Truncate description if too long to avoid cluttering too much, 
                         // but user said "title and description both show", so maybe just append.
                         // Let's truncate slightly less or not at all if lines allow, 
                         // but single TextView maxLines="1" dictates it will cut off anyway.
                         // User wants to fill width. 
                        String shortDesc = description.length() > 20 ? description.substring(0, 20) + ".." : description;
                        display.append(" - ").append(shortDesc);
                    }
                    
                    if (progress >= 0) {
                        display.append(" [").append(progress).append("%]");
                    }
                    
                    // Show due date only (requested to hide start date)
                    if (!dueDate.isEmpty()) {
                        display.append(" ⏰").append(formatDate(dueDate));
                    }
                    
                    views.setTextViewText(TASK_VIEW_IDS[i], display.toString());
                    views.setViewVisibility(TASK_VIEW_IDS[i], android.view.View.VISIBLE);
                }
                
                if (taskCount > 30) {
                    views.setTextViewText(R.id.widget_count, taskCount + "개 (+" + (taskCount - 30) + ")");
                }
            }

        } catch (Exception e) {
            android.util.Log.e("TodoListWidget", "ERROR: " + e.getMessage());
            views.setViewVisibility(R.id.widget_empty_view, android.view.View.VISIBLE);
        }

        try {
            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
            
            Intent addIntent = new Intent(context, MainActivity.class);
            addIntent.setAction(Intent.ACTION_VIEW);
            addIntent.setData(Uri.parse("todolist://add"));
            addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent addPendingIntent = PendingIntent.getActivity(context, 1, addIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_add_button, addPendingIntent);
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
    }
    
    private static String formatDate(String isoDate) {
        try {
            if (isoDate != null && isoDate.length() >= 10) {
                return isoDate.substring(5, 10).replace("-", "/");
            }
        } catch (Exception e) {}
        return "";
    }

    @Override
    public void onEnabled(Context context) {}

    @Override
    public void onDisabled(Context context) {}
}
