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
    
    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        
        if (intent != null && intent.getData() != null) {
            String url = intent.getData().toString();
            Log.d("MainActivity", "onNewIntent deep link: " + url);
            
            // todolist://add 딥링크 직접 처리
            if (url.contains("todolist://add")) {
                Log.d("MainActivity", "Opening add modal via JavaScript");
                // WebView에 직접 JavaScript 실행
                runOnUiThread(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('openAddTodoModal'));",
                            null
                        );
                    }
                });
            } else if (url.contains("todolist://toggle")) {
                // Bridge에 전달 (toggle은 기존 방식 유지)
                if (getBridge() != null) {
                    getBridge().onNewIntent(intent);
                }
            }
        }
    }
}
