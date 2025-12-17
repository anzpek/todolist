package com.anzpek.todolist;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

public class CalendarWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";
    private static final String ACTION_DATE_CLICK = "com.anzpek.todolist.DATE_CLICK";
    private static final String ACTION_PREV_MONTH = "com.anzpek.todolist.PREV_MONTH";
    private static final String ACTION_NEXT_MONTH = "com.anzpek.todolist.NEXT_MONTH";
    private static final String ACTION_GO_TODAY = "com.anzpek.todolist.CALENDAR_GO_TODAY";
    private static final String EXTRA_DATE_KEY = "selected_date_key";
    private static final int MAX_TASKS = 25;

    private static final int[] DAY_VIEW_IDS = {
        R.id.day_0, R.id.day_1, R.id.day_2, R.id.day_3, R.id.day_4, R.id.day_5, R.id.day_6,
        R.id.day_7, R.id.day_8, R.id.day_9, R.id.day_10, R.id.day_11, R.id.day_12, R.id.day_13,
        R.id.day_14, R.id.day_15, R.id.day_16, R.id.day_17, R.id.day_18, R.id.day_19, R.id.day_20,
        R.id.day_21, R.id.day_22, R.id.day_23, R.id.day_24, R.id.day_25, R.id.day_26, R.id.day_27,
        R.id.day_28, R.id.day_29, R.id.day_30, R.id.day_31, R.id.day_32, R.id.day_33, R.id.day_34,
        R.id.day_35, R.id.day_36, R.id.day_37, R.id.day_38, R.id.day_39, R.id.day_40, R.id.day_41
    };

    private static final int[] TASK_IDS = {
        R.id.task_0, R.id.task_1, R.id.task_2, R.id.task_3, R.id.task_4,
        R.id.task_5, R.id.task_6, R.id.task_7, R.id.task_8, R.id.task_9,
        R.id.task_10, R.id.task_11, R.id.task_12, R.id.task_13, R.id.task_14,
        R.id.task_15, R.id.task_16, R.id.task_17, R.id.task_18, R.id.task_19,
        R.id.task_20, R.id.task_21, R.id.task_22, R.id.task_23, R.id.task_24
    };

    // 할일/휴가 정보를 담는 클래스
    private static class TaskInfo {
        String title;
        String priority;
        boolean isVacation;
        String vacationType; // 연차, 오전, 오후, 특별, 병가, 업무
        
        TaskInfo(String title, String priority, boolean isVacation, String vacationType) {
            this.title = title;
            this.priority = priority;
            this.isVacation = isVacation;
            this.vacationType = vacationType;
        }
        
        int getPriorityValue() {
            if (isVacation) return -1; // 휴가는 맨 위에 표시
            switch (priority) {
                case "urgent": return 0;
                case "high": return 1;
                case "medium": return 2;
                case "low": return 3;
                default: return 2;
            }
        }
        
        // 우선순위별 색상 반환
        int getPriorityColor() {
            switch (priority) {
                case "urgent": return Color.parseColor("#EF4444"); // 빨강
                case "high": return Color.parseColor("#F59E0B"); // 주황
                case "medium": return Color.parseColor("#3B82F6"); // 파랑
                case "low": return Color.parseColor("#9CA3AF"); // 회색
                default: return Color.parseColor("#9CA3AF");
            }
        }
        
        // 휴가 종류별 색상 반환
        int getVacationColor() {
            if (vacationType == null) return Color.parseColor("#10B981"); // 기본 초록색
            switch (vacationType) {
                case "업무":
                    return Color.parseColor("#FCD34D"); // 노란색
                case "연차":
                case "휴가":
                    return Color.parseColor("#10B981"); // 초록색
                case "오전":
                    return Color.parseColor("#60A5FA"); // 파란색
                case "오후":
                    return Color.parseColor("#A78BFA"); // 보라색
                case "특별":
                    return Color.parseColor("#FB7185"); // 분홍색
                case "병가":
                    return Color.parseColor("#F87171"); // 빨간색
                default:
                    return Color.parseColor("#10B981"); // 기본 초록색
            }
        }
    }

    // 우선순위별 체크박스 반환 (네모 체크박스)
    private static String getPriorityCheckbox(String priority) {
        return "☐"; // 네모 체크박스
    }

    /**
     * ISO 날짜 문자열에서 yyyy-MM-dd 부분만 추출
     */
    private static String extractDateKey(String isoDate) {
        if (isoDate == null || isoDate.isEmpty()) return "";
        if (isoDate.length() >= 10) {
            return isoDate.substring(0, 10);
        }
        return "";
    }

    /**
     * 특정 날짜에 할일을 표시해야 하는지 판단
     */
    private static boolean shouldShowOnDate(JSONObject task, String targetDateKey, String todayDateKey) {
        try {
            boolean completed = task.optBoolean("completed", false);
            if (completed) return false;

            String startDateKey = extractDateKey(task.optString("startDate", ""));
            String dueDateKey = extractDateKey(task.optString("dueDate", ""));

            boolean hasStart = !startDateKey.isEmpty();
            boolean hasDue = !dueDateKey.isEmpty();

            if (hasStart && hasDue) {
                return targetDateKey.compareTo(startDateKey) >= 0 && targetDateKey.compareTo(dueDateKey) <= 0;
            }

            if (hasStart && !hasDue) {
                if (targetDateKey.equals(startDateKey)) return true;
                if (targetDateKey.compareTo(startDateKey) > 0 && targetDateKey.compareTo(todayDateKey) <= 0) {
                    return true;
                }
                return false;
            }
            
            if (!hasStart && hasDue) {
                return targetDateKey.equals(dueDateKey);
            }
            
            return false;
        } catch (Exception e) {
            android.util.Log.e("CalendarWidget", "shouldShowOnDate error: " + e.getMessage());
            return false;
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_layout_v2);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        try {
            int displayYear = prefs.getInt("calendar_display_year", -1);
            int displayMonth = prefs.getInt("calendar_display_month", -1);
            
            Calendar displayCal = Calendar.getInstance();
            if (displayYear > 0 && displayMonth >= 0) {
                displayCal.set(Calendar.YEAR, displayYear);
                displayCal.set(Calendar.MONTH, displayMonth);
            }
            
            Calendar today = Calendar.getInstance();
            int todayYear = today.get(Calendar.YEAR);
            int todayMonth = today.get(Calendar.MONTH);
            int todayDay = today.get(Calendar.DAY_OF_MONTH);
            
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayKey = dateKeyFormat.format(today.getTime());
            
            String selectedDateKey = prefs.getString("calendar_selected_date_key", todayKey);
            
            SimpleDateFormat monthFormat = new SimpleDateFormat("MMM yyyy", Locale.ENGLISH);
            views.setTextViewText(R.id.widget_calendar_month_title, monthFormat.format(displayCal.getTime()));

            // 월 이동 버튼
            Intent prevIntent = new Intent(context, CalendarWidgetProvider.class);
            prevIntent.setAction(ACTION_PREV_MONTH);
            PendingIntent prevPendingIntent = PendingIntent.getBroadcast(context, 2000, prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_prev_month, prevPendingIntent);
            
            Intent nextIntent = new Intent(context, CalendarWidgetProvider.class);
            nextIntent.setAction(ACTION_NEXT_MONTH);
            PendingIntent nextPendingIntent = PendingIntent.getBroadcast(context, 2001, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.btn_next_month, nextPendingIntent);
            
            // 월 제목 클릭 시 오늘로 이동
            Intent goTodayIntent = new Intent(context, CalendarWidgetProvider.class);
            goTodayIntent.setAction(ACTION_GO_TODAY);
            PendingIntent goTodayPendingIntent = PendingIntent.getBroadcast(context, 2003, goTodayIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setOnClickPendingIntent(R.id.widget_calendar_month_title, goTodayPendingIntent);

            // 오른쪽 영역 클릭시 앱 열기
            Intent appIntent = new Intent(context, MainActivity.class);
            PendingIntent appPendingIntent = PendingIntent.getActivity(context, 2002, appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.task_list_container, appPendingIntent);

            // 할일 로드 (combined 형식에서 calendar 키 파싱)
            String todoJson = prefs.getString(PREF_PREFIX_KEY + "data", "[]");
            JSONArray allTasks = new JSONArray();
            JSONArray vacations = new JSONArray();
            
            if (todoJson.startsWith("{")) {
                JSONObject combined = new JSONObject(todoJson);
                JSONArray calendarTasks = combined.optJSONArray("calendar");
                if (calendarTasks != null) {
                    allTasks = calendarTasks;
                }
                // 휴가 데이터 로드
                JSONArray vacationData = combined.optJSONArray("vacations");
                if (vacationData != null) {
                    vacations = vacationData;
                }
            } else {
                allTasks = new JSONArray(todoJson);
            }
            
            android.util.Log.d("CalendarWidget", "Loaded " + allTasks.length() + " calendar tasks, " + vacations.length() + " vacations");

            // 달력 계산 (일요일 시작)
            Calendar cal = (Calendar) displayCal.clone();
            cal.set(Calendar.DAY_OF_MONTH, 1);
            int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
            int offset = dayOfWeek - Calendar.SUNDAY;
            cal.add(Calendar.DAY_OF_MONTH, -offset);

            // 날짜별 할일 분류 (TaskInfo로 우선순위 포함)
            Map<String, List<TaskInfo>> tasksByDate = new HashMap<>();
            Calendar tempCal = (Calendar) cal.clone();
            for (int i = 0; i < 42; i++) {
                String dateKey = dateKeyFormat.format(tempCal.getTime());
                List<TaskInfo> tasksForDay = new ArrayList<>();
                
                // 휴가 먼저 추가
                for (int j = 0; j < vacations.length(); j++) {
                    JSONObject vacation = vacations.getJSONObject(j);
                    String vacationDate = vacation.optString("date", "");
                    if (dateKey.equals(vacationDate)) {
                        String employeeName = vacation.optString("employeeName", "");
                        String type = vacation.optString("type", "휴가");
                        String title = employeeName.isEmpty() ? type : employeeName + " " + type;
                        tasksForDay.add(new TaskInfo(title, "", true, type));
                    }
                }
                
                // 할일 추가
                for (int j = 0; j < allTasks.length(); j++) {
                    JSONObject task = allTasks.getJSONObject(j);
                    if (shouldShowOnDate(task, dateKey, todayKey)) {
                        String title = task.optString("title", "");
                        String priority = task.optString("priority", "medium");
                        tasksForDay.add(new TaskInfo(title, priority, false, null));
                    }
                }
                
                // 우선순위로 정렬 (휴가가 맨 위, 그 다음 urgent, high, medium, low)
                Collections.sort(tasksForDay, new Comparator<TaskInfo>() {
                    @Override
                    public int compare(TaskInfo a, TaskInfo b) {
                        return a.getPriorityValue() - b.getPriorityValue();
                    }
                });
                
                if (!tasksForDay.isEmpty()) {
                    tasksByDate.put(dateKey, tasksForDay);
                }
                tempCal.add(Calendar.DAY_OF_MONTH, 1);
            }

            // 42개 날짜 채우기
            int displayMonthValue = displayCal.get(Calendar.MONTH);
            for (int i = 0; i < 42; i++) {
                int dayOfMonth = cal.get(Calendar.DAY_OF_MONTH);
                int month = cal.get(Calendar.MONTH);
                int year = cal.get(Calendar.YEAR);
                String dateKey = dateKeyFormat.format(cal.getTime());
                
                boolean hasTask = tasksByDate.containsKey(dateKey);
                String dayText = dayOfMonth + "\n" + (hasTask ? "•" : " ");
                views.setTextViewText(DAY_VIEW_IDS[i], dayText);
                
                int color;
                boolean isSelected = dateKey.equals(selectedDateKey);
                boolean isToday = (year == todayYear && month == todayMonth && dayOfMonth == todayDay);
                
                if (isSelected) {
                    color = Color.parseColor("#10B981");
                } else if (isToday) {
                    color = Color.parseColor("#3B82F6");
                } else if (month != displayMonthValue) {
                    color = Color.parseColor("#4B5563");
                } else {
                    color = Color.WHITE;
                }
                views.setTextColor(DAY_VIEW_IDS[i], color);

                Intent clickIntent = new Intent(context, CalendarWidgetProvider.class);
                clickIntent.setAction(ACTION_DATE_CLICK);
                clickIntent.putExtra(EXTRA_DATE_KEY, dateKey);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 
                    1000 + i, clickIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                views.setOnClickPendingIntent(DAY_VIEW_IDS[i], pendingIntent);
                
                cal.add(Calendar.DAY_OF_MONTH, 1);
            }

            // 선택된 날짜의 할일 표시 (체크박스 이모지로 우선순위 표시, 텍스트는 흰색)
            List<TaskInfo> tasksForSelectedDate = tasksByDate.get(selectedDateKey);
            
            if (tasksForSelectedDate == null || tasksForSelectedDate.isEmpty()) {
                views.setViewVisibility(R.id.task_empty, android.view.View.VISIBLE);
                views.setViewVisibility(R.id.task_more, android.view.View.GONE);
                for (int id : TASK_IDS) {
                    views.setViewVisibility(id, android.view.View.GONE);
                }
            } else {
                views.setViewVisibility(R.id.task_empty, android.view.View.GONE);
                
                int displayCount = Math.min(tasksForSelectedDate.size(), MAX_TASKS);
                for (int i = 0; i < MAX_TASKS; i++) {
                    if (i < displayCount) {
                        TaskInfo task = tasksForSelectedDate.get(i);
                        if (task.isVacation) {
                            // 휴가: 타이틀 그대로 + 종류별 색상
                            views.setTextViewText(TASK_IDS[i], task.title);
                            views.setTextColor(TASK_IDS[i], task.getVacationColor());
                        } else {
                            // 할일: 네모 체크박스(우선순위 색상) + 흰색 텍스트
                            String checkboxText = "☐ ";
                            String fullText = checkboxText + task.title;
                            SpannableString spannable = new SpannableString(fullText);
                            // 체크박스 부분만 우선순위 색상
                            spannable.setSpan(new ForegroundColorSpan(task.getPriorityColor()), 0, checkboxText.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                            // 텍스트 부분은 흰색
                            spannable.setSpan(new ForegroundColorSpan(Color.WHITE), checkboxText.length(), fullText.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                            views.setTextViewText(TASK_IDS[i], spannable);
                        }
                        views.setViewVisibility(TASK_IDS[i], android.view.View.VISIBLE);
                    } else {
                        views.setViewVisibility(TASK_IDS[i], android.view.View.GONE);
                    }
                }
                
                if (tasksForSelectedDate.size() > MAX_TASKS) {
                    views.setTextViewText(R.id.task_more, "+ " + (tasksForSelectedDate.size() - MAX_TASKS) + " More");
                    views.setViewVisibility(R.id.task_more, android.view.View.VISIBLE);
                } else {
                    views.setViewVisibility(R.id.task_more, android.view.View.GONE);
                }
            }

        } catch (Exception e) {
            android.util.Log.e("CalendarWidget", "ERROR: " + e.getMessage(), e);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        if (ACTION_DATE_CLICK.equals(action)) {
            String dateKey = intent.getStringExtra(EXTRA_DATE_KEY);
            if (dateKey != null) {
                prefs.edit().putString("calendar_selected_date_key", dateKey).apply();
                refreshWidget(context);
            }
        } else if (ACTION_PREV_MONTH.equals(action)) {
            Calendar displayCal = Calendar.getInstance();
            int year = prefs.getInt("calendar_display_year", displayCal.get(Calendar.YEAR));
            int month = prefs.getInt("calendar_display_month", displayCal.get(Calendar.MONTH));
            
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.YEAR, year);
            cal.set(Calendar.MONTH, month);
            cal.add(Calendar.MONTH, -1);
            
            prefs.edit()
                .putInt("calendar_display_year", cal.get(Calendar.YEAR))
                .putInt("calendar_display_month", cal.get(Calendar.MONTH))
                .apply();
            refreshWidget(context);
        } else if (ACTION_NEXT_MONTH.equals(action)) {
            Calendar displayCal = Calendar.getInstance();
            int year = prefs.getInt("calendar_display_year", displayCal.get(Calendar.YEAR));
            int month = prefs.getInt("calendar_display_month", displayCal.get(Calendar.MONTH));
            
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.YEAR, year);
            cal.set(Calendar.MONTH, month);
            cal.add(Calendar.MONTH, 1);
            
            prefs.edit()
                .putInt("calendar_display_year", cal.get(Calendar.YEAR))
                .putInt("calendar_display_month", cal.get(Calendar.MONTH))
                .apply();
            refreshWidget(context);
        } else if (ACTION_GO_TODAY.equals(action)) {
            // 오늘 날짜로 이동 (월과 선택 날짜 모두 초기화)
            Calendar today = Calendar.getInstance();
            SimpleDateFormat dateKeyFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayKey = dateKeyFormat.format(today.getTime());
            
            prefs.edit()
                .putInt("calendar_display_year", today.get(Calendar.YEAR))
                .putInt("calendar_display_month", today.get(Calendar.MONTH))
                .putString("calendar_selected_date_key", todayKey)
                .apply();
            refreshWidget(context);
        }
    }

    private void refreshWidget(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, CalendarWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
