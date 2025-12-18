package com.anzpek.todolist;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import android.graphics.Color;
import android.view.View;

import android.graphics.Paint;
import android.util.TypedValue;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Calendar 위젯의 할일 리스트 어댑터 (Today 위젯과 동일한 기능)
 * - 휴가 표시 (3개씩 한 줄)
 * - 완료된 할일 표시
 * - 체크박스 토글 지원
 */
public class CalendarRemoteViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private final Context context;
    private List<ItemInfo> itemList = new ArrayList<>();
    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";

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
                // 모든 휴가 유형을 초록색으로 통일
                return Color.parseColor("#10B981");
            }
            switch (priority) {
                case "urgent": return Color.parseColor("#EF4444");
                case "high": return Color.parseColor("#F59E0B");
                case "medium": return Color.parseColor("#3B82F6");
                case "low": return Color.parseColor("#10B981");
                default: return Color.parseColor("#A78BFA");
            }
        }
        
        String getCheckbox() {
            return completed ? "☑" : "☐";
        }
    }

    public CalendarRemoteViewsFactory(Context context, Intent intent) {
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
            views.setTextViewText(R.id.widget_item_checkbox, "");
            views.setTextViewText(R.id.widget_item_title, item.title);
            views.setTextColor(R.id.widget_item_title, item.getColor());
            views.setViewVisibility(R.id.widget_item_due_date, View.GONE);
            
            Intent openAppIntent = new Intent();
            openAppIntent.putExtra("action", "open_app");
            views.setOnClickFillInIntent(R.id.widget_item_text_area, openAppIntent);
        } else {
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

    private boolean shouldShowOnDate(JSONObject task, String targetDateKey, String todayDateKey) {
        try {
            boolean completed = task.optBoolean("completed", false);
            
            String startDateKey = extractDateKey(task.optString("startDate", ""));
            String dueDateKey = extractDateKey(task.optString("dueDate", ""));
            String completedAtKey = extractDateKey(task.optString("completedAt", ""));

            boolean hasStart = !startDateKey.isEmpty();
            boolean hasDue = !dueDateKey.isEmpty();

            if (completed && !completedAtKey.isEmpty()) {
                return targetDateKey.equals(todayDateKey) && completedAtKey.equals(todayDateKey);
            }
            
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
            
            if (!hasStart && !hasDue && !completed) {
                return targetDateKey.equals(todayDateKey);
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
                calendarTasks = combined.optJSONArray("calendar");
                if (calendarTasks == null) calendarTasks = new JSONArray();
                vacations = combined.optJSONArray("vacations");
                if (vacations == null) vacations = new JSONArray();
            } else {
                calendarTasks = new JSONArray(todoJson);
            }
            
            // Calendar 위젯용 선택된 날짜 (calendar_selected_date_key)
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayKey = dateKeyFormat.format(new java.util.Date());
            String selectedDate = prefs.getString("calendar_selected_date_key", todayKey);
            
            android.util.Log.d("CalendarFactory", "Loading tasks for: " + selectedDate);
            
            // 휴가 수집
            List<String> vacationTitles = new ArrayList<>();
            for (int i = 0; i < vacations.length(); i++) {
                JSONObject v = vacations.getJSONObject(i);
                String vacDate = v.optString("date", "");
                if (selectedDate.equals(vacDate)) {
                    String employeeName = v.optString("employeeName", "");
                    String type = v.optString("type", "휴가");
                    String title = employeeName.isEmpty() ? type : employeeName + " " + type;
                    vacationTitles.add(title);
                }
            }
            
            // 휴가: 한 줄에 최대한 많이, 글이 잘리지 않게 (Paint 측정, Max 200dp)
            if (!vacationTitles.isEmpty()) {
                Paint paint = new Paint();
                paint.setTextSize(spToPx(15)); // 15sp
                float maxLineWidth = dpToPx(140); // Calendar 위젯 너비 (더 좁게 잡음)
                float separatorWidth = paint.measureText(" ⸰ ");
                
                StringBuilder line = new StringBuilder();
                float currentLineWidth = 0;
                int lineIndex = 0;
                
                for (int i = 0; i < vacationTitles.size(); i++) {
                    String title = vacationTitles.get(i);
                    float titleWidth = paint.measureText(title);
                    
                    if (line.length() == 0) {
                        line.append(title);
                        currentLineWidth = titleWidth;
                    } else {
                        if (currentLineWidth + separatorWidth + titleWidth <= maxLineWidth) {
                            line.append(" ⸰ ").append(title);
                            currentLineWidth += (separatorWidth + titleWidth);
                        } else {
                            itemList.add(new ItemInfo("vac_line_" + lineIndex, line.toString(), "", false, true, "휴가", -1));
                            lineIndex++;
                            line = new StringBuilder(title);
                            currentLineWidth = titleWidth;
                        }
                    }
                }
                if (line.length() > 0) {
                    itemList.add(new ItemInfo("vac_line_" + lineIndex, line.toString(), "", false, true, "휴가", -1));
                }
            }
            
            // 할일 추가
            for (int i = 0; i < calendarTasks.length(); i++) {
                JSONObject task = calendarTasks.getJSONObject(i);
                
                if (shouldShowOnDate(task, selectedDate, todayKey)) {
                    String id = task.optString("id", "task_" + i);
                    String title = task.optString("title", "");
                    String priority = task.optString("priority", "medium");
                    boolean completed = task.optBoolean("completed", false);
                    
                    itemList.add(new ItemInfo(id, title, priority, completed, false, null, -1));
                }
            }
            
            // 정렬: 휴가 → 미완료(우선순위) → 완료
            Collections.sort(itemList, new Comparator<ItemInfo>() {
                @Override
                public int compare(ItemInfo a, ItemInfo b) {
                    return a.getSortOrder() - b.getSortOrder();
                }
            });
            
            android.util.Log.d("CalendarFactory", "Loaded " + itemList.size() + " items");
            
        } catch (Exception e) {
            android.util.Log.e("CalendarFactory", "Error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private float dpToPx(float dp) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, context.getResources().getDisplayMetrics());
    }

    private float spToPx(float sp) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sp, context.getResources().getDisplayMetrics());
    }
}
