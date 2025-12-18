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

public class KanbanWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_kanban_layout);
        
        try {
            // + 버튼
            Intent addIntent = new Intent(context, MainActivity.class);
            addIntent.setAction(Intent.ACTION_VIEW);
            addIntent.setData(Uri.parse("todolist://add?t=" + System.currentTimeMillis()));
            addIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent addPendingIntent = PendingIntent.getActivity(context, 5000, addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_add_todo, addPendingIntent);
            
            // 새로고침 버튼
            Intent refreshIntent = new Intent(context, KanbanWidgetProvider.class);
            refreshIntent.setAction("com.anzpek.todolist.KANBAN_REFRESH");
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(context, 5001, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_refresh, refreshPendingIntent);
            
            // 각 우선순위별 ListView 설정
            setupListView(context, views, R.id.urgent_list, "urgent", appWidgetId);
            setupListView(context, views, R.id.high_list, "high", appWidgetId);
            setupListView(context, views, R.id.medium_list, "medium", appWidgetId);
            setupListView(context, views, R.id.low_list, "low", appWidgetId);
            
        } catch (Exception e) {
            android.util.Log.e("KanbanWidget", "Error: " + e.getMessage());
        }
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
    
    private static void setupListView(Context context, RemoteViews views, int listViewId, String priority, int appWidgetId) {
        Intent intent = new Intent(context, KanbanRemoteViewsService.class);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        intent.putExtra("priority", priority);
        // Unique data to distinguish intents
        intent.setData(Uri.parse("kanban://" + priority + "/" + appWidgetId));
        
        views.setRemoteAdapter(listViewId, intent);
        views.setEmptyView(listViewId, android.R.id.empty);
    }
    
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        String action = intent.getAction();
        
        // 새로고침 버튼 클릭
        if ("com.anzpek.todolist.KANBAN_REFRESH".equals(action)) {
            android.util.Log.d("KanbanWidget", "Manual refresh triggered");
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, KanbanWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId);
            }
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.urgent_list);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.high_list);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.medium_list);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.low_list);
        }
        
        // 데이터 변경시 위젯 새로고침
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action)) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, KanbanWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.urgent_list);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.high_list);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.medium_list);
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.low_list);
        }
    }
}
