package com.anzpek.todolist;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class WeeklyRemoteViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new WeeklyRemoteViewsFactory(this.getApplicationContext(), intent);
    }
}

class WeeklyRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {
    private Context context;
    private List<ItemInfo> itemList = new ArrayList<>();
    
    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";

    // 아이템 정보 클래스 (휴가 또는 할일) - 오늘 위젯과 동일
    private static class ItemInfo {
        String id;
        String title;
        String priority;
        boolean completed;
        boolean isVacation;
        String vacationType;
        
        ItemInfo(String id, String title, String priority, boolean completed, boolean isVacation, String vacationType) {
            this.id = id;
            this.title = title;
            this.priority = priority;
            this.completed = completed;
            this.isVacation = isVacation;
            this.vacationType = vacationType;
        }
        
        int getSortOrder() {
            if (isVacation) return 0;
            if (completed) return 100;
            switch (priority != null ? priority : "medium") {
                case "urgent": return 1;
                case "high": return 2;
                case "medium": return 3;
                case "low": return 4;
                default: return 3;
            }
        }
        
        int getColor() {
            if (isVacation) {
                if (vacationType == null) return Color.parseColor("#10B981");
                switch (vacationType) {
                    case "업무": return Color.parseColor("#FCD34D");
                    case "연차":
                    case "휴가": return Color.parseColor("#10B981");
                    case "오전": return Color.parseColor("#60A5FA");
                    case "오후": return Color.parseColor("#A78BFA");
                    case "특별": return Color.parseColor("#FB7185");
                    case "병가": return Color.parseColor("#F87171");
                    default: return Color.parseColor("#10B981");
                }
            }
            switch (priority != null ? priority : "medium") {
                case "urgent": return Color.parseColor("#EF4444");
                case "high": return Color.parseColor("#F59E0B");
                case "medium": return Color.parseColor("#3B82F6");
                case "low": return Color.parseColor("#9CA3AF");
                default: return Color.parseColor("#9CA3AF");
            }
        }
        
        String getCheckbox() {
            if (isVacation) return "";
            if (completed) return "☑";
            return "☐";
        }
    }

    public WeeklyRemoteViewsFactory(Context context, Intent intent) {
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

    private void loadTasks() {
        itemList.clear();
        
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String dataStr = prefs.getString(PREF_PREFIX_KEY + "data", "");
            String selectedDateKey = prefs.getString("weekly_widget_selected_date", null);
            
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Calendar today = Calendar.getInstance();
            String todayKey = dateKeyFormat.format(today.getTime());
            
            if (selectedDateKey == null || selectedDateKey.isEmpty()) {
                selectedDateKey = todayKey;
            }
            
            if (dataStr != null && !dataStr.isEmpty() && dataStr.startsWith("{")) {
                JSONObject combinedData = new JSONObject(dataStr);
                
                // 휴가 처리 (오늘 위젯과 동일)
                JSONArray vacationsArray = combinedData.optJSONArray("vacations");
                if (vacationsArray != null) {
                    for (int i = 0; i < vacationsArray.length(); i++) {
                        JSONObject vacation = vacationsArray.getJSONObject(i);
                        String vacDate = vacation.optString("date", "");
                        if (selectedDateKey.equals(vacDate)) {
                            String employeeName = vacation.optString("employeeName", "");
                            String type = vacation.optString("type", "휴가");
                            String title = employeeName.isEmpty() ? type : employeeName + " " + type;
                            itemList.add(new ItemInfo("vac_" + i, title, "", false, true, type));
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
                        
                        if (shouldShowOnDate(todo, selectedDateKey, todayKey)) {
                            String id = todo.optString("id", "task_" + i);
                            String title = todo.optString("title", "");
                            String priority = todo.optString("priority", "medium");
                            itemList.add(new ItemInfo(id, title, priority, completed, isVacation, null));
                        }
                    }
                }
                
                // 정렬: 휴가 → 미완료(우선순위) → 완료
                Collections.sort(itemList, new Comparator<ItemInfo>() {
                    @Override
                    public int compare(ItemInfo a, ItemInfo b) {
                        return a.getSortOrder() - b.getSortOrder();
                    }
                });
            }
        } catch (Exception e) {
            android.util.Log.e("WeeklyFactory", "Error loading tasks: " + e.getMessage());
        }
    }
    
    private boolean shouldShowOnDate(JSONObject todo, String targetDateKey, String todayKey) {
        try {
            String startDate = todo.optString("startDate", "");
            String dueDate = todo.optString("dueDate", "");
            boolean completed = todo.optBoolean("completed", false);
            
            String startDateKey = (startDate != null && startDate.length() >= 10) ? startDate.substring(0, 10) : "";
            String dueDateKey = (dueDate != null && dueDate.length() >= 10) ? dueDate.substring(0, 10) : "";
            
            boolean hasStart = !startDateKey.isEmpty();
            boolean hasDue = !dueDateKey.isEmpty();
            
            if (hasStart && hasDue) {
                return targetDateKey.compareTo(startDateKey) >= 0 && targetDateKey.compareTo(dueDateKey) <= 0;
            }
            if (hasStart && !hasDue) {
                if (targetDateKey.equals(startDateKey)) return true;
                if (!completed && targetDateKey.compareTo(startDateKey) > 0 && targetDateKey.compareTo(todayKey) <= 0) {
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

    @Override
    public void onDestroy() {
        itemList.clear();
    }

    @Override
    public int getCount() {
        return itemList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= itemList.size()) {
            return null;
        }
        
        ItemInfo item = itemList.get(position);
        // 오늘 위젯과 동일한 레이아웃 사용
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_task_item);
        
        if (item.isVacation) {
            // 휴가: 체크박스 숨기고 타이틀만 표시
            views.setTextViewText(R.id.widget_item_checkbox, "");
            views.setTextViewText(R.id.widget_item_title, item.title);
            views.setTextColor(R.id.widget_item_title, item.getColor());
            views.setViewVisibility(R.id.widget_item_due_date, View.GONE);
            
            Intent openAppIntent = new Intent();
            openAppIntent.putExtra("action", "open_app");
            views.setOnClickFillInIntent(R.id.widget_item_text_area, openAppIntent);
        } else {
            // 할일: 체크박스 + 제목
            String checkbox = item.getCheckbox();
            views.setTextViewText(R.id.widget_item_checkbox, checkbox);
            views.setTextColor(R.id.widget_item_checkbox, item.getColor());
            
            views.setTextViewText(R.id.widget_item_title, item.title);
            
            if (item.completed) {
                views.setTextColor(R.id.widget_item_checkbox, Color.parseColor("#6B7280"));
                views.setTextColor(R.id.widget_item_title, Color.parseColor("#6B7280"));
            } else {
                views.setTextColor(R.id.widget_item_title, Color.WHITE);
            }
            
            views.setViewVisibility(R.id.widget_item_due_date, View.GONE);
            
            Intent toggleIntent = new Intent();
            toggleIntent.putExtra("action", "toggle");
            toggleIntent.putExtra("task_id", item.id);
            views.setOnClickFillInIntent(R.id.widget_item_checkbox, toggleIntent);
            
            Intent openAppIntent = new Intent();
            openAppIntent.putExtra("action", "open_app");
            openAppIntent.putExtra("task_id", item.id);
            views.setOnClickFillInIntent(R.id.widget_item_text_area, openAppIntent);
        }
        
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
}
