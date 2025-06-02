const fs = require('fs');
const path = require('path');

console.log('🔧 점검표 시스템 초기 설정을 시작합니다...\n');

// 필요한 디렉토리 생성
function createDirectories() {
    const directories = ['uploads', 'temp', 'public'];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ ${dir}/ 디렉토리 생성`);
        } else {
            console.log(`📁 ${dir}/ 디렉토리 존재함`);
        }
    });
}

// SVG 플레이스홀더 이미지 생성
function createDemoImages() {
    const images = [
        {
            filename: 'emergency_light.svg',
            content: createSVG('비상구 표시등', '#ff6b6b', '고장 상태', false)
        },
        {
            filename: 'fire_alarm.svg', 
            content: createSVG('화재 경보기', '#4ecdc4', '테스트 완료', true)
        },
        {
            filename: 'electrical_panel.svg',
            content: createSVG('분전반', '#45b7d1', '정상 상태', true)
        }
    ];

    images.forEach(image => {
        const filepath = path.join('uploads', image.filename);
        
        if (!fs.existsSync(filepath)) {
            fs.writeFileSync(filepath, image.content);
            console.log(`🖼️  ${image.filename} 생성`);
        } else {
            console.log(`🖼️  ${image.filename} 존재함`);
        }
    });
}

function createSVG(title, color, status, isOk) {
    return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
        </linearGradient>
    </defs>
    
    <rect width="100%" height="100%" fill="url(#bgGrad)"/>
    <rect x="20" y="20" width="360" height="260" fill="white" stroke="${color}" stroke-width="3" rx="15"/>
    
    <!-- 장비 아이콘 -->
    <g transform="translate(180, 70)">
        <rect x="0" y="10" width="40" height="35" fill="${color}" rx="8"/>
        <circle cx="20" cy="27" r="10" fill="white"/>
        <circle cx="20" cy="27" r="6" fill="${color}"/>
        <rect x="15" y="3" width="10" height="10" fill="${color}" rx="3"/>
    </g>
    
    <!-- 제목 -->
    <text x="200" y="150" font-family="Arial, sans-serif" font-size="20" font-weight="bold" 
          text-anchor="middle" fill="${color}">${title}</text>
    <text x="200" y="175" font-family="Arial, sans-serif" font-size="14" 
          text-anchor="middle" fill="#666">${status}</text>
    <text x="200" y="195" font-family="Arial, sans-serif" font-size="12" 
          text-anchor="middle" fill="#999">점검 결과 이미지</text>
    
    <!-- 상태 표시 -->
    <g transform="translate(320, 40)">
        ${isOk ? 
            `<circle cx="15" cy="15" r="12" fill="#2ed573"/>
             <path d="M7 15 L13 21 L23 9" stroke="white" stroke-width="2" fill="none"/>` :
            `<circle cx="15" cy="15" r="12" fill="#ff4757"/>
             <path d="M8 8 L22 22 M22 8 L8 22" stroke="white" stroke-width="2"/>`
        }
    </g>
    
    <!-- 장식 요소 -->
    <circle cx="50" cy="50" r="3" fill="${color}" opacity="0.5"/>
    <circle cx="350" cy="250" r="4" fill="${color}" opacity="0.3"/>
    <circle cx="70" cy="230" r="2" fill="${color}" opacity="0.7"/>
</svg>`;
}

function showCompletionMessage() {
    console.log('\n🎉 설정이 완료되었습니다!\n');
    console.log('📋 다음 단계:');
    console.log('1️⃣  npm install');
    console.log('2️⃣  npm start');
    console.log('3️⃣  브라우저에서 http://localhost:3000 접속\n');
    
    console.log('🌟 빠른 시작:');
    console.log('   npm run quick-start\n');
    
    console.log('🔧 사용 가능한 명령어:');
    console.log('   npm start        - 서버 실행');
    console.log('   npm run dev       - 개발 모드 (nodemon)');
    console.log('   npm run setup     - 설정 다시 실행');
    
    console.log('\n✨ 준비 완료! 즐거운 개발 되세요! ✨');
}

// 실행
try {
    createDirectories();
    createDemoImages();
    showCompletionMessage();
} catch (error) {
    console.error('❌ 설정 중 오류 발생:', error.message);
    process.exit(1);
} 