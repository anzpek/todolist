package com.anzpek.todolist;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class KanbanRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new KanbanRemoteViewsFactory(this.getApplicationContext(), intent);
    }
}

class KanbanRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {
    private Context context;
    private String priority;
    private List<String> tasks = new ArrayList<>();
    
    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";

    public KanbanRemoteViewsFactory(Context context, Intent intent) {
        this.context = context;
        this.priority = intent.getStringExtra("priority");
        if (this.priority == null) this.priority = "medium";
    }

    @Override
    public void onCreate() {
        loadTasks();
    }

    @Override
    public void onDataSetChanged() {
        loadTasks();
    }

    private void loadTasks() {
        tasks.clear();
        
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String dataStr = prefs.getString(PREF_PREFIX_KEY + "data", "");
            
            if (dataStr != null && !dataStr.isEmpty() && dataStr.startsWith("{")) {
                JSONObject combinedData = new JSONObject(dataStr);
                JSONArray calendarArray = combinedData.optJSONArray("calendar");
                
                if (calendarArray != null) {
                    SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                    Calendar today = Calendar.getInstance();
                    String todayKey = dateKeyFormat.format(today.getTime());
                    
                    for (int i = 0; i < calendarArray.length(); i++) {
                        JSONObject todo = calendarArray.getJSONObject(i);
                        boolean isVacation = todo.optBoolean("isVacation", false);
                        boolean completed = todo.optBoolean("completed", false);
                        
                        if (isVacation || completed) continue;
                        
                        String taskPriority = todo.optString("priority", "medium");
                        if (!taskPriority.equals(this.priority)) continue;
                        
                        // 오늘 날짜에 표시해야 하는 할일인지 판단
                        if (!shouldShowOnDate(todo, todayKey)) continue;
                        
                        String title = todo.optString("title", "");
                        tasks.add(title);
                    }
                }
            }
        } catch (Exception e) {
            android.util.Log.e("KanbanFactory", "Error loading tasks: " + e.getMessage());
        }
    }
    
    private boolean shouldShowOnDate(JSONObject todo, String todayKey) {
        try {
            String startDate = todo.optString("startDate", "");
            String dueDate = todo.optString("dueDate", "");
            
            String startDateKey = (startDate != null && startDate.length() >= 10) ? startDate.substring(0, 10) : "";
            String dueDateKey = (dueDate != null && dueDate.length() >= 10) ? dueDate.substring(0, 10) : "";
            
            boolean hasStart = !startDateKey.isEmpty();
            boolean hasDue = !dueDateKey.isEmpty();
            
            if (hasStart && hasDue) {
                return todayKey.compareTo(startDateKey) >= 0 && todayKey.compareTo(dueDateKey) <= 0;
            }
            if (hasStart && !hasDue) {
                return todayKey.compareTo(startDateKey) >= 0;
            }
            if (!hasStart && hasDue) {
                return todayKey.equals(dueDateKey);
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void onDestroy() {
        tasks.clear();
    }

    @Override
    public int getCount() {
        return tasks.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= tasks.size()) {
            return null;
        }
        
        RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.widget_kanban_item);
        rv.setTextViewText(R.id.kanban_item_text, tasks.get(position));
        
        return rv;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }
}
