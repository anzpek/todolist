package com.anzpek.todolist;

import android.content.Intent;
import android.widget.RemoteViewsService;

public class TodoListWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new TodoListRemoteViewsFactory(this.getApplicationContext());
    }
}
