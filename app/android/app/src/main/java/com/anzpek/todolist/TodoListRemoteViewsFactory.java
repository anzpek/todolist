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

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class TodoListRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private List<ItemInfo> itemList = new ArrayList<>();
    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";

    // 아이템 정보 클래스 (휴가 또는 할일)
    private static class ItemInfo {
        String id;
        String title;
        String priority;
        boolean completed;
        boolean isVacation;
        String vacationType;
        int progress;
        
        ItemInfo(String id, String title, String priority, boolean completed, boolean isVacation, String vacationType, int progress) {
            this.id = id;
            this.title = title;
            this.priority = priority;
            this.completed = completed;
            this.isVacation = isVacation;
            this.vacationType = vacationType;
            this.progress = progress;
        }
        
        int getSortOrder() {
            // 휴가: 0, 미완료 할일: 1 (우선순위별), 완료된 할일: 2
            if (isVacation) return 0;
            if (completed) return 100;
            switch (priority) {
                case "urgent": return 1;
                case "high": return 2;
                case "medium": return 3;
                case "low": return 4;
                default: return 3;
            }
        }
        
        int getColor() {
            if (isVacation) {
                // 휴가 종류별 색상
                if (vacationType == null) return Color.parseColor("#10B981");
                switch (vacationType) {
                    case "업무": return Color.parseColor("#FCD34D"); // 노란색
                    case "연차":
                    case "휴가": return Color.parseColor("#10B981"); // 초록색
                    case "오전": return Color.parseColor("#60A5FA"); // 파란색
                    case "오후": return Color.parseColor("#A78BFA"); // 보라색
                    case "특별": return Color.parseColor("#FB7185"); // 분홍색
                    case "병가": return Color.parseColor("#F87171"); // 빨간색
                    default: return Color.parseColor("#10B981");
                }
            }
            // 할일 우선순위 색상
            switch (priority) {
                case "urgent": return Color.parseColor("#EF4444");
                case "high": return Color.parseColor("#F59E0B");
                case "medium": return Color.parseColor("#3B82F6");
                case "low": return Color.parseColor("#9CA3AF");
                default: return Color.parseColor("#9CA3AF");
            }
        }
        
        String getCheckbox() {
            if (isVacation) return ""; // 휴가는 체크박스 없음
            if (completed) return "☑";
            return "☐"; // 네모 체크박스
        }
    }

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
        itemList.clear();
    }

    @Override
    public int getCount() {
        return itemList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= itemList.size()) return null;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_task_item);
        ItemInfo item = itemList.get(position);

        if (item.isVacation) {
            // 휴가: 체크박스 숨기고 타이틀만 표시
            views.setTextViewText(R.id.widget_item_checkbox, "");
            views.setTextViewText(R.id.widget_item_title, item.title);
            views.setTextColor(R.id.widget_item_title, item.getColor());
            views.setViewVisibility(R.id.widget_item_due_date, View.GONE);
            
            // 휴가는 클릭 시 앱 열기만
            Intent openAppIntent = new Intent();
            openAppIntent.putExtra("action", "open_app");
            views.setOnClickFillInIntent(R.id.widget_item_text_area, openAppIntent);
        } else {
            // 할일: 체크박스 + 제목
            String checkbox = item.getCheckbox();
            views.setTextViewText(R.id.widget_item_checkbox, checkbox);
            views.setTextColor(R.id.widget_item_checkbox, item.getColor()); // 체크박스만 우선순위 색상
            
            views.setTextViewText(R.id.widget_item_title, item.title);
            
            if (item.completed) {
                // 완료된 할일: 체크박스/텍스트 모두 회색
                views.setTextColor(R.id.widget_item_checkbox, Color.parseColor("#6B7280"));
                views.setTextColor(R.id.widget_item_title, Color.parseColor("#6B7280"));
            } else {
                // 미완료 할일: 체크박스 우선순위 색상, 텍스트 흰색
                views.setTextColor(R.id.widget_item_title, Color.WHITE);
            }
            
            // 진행률 표시
            if (item.progress >= 0) {
                views.setTextViewText(R.id.widget_item_due_date, "[" + item.progress + "%]");
                views.setViewVisibility(R.id.widget_item_due_date, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_item_due_date, View.GONE);
            }
            
            // 체크박스 클릭 → 완료 토글
            Intent toggleIntent = new Intent();
            toggleIntent.putExtra("action", "toggle");
            toggleIntent.putExtra("task_id", item.id);
            views.setOnClickFillInIntent(R.id.widget_item_checkbox, toggleIntent);
            
            // 텍스트 클릭 → 앱 열기
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

    /**
     * 선택된 날짜에 할일을 표시해야 하는지 판단 (캘린더 위젯과 동일한 로직)
     */
    private boolean shouldShowOnDate(JSONObject task, String targetDateKey, String todayDateKey) {
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
    
    private String extractDateKey(String isoDate) {
        if (isoDate == null || isoDate.isEmpty()) return "";
        if (isoDate.length() >= 10) {
            return isoDate.substring(0, 10);
        }
        return "";
    }

    private void loadTasks() {
        itemList.clear();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String todoJson = prefs.getString(PREF_PREFIX_KEY + "data", "[]");
            
            JSONArray calendarTasks = new JSONArray();
            JSONArray vacations = new JSONArray();
            
            if (todoJson.startsWith("{")) {
                JSONObject combined = new JSONObject(todoJson);
                // calendar 데이터 사용 (today가 아닌)
                calendarTasks = combined.optJSONArray("calendar");
                if (calendarTasks == null) calendarTasks = new JSONArray();
                vacations = combined.optJSONArray("vacations");
                if (vacations == null) vacations = new JSONArray();
            } else {
                calendarTasks = new JSONArray(todoJson);
            }
            
            // 선택된 날짜 가져오기
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayKey = dateKeyFormat.format(new java.util.Date());
            String selectedDate = prefs.getString("today_widget_selected_date", todayKey);
            
            android.util.Log.d("TodoListFactory", "Loading tasks for date: " + selectedDate + ", todayKey: " + todayKey);
            
            // 휴가 추가 (선택된 날짜만)
            for (int i = 0; i < vacations.length(); i++) {
                JSONObject v = vacations.getJSONObject(i);
                String vacDate = v.optString("date", "");
                if (selectedDate.equals(vacDate)) {
                    String employeeName = v.optString("employeeName", "");
                    String type = v.optString("type", "휴가");
                    String title = employeeName.isEmpty() ? type : employeeName + " " + type;
                    itemList.add(new ItemInfo(v.optString("id", "vac_" + i), title, "", false, true, type, -1));
                }
            }
            
            // 할일 추가 (선택된 날짜에 표시해야 하는 것만 - 캘린더와 동일한 로직)
            for (int i = 0; i < calendarTasks.length(); i++) {
                JSONObject task = calendarTasks.getJSONObject(i);
                
                if (shouldShowOnDate(task, selectedDate, todayKey)) {
                    String id = task.optString("id", "task_" + i);
                    String title = task.optString("title", "");
                    String priority = task.optString("priority", "medium");
                    boolean completed = task.optBoolean("completed", false);
                    int progress = -1; // calendar에는 progress 없음
                    
                    itemList.add(new ItemInfo(id, title, priority, completed, false, null, progress));
                }
            }
            
            // 정렬: 휴가 → 미완료(우선순위) → 완료
            Collections.sort(itemList, new Comparator<ItemInfo>() {
                @Override
                public int compare(ItemInfo a, ItemInfo b) {
                    return a.getSortOrder() - b.getSortOrder();
                }
            });
            
            android.util.Log.d("TodoListFactory", "Loaded " + itemList.size() + " items for " + selectedDate);
            
        } catch (Exception e) {
            android.util.Log.e("TodoListFactory", "Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
