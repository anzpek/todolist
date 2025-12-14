package com.anzpek.todolist;

import android.view.Menu;
import android.view.MenuItem;

import com.getcapacitor.BridgeActivity;

import android.os.Bundle;
import android.util.Log;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d("MainActivity", "📱 Registering TodoListWidgetPlugin BEFORE super.onCreate...");
        try {
            registerPlugin(TodoListWidgetPlugin.class);
            Log.d("MainActivity", "📱 TodoListWidgetPlugin registered successfully!");
        } catch (Exception e) {
            Log.e("MainActivity", "📱 Failed to register plugin: " + e.getMessage(), e);
        }
        super.onCreate(savedInstanceState);
        Log.d("MainActivity", "📱 super.onCreate completed");
    }
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == R.id.action_logout) {
            getBridge().getWebView().loadUrl("https://anzpek.github.io/todolist/settings");
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}
