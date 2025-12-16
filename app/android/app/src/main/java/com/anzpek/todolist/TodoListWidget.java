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

public class TodoListWidget extends AppWidgetProvider {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        android.util.Log.d("TodoListWidget", "updateAppWidget ID: " + appWidgetId);
        
        // Use the new List Layout
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_list_layout);
        
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String todoJson = prefs.getString(PREF_PREFIX_KEY + "data", "[]");
            JSONArray tasks = new JSONArray(todoJson);
            int taskCount = tasks.length();
            
            views.setTextViewText(R.id.widget_title, "Today");
            views.setTextViewText(R.id.widget_count, String.valueOf(taskCount));

            if (taskCount == 0) {
                views.setViewVisibility(R.id.widget_empty_view, android.view.View.VISIBLE);
                views.setViewVisibility(R.id.widget_list_view, android.view.View.GONE);
            } else {
                views.setViewVisibility(R.id.widget_empty_view, android.view.View.GONE);
                views.setViewVisibility(R.id.widget_list_view, android.view.View.VISIBLE);

                // Set up the intent that starts the TodoListWidgetService, which will
                // provide the views for this collection.
                Intent intent = new Intent(context, TodoListWidgetService.class);
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
                intent.setData(Uri.parse(intent.toUri(Intent.URI_INTENT_SCHEME)));
                
                views.setRemoteAdapter(R.id.widget_list_view, intent);
                views.setEmptyView(R.id.widget_list_view, R.id.widget_empty_view);
            }

        } catch (Exception e) {
            android.util.Log.e("TodoListWidget", "ERROR: " + e.getMessage());
        }

        // Click handlers
        try {
            // Click Logic: "Add Button" -> Open Add Task URL
            Intent addIntent = new Intent(context, MainActivity.class);
            addIntent.setAction(Intent.ACTION_VIEW);
            addIntent.setData(Uri.parse("todolist://add"));
            addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent addPendingIntent = PendingIntent.getActivity(context, 1, addIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_add_button, addPendingIntent);
            
            // List Item Click Template: PendingIntent template for items in the list
            Intent itemClickIntent = new Intent(context, MainActivity.class);
            itemClickIntent.setAction(Intent.ACTION_VIEW);
            // itemClickIntent.setData(Uri.parse("todolist://open")); // General open
            PendingIntent itemClickPendingIntent = PendingIntent.getActivity(context, 0, itemClickIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE); // Mutable to allow extras
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
        
        // Listen for data updates to refresh list
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, TodoListWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            
            // Notify list view to refresh data
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list_view);
            
            // Also update standard views (header counts etc)
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }
    
    @Override
    public void onEnabled(Context context) {}

    @Override
    public void onDisabled(Context context) {}
}
