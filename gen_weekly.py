content = '''<?xml version="1.0" encoding="utf-8"?>
<!-- 주간 캘린더 위젯 - 상단 캘린더 (12개 할일, 12sp), 하단 ListView 할일 목록 -->
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_weekly_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="8dp">

    <!-- 상단: 네비게이션 + + 버튼 -->
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
                android:id="@+id/btn_prev_week"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:text="◀"
                android:textColor="#3B82F6"
                android:textSize="11sp"
                android:gravity="center"
                android:layout_marginEnd="16dp"
                android:background="?android:selectableItemBackground"/>
            
            <TextView
                android:id="@+id/widget_weekly_title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="2024년 12월 1주"
                android:textColor="#3B82F6"
                android:textSize="14sp"
                android:textStyle="bold"/>
            
            <TextView
                android:id="@+id/btn_next_week"
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
    
    <!-- 캘린더 영역 -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="2"
        android:orientation="vertical">
        
        <!-- 요일 헤더 + 날짜 -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:paddingBottom="2dp">
'''

days = ['일', '월', '화', '수', '목', '금', '토']
colors = ['#EF4444', '#9CA3AF', '#9CA3AF', '#9CA3AF', '#9CA3AF', '#9CA3AF', '#3B82F6']
for i, (day, color) in enumerate(zip(days, colors)):
    content += f'''            <LinearLayout android:id="@+id/day_col_{i}" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:orientation="vertical" android:gravity="center" android:background="?android:selectableItemBackground">
                <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="{day}" android:textColor="{color}" android:textSize="12sp" android:gravity="center"/>
                <TextView android:id="@+id/day_{i}" android:layout_width="24dp" android:layout_height="24dp" android:textColor="#FFFFFF" android:textSize="12sp" android:gravity="center"/>
            </LinearLayout>
'''

content += '''        </LinearLayout>

        <!-- 7개 칼럼으로 할일 표시 (각 12개 + more) -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="0dp"
            android:layout_weight="1"
            android:orientation="horizontal"
            android:paddingTop="2dp">
'''

for col in range(7):
    content += f'''            
            <LinearLayout android:id="@+id/col_{col}" android:layout_width="0dp" android:layout_height="match_parent" android:layout_weight="1" android:orientation="vertical" android:paddingEnd="1dp" android:background="?android:selectableItemBackground">
'''
    for t in range(12):
        content += f'                <TextView android:id="@+id/task_{col}_{t}" android:layout_width="match_parent" android:layout_height="wrap_content" android:textColor="#FFFFFF" android:textSize="12sp" android:maxLines="1" android:ellipsize="end" android:visibility="gone"/>\n'
    content += f'                <TextView android:id="@+id/task_{col}_more" android:layout_width="match_parent" android:layout_height="wrap_content" android:textColor="#3B82F6" android:textSize="10sp" android:visibility="gone"/>\n'
    content += '            </LinearLayout>\n'

content += '''        </LinearLayout>
    </LinearLayout>
    
    <!-- 선택된 날짜 할일 목록 - ListView -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="3"
        android:orientation="vertical"
        android:paddingTop="4dp">
        
        <TextView
            android:id="@+id/selected_date_label"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="오늘의 할일"
            android:textColor="#9CA3AF"
            android:textSize="12sp"
            android:paddingBottom="4dp"/>
        
        <ListView
            android:id="@+id/weekly_task_list"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:divider="@android:color/transparent"
            android:dividerHeight="2dp"
            android:scrollbars="none"/>
    </LinearLayout>

</LinearLayout>
'''

with open(r'c:\Users\dan\Documents\todolist\app\android\app\src\main\res\layout\widget_weekly_layout.xml', 'w', encoding='utf-8') as f:
    f.write(content)
print('Weekly: 12 tasks per column - DONE')
