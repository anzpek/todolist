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
        editor.apply();

        // Trigger Widget Update
        Intent intent = new Intent(context, TodoListWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, TodoListWidget.class));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(intent);

        call.resolve();
    }
}
