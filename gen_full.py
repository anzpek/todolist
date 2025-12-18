header = '''<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_full_calendar_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="8dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:paddingBottom="4dp">
        
        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="horizontal"
            android:gravity="center">
            
            <TextView
                android:id="@+id/btn_prev_month"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:text="◀"
                android:textColor="#3B82F6"
                android:textSize="11sp"
                android:gravity="center"
                android:layout_marginEnd="16dp"
                android:background="?android:selectableItemBackground"/>
            
            <TextView
                android:id="@+id/widget_month_title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="2024년 12월"
                android:textColor="#3B82F6"
                android:textSize="14sp"
                android:textStyle="bold"/>
            
            <TextView
                android:id="@+id/btn_next_month"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:text="▶"
                android:textColor="#3B82F6"
                android:textSize="11sp"
                android:gravity="center"
                android:layout_marginStart="16dp"
                android:background="?android:selectableItemBackground"/>
        </LinearLayout>
            
        <TextView
            android:id="@+id/btn_add_todo"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="+"
            android:textColor="#FFFFFF"
            android:textSize="20sp"
            android:textStyle="bold"
            android:gravity="center"
            android:paddingHorizontal="8dp"/>
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:paddingBottom="2dp">
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:text="일" android:textColor="#EF4444" android:textSize="12sp" android:gravity="center"/>
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:text="월" android:textColor="#9CA3AF" android:textSize="12sp" android:gravity="center"/>
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:text="화" android:textColor="#9CA3AF" android:textSize="12sp" android:gravity="center"/>
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:text="수" android:textColor="#9CA3AF" android:textSize="12sp" android:gravity="center"/>
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:text="목" android:textColor="#9CA3AF" android:textSize="12sp" android:gravity="center"/>
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:text="금" android:textColor="#9CA3AF" android:textSize="12sp" android:gravity="center"/>
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:text="토" android:textColor="#3B82F6" android:textSize="12sp" android:gravity="center"/>
    </LinearLayout>
'''

rows = []
for week in range(5):
    row_cells = []
    for day in range(7):
        cell_idx = week * 7 + day
        tasks = '\n            '.join([f'<TextView android:id="@+id/task_{cell_idx}_{t}" android:layout_width="match_parent" android:layout_height="wrap_content" android:textColor="#FFFFFF" android:textSize="10sp" android:maxLines="1" android:ellipsize="end" android:visibility="gone"/>' for t in range(10)])
        more = f'<TextView android:id="@+id/task_{cell_idx}_more" android:layout_width="match_parent" android:layout_height="wrap_content" android:textColor="#3B82F6" android:textSize="9sp" android:visibility="gone"/>'
        cell = f'''        <LinearLayout android:id="@+id/cell_{cell_idx}" android:layout_width="0dp" android:layout_height="match_parent" android:layout_weight="1" android:orientation="vertical" android:padding="1dp">
            <TextView android:id="@+id/day_{cell_idx}" android:layout_width="match_parent" android:layout_height="wrap_content" android:textColor="#6B7280" android:textSize="12sp" android:gravity="center"/>
            {tasks}
            {more}
        </LinearLayout>'''
        row_cells.append(cell)
    row = f'''    <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:orientation="horizontal">
{chr(10).join(row_cells)}
    </LinearLayout>'''
    rows.append(row)

footer = '''
</LinearLayout>'''

content = header + '\n'.join(rows) + footer
with open(r'c:\Users\dan\Documents\todolist\app\android\app\src\main\res\layout\widget_full_calendar_layout.xml', 'w', encoding='utf-8') as f:
    f.write(content)
print('Full Calendar: 10 tasks per cell - DONE')
