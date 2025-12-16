package com.anzpek.todolist;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import android.graphics.Color;
import android.view.View;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class TodoListRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private List<JSONObject> taskList = new ArrayList<>();
    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";

    public TodoListRemoteViewsFactory(Context context) {
        this.context = context;
    }

    @Override
    public void onCreate() {
        loadTasks();
    }

    @Override
    public void onDataSetChanged() {
        loadTasks();
    }

    @Override
    public void onDestroy() {
        taskList.clear();
    }

    @Override
    public int getCount() {
        return taskList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= taskList.size()) return null;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_task_item);
        JSONObject task = taskList.get(position);

        String title = task.optString("title", "");
        String priority = task.optString("priority", "medium");
        String dueDate = task.optString("dueDate", "");
        boolean completed = task.optBoolean("completed", false);
        int progress = task.optInt("progress", -1);

        views.setTextViewText(R.id.widget_item_title, title);
        
        String checkboxSymbol = completed ? "☑" : "☐";
        views.setTextViewText(R.id.widget_item_priority, checkboxSymbol);

        int priorityColor = Color.parseColor("#9CA3AF");
        if ("urgent".equals(priority)) priorityColor = Color.parseColor("#EF4444");
        else if ("high".equals(priority)) priorityColor = Color.parseColor("#F59E0B");
        else if ("medium".equals(priority)) priorityColor = Color.parseColor("#3B82F6");
        
        views.setTextColor(R.id.widget_item_priority, priorityColor);

        if (!dueDate.isEmpty()) {
            String dateStr = formatDate(dueDate);
            if (progress >= 0) {
                dateStr += " [" + progress + "%]";
            }
            views.setTextViewText(R.id.widget_item_due_date, dateStr);
            views.setViewVisibility(R.id.widget_item_due_date, View.VISIBLE);
        } else {
            if (progress >= 0) {
                views.setTextViewText(R.id.widget_item_due_date, "[" + progress + "%]");
                views.setViewVisibility(R.id.widget_item_due_date, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_item_due_date, View.GONE);
            }
        }

        Intent fillInIntent = new Intent();
        fillInIntent.putExtra("task_id", task.optString("id"));
        views.setOnClickFillInIntent(R.id.widget_item_root, fillInIntent);

        return views;
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

    private void loadTasks() {
        taskList.clear();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String todoJson = prefs.getString(PREF_PREFIX_KEY + "data", "[]");
            
            // 새로운 형식: {today:[], calendar:[]} 또는 기존 형식: []
            JSONArray tasks;
            if (todoJson.startsWith("{")) {
                // 새로운 combined 형식
                JSONObject combined = new JSONObject(todoJson);
                tasks = combined.optJSONArray("today");
                if (tasks == null) {
                    tasks = new JSONArray();
                }
            } else {
                // 기존 배열 형식 (하위 호환)
                tasks = new JSONArray(todoJson);
            }
            
            int count = tasks.length();
            for (int i = 0; i < count; i++) {
                taskList.add(tasks.getJSONObject(i));
            }
            android.util.Log.d("TodoListFactory", "Loaded " + count + " today tasks");
        } catch (Exception e) {
            android.util.Log.e("TodoListFactory", "Error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String formatDate(String isoDate) {
        try {
            if (isoDate != null && isoDate.length() >= 10) {
                return isoDate.substring(5, 10).replace("-", "/");
            }
        } catch (Exception e) {}
        return "";
    }
}
