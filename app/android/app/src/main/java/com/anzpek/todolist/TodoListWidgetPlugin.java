package com.anzpek.todolist;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

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
