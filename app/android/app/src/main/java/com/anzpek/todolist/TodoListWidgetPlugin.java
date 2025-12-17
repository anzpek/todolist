package com.anzpek.todolist;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

@CapacitorPlugin(name = "TodoListWidget")
public class TodoListWidgetPlugin extends Plugin {

    private static final String PREFS_NAME = "WidgetPrefs";
    private static final String PREF_PREFIX_KEY = "todo_list_";
    private static final String ACTION_TOGGLE_TODO = "com.anzpek.todolist.TOGGLE_TODO";
    
    private BroadcastReceiver toggleReceiver;

    @Override
    public void load() {
        super.load();
        
        // TOGGLE_TODO 브로드캐스트 수신기 등록
        toggleReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String taskId = intent.getStringExtra("task_id");
                if (taskId != null && !taskId.isEmpty()) {
                    android.util.Log.d("WidgetPlugin", "📱 Received TOGGLE_TODO for task: " + taskId);
                    
                    // JavaScript 이벤트 발생
                    JSObject data = new JSObject();
                    data.put("taskId", taskId);
                    notifyListeners("toggleTodo", data);
                }
            }
        };
        
        IntentFilter filter = new IntentFilter(ACTION_TOGGLE_TODO);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(toggleReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(toggleReceiver, filter);
        }
        
        android.util.Log.d("WidgetPlugin", "📱 TOGGLE_TODO BroadcastReceiver registered");
    }
    
    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (toggleReceiver != null) {
            try {
                getContext().unregisterReceiver(toggleReceiver);
            } catch (Exception e) {
                // Ignore if already unregistered
            }
        }
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String data = call.getString("data"); // JSON String of tasks
        String date = call.getString("date"); // Date string
        Integer transparency = call.getInt("transparency"); // Transparency 0-100

        if (data == null) {
            call.reject("Must provide data");
            return;
        }

        // Save to Shared Preferences for the Widget to read
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(PREF_PREFIX_KEY + "data", data);
        if (date != null) {
            editor.putString(PREF_PREFIX_KEY + "date", date);
        }
        if (transparency != null) {
            editor.putInt(PREF_PREFIX_KEY + "transparency", transparency);
        }
        editor.apply();
        
        android.util.Log.d("WidgetPlugin", "📱 Data saved to prefs: " + data);
        android.util.Log.d("WidgetPlugin", "📱 Transparency: " + transparency);

        // Trigger Widget Update (Directly)
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] ids = appWidgetManager.getAppWidgetIds(new ComponentName(context, TodoListWidget.class));
        
        android.util.Log.d("WidgetPlugin", "📱 Found " + ids.length + " widget instances");
        
        for (int id : ids) {
            TodoListWidget.updateAppWidget(context, appWidgetManager, id);
            android.util.Log.d("WidgetPlugin", "📱 Updated widget ID: " + id);
        }

        call.resolve();
    }
}
