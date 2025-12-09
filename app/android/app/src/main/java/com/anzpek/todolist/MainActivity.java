package com.anzpek.todolist;

import android.view.Menu;
import android.view.MenuItem;

import com.getcapacitor.BridgeActivity;

import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
