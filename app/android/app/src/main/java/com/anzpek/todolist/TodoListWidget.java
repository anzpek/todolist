package com.anzpek.todolist;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

public class TodoListWidget extends AppWidgetProvider {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.todo_widget);

        // Load data from SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String todoJson = prefs.getString(PREF_PREFIX_KEY + "data", "[]");
        String todayDate = prefs.getString(PREF_PREFIX_KEY + "date", "");

        try {
            JSONArray tasks = new JSONArray(todoJson);
            int pendingCount = tasks.length();
            
            // Update Header
            views.setTextViewText(R.id.widget_title, "Today's Tasks");
            views.setTextViewText(R.id.widget_count, pendingCount + " tasks");

            // Clear container
            views.removeAllViews(R.id.widget_tasks_container);

            if (pendingCount == 0) {
                 RemoteViews emptyView = new RemoteViews(context.getPackageName(), android.R.layout.simple_list_item_1);
                 // We can't easily inflate a custom empty view dynamically without a listview, 
                 // but for this simple Layout container approach, we just add a textview
                 // Actually, simpler to toggle visibility if using layout, but RemoteViews is limited.
                 // Let's just create a TextView-like remoteview dynamically or use the pre-defined empty view in xml.
                 // For simplicity in this 'LinearLayout' container approach:
                 
                 // Note: Dynamically adding child views in RemoteViews is limited to specific view types and requires 'addView'
                 // However, 'addView' works best with specific layouts.
                 // BETTER APPROACH for lists is ListView + RemoteViewsService, but for <5 items we can fake it.
                 // Let's manually add a few rows using a simpler layout or just Text.
                 
                views.setTextViewText(R.id.widget_empty_view, "No tasks for today!");
                views.setViewVisibility(R.id.widget_empty_view, android.view.View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_empty_view, android.view.View.GONE);
                
                // Add up to 5 tasks
                for (int i = 0; i < Math.min(5, tasks.length()); i++) {
                    JSONObject task = tasks.getJSONObject(i);
                    String title = task.optString("title", "No Title");
                    boolean completed = task.optBoolean("completed", false);
                    String priority = task.optString("priority", "medium");

                    RemoteViews taskRow = new RemoteViews(context.getPackageName(), R.layout.widget_task_row);
                    taskRow.setTextViewText(R.id.task_title, title);
                    
                    // Simple priority coloring logic
                    String color = "#3B82F6"; // Blue (default)
                    if ("urgent".equals(priority)) color = "#EF4444"; // Red
                    else if ("high".equals(priority)) color = "#F97316"; // Orange
                    
                    taskRow.setInt(R.id.task_priority_indicator, "setBackgroundColor", Color.parseColor(color));

                    views.addView(R.id.widget_tasks_container, taskRow);
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            views.setTextViewText(R.id.widget_empty_view, "Error: " + e.getMessage());
        }

        // Open App on Click
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_title, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_tasks_container, pendingIntent);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // Enter relevant functionality for when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
        // Enter relevant functionality for when the last widget is disabled
    }
}
