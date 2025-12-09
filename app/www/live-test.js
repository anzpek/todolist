// 🧪 실시간 기능 테스트 스크립트
// 현재 브라우저에서 F12 → Console → 이 스크립트 실행

console.log('🧪 실시간 기능 테스트 시작!');

const liveTest = {
  // 현재 상태 확인
  checkCurrentState: () => {
    console.log('\n📊 현재 상태 확인');
    
    // 인증 상태
    const authKeys = Object.keys(localStorage).filter(key => key.includes('firebase:authUser'));
    const isLoggedIn = authKeys.length > 0;
    console.log(`🔐 로그인 상태: ${isLoggedIn ? '✅ 로그인됨' : '❌ 비로그인'}`);
    
    if (isLoggedIn) {
      try {
        const authData = JSON.parse(localStorage.getItem(authKeys[0]));
        console.log(`👤 사용자: ${authData?.email || 'Unknown'}`);
        console.log(`🆔 UID: ${authData?.uid || 'Unknown'}`);
      } catch (e) {
        console.log('❌ 인증 데이터 파싱 실패');
      }
    }
    
    // 할일 개수
    const todoCards = document.querySelectorAll('.card.p-4');
    console.log(`📝 현재 할일 개수: ${todoCards.length}개`);
    
    return { isLoggedIn, todoCount: todoCards.length };
  },

  // 할일 추가 테스트
  addTestTodo: async () => {
    console.log('\n📝 테스트용 할일 추가');
    
    const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('새 할일') || btn.textContent.includes('추가')
    );
    
    if (!addButton) {
      console.log('❌ 새 할일 버튼을 찾을 수 없습니다');
      return false;
    }
    
    console.log('✅ 새 할일 버튼 발견, 클릭...');
    addButton.click();
    
    // 모달이 열릴 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal || modal.style.display === 'none') {
      console.log('❌ 모달이 열리지 않았습니다');
      return false;
    }
    
    console.log('✅ 모달 열림');
    
    // 제목 입력
    const titleInput = modal.querySelector('input[name="title"], input[placeholder*="할일"]');
    if (titleInput) {
      titleInput.value = '삭제 테스트용 할일';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 제목 입력: "삭제 테스트용 할일"');
    } else {
      console.log('❌ 제목 입력창을 찾을 수 없습니다');
      return false;
    }
    
    // 추가 버튼 클릭
    const submitButton = Array.from(modal.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('추가') || btn.type === 'submit'
    );
    
    if (submitButton) {
      console.log('✅ 추가 버튼 발견, 클릭...');
      submitButton.click();
      
      // 결과 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newTodoCount = document.querySelectorAll('.card.p-4').length;
      console.log(`📊 추가 후 할일 개수: ${newTodoCount}개`);
      
      if (newTodoCount > 0) {
        console.log('🎉 할일 추가 성공!');
        return true;
      } else {
        console.log('❌ 할일 추가 실패');
        return false;
      }
    } else {
      console.log('❌ 추가 버튼을 찾을 수 없습니다');
      return false;
    }
  },

  // 삭제 기능 테스트
  testDelete: async () => {
    console.log('\n🗑️ 삭제 기능 테스트');
    
    const todoCards = document.querySelectorAll('.card.p-4');
    if (todoCards.length === 0) {
      console.log('❌ 삭제할 할일이 없습니다');
      return false;
    }
    
    const firstTodo = todoCards[0];
    const todoTitle = firstTodo.querySelector('h3')?.textContent || 'Unknown';
    console.log(`🎯 삭제 대상: "${todoTitle}"`);
    
    // 삭제 버튼 찾기 - 여러 방법으로 시도
    const deleteSelectors = [
      'button[title="할일 삭제"]',
      'button:has([data-lucide="trash-2"])',
      'button:has(.lucide-trash-2)',
      'button .text-red-600'
    ];
    
    let deleteButton = null;
    for (const selector of deleteSelectors) {
      deleteButton = firstTodo.querySelector(selector);
      if (deleteButton) {
        console.log(`✅ 삭제 버튼 발견 (선택자: ${selector})`);
        break;
      }
    }
    
    if (!deleteButton) {
      console.log('❌ 삭제 버튼을 찾을 수 없습니다');
      
      // 모든 버튼 확인
      const allButtons = firstTodo.querySelectorAll('button');
      console.log(`🔍 첫 번째 할일의 모든 버튼들 (${allButtons.length}개):`);
      allButtons.forEach((btn, i) => {
        const title = btn.getAttribute('title') || '';
        const className = btn.className;
        const innerHTML = btn.innerHTML;
        
        console.log(`  버튼 ${i+1}:`);
        console.log(`    - title: "${title}"`);
        console.log(`    - class: "${className}"`);
        console.log(`    - HTML: ${innerHTML.substring(0, 100)}...`);
      });
      
      return false;
    }
    
    // 확인 대화상자 자동 허용
    const originalConfirm = window.confirm;
    window.confirm = (message) => {
      console.log(`🔔 확인 대화상자: "${message}" → 자동 허용`);
      return true;
    };
    
    const beforeCount = todoCards.length;
    console.log(`📊 삭제 전 할일 개수: ${beforeCount}개`);
    
    // 삭제 버튼 클릭
    console.log('🖱️ 삭제 버튼 클릭...');
    deleteButton.click();
    
    // 결과 확인 (3초 대기)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const afterCount = document.querySelectorAll('.card.p-4').length;
    console.log(`📊 삭제 후 할일 개수: ${afterCount}개`);
    
    // confirm 복원
    window.confirm = originalConfirm;
    
    if (afterCount < beforeCount) {
      console.log('🎉 삭제 기능 정상 작동!');
      return true;
    } else {
      console.log('❌ 삭제 기능 실패 - 할일이 삭제되지 않았습니다');
      
      // 콘솔 오류 확인
      console.log('🔍 최근 콘솔 로그 확인...');
      // 브라우저 콘솔에서 오류를 확인할 수 있도록 안내
      console.log('💡 Network 탭과 Console 탭에서 오류를 확인해보세요');
      
      return false;
    }
  },

  // 마감일 설정 테스트
  testDueDate: async () => {
    console.log('\n📅 마감일 설정 테스트');
    
    const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('새 할일') || btn.textContent.includes('추가')
    );
    
    if (!addButton) {
      console.log('❌ 새 할일 버튼을 찾을 수 없습니다');
      return false;
    }
    
    addButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal || modal.style.display === 'none') {
      console.log('❌ 모달이 열리지 않았습니다');
      return false;
    }
    
    // 제목 입력
    const titleInput = modal.querySelector('input[name="title"]');
    if (titleInput) {
      titleInput.value = '마감일 테스트용 할일';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 제목 입력됨');
    }
    
    // 마감일 설정
    const dueDateInput = modal.querySelector('input[type="date"]');
    if (dueDateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      dueDateInput.value = dateString;
      dueDateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dueDateInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ 마감일 설정: ${dateString}`);
    } else {
      console.log('❌ 마감일 입력창을 찾을 수 없습니다');
    }
    
    // 마감 시간 설정
    const dueTimeInput = modal.querySelector('input[type="time"]');
    if (dueTimeInput) {
      dueTimeInput.value = '18:00';
      dueTimeInput.dispatchEvent(new Event('input', { bubbles: true }));
      dueTimeInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ 마감 시간 설정: 18:00');
    }
    
    // 추가 버튼 클릭
    const submitButton = Array.from(modal.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('추가') || btn.type === 'submit'
    );
    
    if (submitButton) {
      console.log('🎯 할일 추가 버튼 클릭...');
      submitButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const modalStillOpen = document.querySelector('.fixed.inset-0')?.style.display !== 'none';
      
      if (!modalStillOpen) {
        console.log('🎉 마감일 설정 성공! (모달이 닫힘)');
        return true;
      } else {
        console.log('❌ 마감일 설정 실패 (모달이 여전히 열려있음)');
        
        // 오류 메시지 확인
        const errorMessages = modal.querySelectorAll('.text-red-500, .error');
        if (errorMessages.length > 0) {
          console.log('🚨 발견된 오류 메시지들:');
          errorMessages.forEach((err, i) => {
            console.log(`  ${i+1}. ${err.textContent}`);
          });
        }
        
        return false;
      }
    }
  },

  // 전체 테스트 실행
  runAllTests: async () => {
    console.log('🚀 전체 테스트 실행 시작!\n');
    
    // 1. 현재 상태 확인
    const state = liveTest.checkCurrentState();
    
    if (!state.isLoggedIn) {
      console.log('❌ 로그인이 필요합니다. 먼저 구글 로그인을 해주세요.');
      return;
    }
    
    // 2. 할일이 없으면 추가
    if (state.todoCount === 0) {
      console.log('📝 할일이 없어서 테스트용 할일을 추가합니다...');
      await liveTest.addTestTodo();
    }
    
    // 3. 삭제 기능 테스트
    console.log('\n--- 삭제 기능 테스트 ---');
    const deleteSuccess = await liveTest.testDelete();
    
    // 4. 마감일 설정 테스트
    console.log('\n--- 마감일 설정 테스트 ---');
    const dueDateSuccess = await liveTest.testDueDate();
    
    // 결과 요약
    console.log('\n📋 테스트 결과 요약:');
    console.log(`🗑️ 삭제 기능: ${deleteSuccess ? '✅ 성공' : '❌ 실패'}`);
    console.log(`📅 마감일 설정: ${dueDateSuccess ? '✅ 성공' : '❌ 실패'}`);
    
    if (deleteSuccess && dueDateSuccess) {
      console.log('🎉 모든 테스트 통과!');
    } else {
      console.log('⚠️ 일부 기능에 문제가 있습니다.');
    }
  }
};

// 전역 객체로 설정
window.liveTest = liveTest;

console.log('\n🛠️ 사용 방법:');
console.log('📊 liveTest.checkCurrentState() - 현재 상태 확인');
console.log('📝 liveTest.addTestTodo() - 테스트용 할일 추가');
console.log('🗑️ liveTest.testDelete() - 삭제 기능 테스트');
console.log('📅 liveTest.testDueDate() - 마감일 설정 테스트');
console.log('🚀 liveTest.runAllTests() - 전체 테스트 실행');

console.log('\n✅ 실시간 테스트 시스템 준비 완료!');
console.log('💡 권장: liveTest.runAllTests() 를 실행해주세요!');