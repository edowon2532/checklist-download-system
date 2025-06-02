const express = require('express');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const sharp = require('sharp');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 랜덤 샘플 데이터 생성 함수
function generateRandomItems(type) {
    const questions = type === 'fire' ? [
        "소화기가 정상적으로 배치되어 있는가?",
        "비상구 표시등이 정상 작동하는가?",
        "화재 경보기 테스트 결과는?",
        "피난 유도등이 정상적으로 점등되는가?",
        "소방 호스릴의 압력은 적정한가?",
        "비상방송 설비가 정상 동작하는가?",
        "방화문이 자동으로 닫히는가?",
        "피난 계단에 장애물이 없는가?",
        "소화전함 내부에 이상이 없는가?",
        "화재 수신기가 정상적으로 작동하는가?"
    ] : [
        "분전반 상태는 정상인가?",
        "접지 저항값 측정 결과"
    ];
    const answers = ["예", "아니오", "정상", "불량", "정상 작동", "이상 없음"];
    const notes = ["모든 항목 이상 없음", "일부 점검 필요", "청결 유지", "고장 발견", "정상", "점검 완료", "수리 필요"];
    const images = [null, "uploads/emergency_light.svg", "uploads/fire_alarm.svg", "uploads/electrical_panel.svg"];
    let items = [];
    for (let i = 0; i < questions.length; i++) {
        items.push({
            id: i + 1,
            question: questions[i],
            type: i % 2 === 0 ? "multiple_choice" : "text",
            answer: answers[Math.floor(Math.random() * answers.length)],
            note: Math.random() > 0.5 ? notes[Math.floor(Math.random() * notes.length)] : "",
            image: Math.random() > 0.7 ? images[Math.floor(Math.random() * images.length)] : null
        });
    }
    return items;
}

let checklistDatabase = {
    1: {
        id: 1,
        title: "화재 안전 점검표",
        team: "시설팀",
        cycle: "매일 1회",
        locationSummary: "5개소",
        locations: [
            { name: "본사 1층", inspector: "김안전", date: "2025-05-30", items: generateRandomItems('fire') },
            { name: "본사 2층", inspector: "이안전", date: "2025-05-30", items: generateRandomItems('fire') },
            { name: "별관", inspector: "박안전", date: "2025-05-29", items: generateRandomItems('fire') },
            { name: "창고", inspector: "최안전", date: "2025-05-29", items: generateRandomItems('fire') },
            { name: "옥상", inspector: "정안전", date: "2025-05-28", items: generateRandomItems('fire') }
        ]
    },
    2: {
        id: 2,
        title: "전기 안전 점검표",
        team: "전기팀",
        cycle: "주 1회",
        locationSummary: "5개소",
        locations: [
            { name: "본사 1층", inspector: "박전기", date: "2025-05-30", items: generateRandomItems('electric') },
            { name: "본사 2층", inspector: "이전기", date: "2025-05-30", items: generateRandomItems('electric') },
            { name: "별관", inspector: "최전기", date: "2025-05-29", items: generateRandomItems('electric') },
            { name: "창고", inspector: "정전기", date: "2025-05-29", items: generateRandomItems('electric') },
            { name: "옥상", inspector: "김전기", date: "2025-05-28", items: generateRandomItems('electric') }
        ]
    }
};

// 메인 페이지 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API 라우트들
app.get('/api/checklists', (req, res) => {
    const checklists = Object.values(checklistDatabase).map(checklist => ({
        id: checklist.id,
        title: checklist.title,
        team: checklist.team,
        cycle: checklist.cycle,
        locationSummary: checklist.locationSummary,
        locations: checklist.locations.map(loc => loc.name)
    }));
    res.json(checklists);
});

app.get('/api/checklist/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const checklist = checklistDatabase[id];
    
    if (!checklist) {
        return res.status(404).json({ error: '점검표를 찾을 수 없습니다.' });
    }
    
    res.json(checklist);
});

// PDF 생성 함수
async function generateChecklistPDF(checklistData) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const fontPath = path.join(__dirname, 'fonts', 'NotoSansKR-Regular.ttf');
        doc.registerFont('NotoSansKR', fontPath);
        doc.font('NotoSansKR');
        const filename = `checklist_${checklistData.id}_${Date.now()}.pdf`;
        const filepath = path.join('temp', filename);
        if (!fs.existsSync('temp')) {
            fs.mkdirSync('temp');
        }
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // 제목 영역 (좌측 정렬)
        let y = doc.y;
        doc.fontSize(18).font('NotoSansKR').text(checklistData.title, 50, y, { align: 'left' });
        y += 28;
        doc.fontSize(12).font('NotoSansKR').text(`점검팀명: ${checklistData.team || ''}`, 50, y, { align: 'left' });
        y += 18;
        doc.fontSize(12).font('NotoSansKR').text(`점검주기: ${checklistData.cycle || ''}`, 50, y, { align: 'left' });
        y += 18;
        doc.fontSize(12).font('NotoSansKR').text(`점검장소: ${checklistData.locationSummary || ''}`, 50, y, { align: 'left' });
        y += 24;
        // 굵은 가로 구분선
        doc.save();
        doc.moveTo(50, y).lineTo(545, y).lineWidth(2).strokeColor('#222').stroke();
        doc.restore();
        y += 16;
        doc.y = y;

        (async () => {
            // 이미지 북마크용 배열
            const imageLinks = [];
            // 장소별로 반복
            for (let locationIdx = 0; locationIdx < checklistData.locations.length; locationIdx++) {
                const location = checklistData.locations[locationIdx];
                if (locationIdx > 0) {
                    doc.addPage();
                }
                let curY = doc.y;
                // 장소별 헤더 배경(밝은 회색)
                const headerH = 44;
                doc.save();
                doc.rect(50, curY, 495, headerH).fill('#f5f6fa');
                doc.restore();
                // 장소명(크게, 볼드)
                doc.fontSize(15).font('NotoSansKR').fillColor('#222').text(location.name, 60, curY + 6, { width: 475, align: 'left' });
                // 점검일, 점검자
                doc.fontSize(11).font('NotoSansKR').fillColor('#222').text(`점검일: ${location.date || ''}`, 60, curY + 26, { width: 220, align: 'left' });
                doc.fontSize(11).font('NotoSansKR').fillColor('#222').text(`점검자: ${location.inspector || ''}`, 320, curY + 26, { width: 215, align: 'left' });
                curY += headerH + 4;
                // 표 헤더 위에 연한 가로 2줄 구분선
                for (let i = 0; i < 2; i++) {
                    doc.save();
                    doc.moveTo(50, curY + i * 3).lineTo(545, curY + i * 3).lineWidth(1).strokeColor('#e0e0e0').stroke();
                    doc.restore();
                }
                curY += 10;
                // 표 컬럼 헤더(가운데 정렬, 굵게)
                const marginX = 50;
                const tableWidth = 495;
                const colNumW = 30;
                const colQW = 320;
                const colAW = 145;
                const rowH = 28;
                doc.fontSize(11).font('NotoSansKR').fillColor('#222');
                doc.font('NotoSansKR');
                doc.fontSize(11).text('번호', marginX, curY, { width: colNumW, align: 'center' });
                doc.fontSize(11).text('점검 항목', marginX + colNumW, curY, { width: colQW, align: 'center' });
                doc.fontSize(11).text('답변', marginX + colNumW + colQW, curY, { width: colAW, align: 'center' });
                // 컬럼 헤더 아래 구분선
                let yLine = curY + rowH - 10;
                doc.save();
                doc.moveTo(marginX, yLine).lineTo(marginX + tableWidth, yLine).lineWidth(1).strokeColor('#e0e0e0').stroke();
                doc.restore();
                curY += rowH;
                // 표 본문
                for (let [index, item] of location.items.entries()) {
                    let cellH = rowH;
                    let answerText = item.answer;
                    if (item.note) answerText += `\n비고: ${item.note}`;
                    let answerLines = doc.heightOfString(answerText, { width: colAW, fontSize: 10 });
                    if (answerLines > cellH) cellH = answerLines + 10;
                    let imgH = (item.image && fs.existsSync(item.image)) ? 60 : 0;
                    if (imgH > 0) cellH += imgH + 6;
                    // 페이지 넘김 필요 시 addPage 및 헤더 반복
                    if (curY + cellH > doc.page.height - doc.page.margins.bottom) {
                        doc.addPage();
                        curY = doc.y;
                        // 장소별 헤더 재삽입
                        doc.save();
                        doc.rect(50, curY, 495, headerH).fill('#f5f6fa');
                        doc.restore();
                        doc.fontSize(15).font('NotoSansKR').fillColor('#222').text(location.name, 60, curY + 6, { width: 475, align: 'left' });
                        doc.fontSize(11).font('NotoSansKR').fillColor('#222').text(`점검일: ${location.date || ''}`, 60, curY + 26, { width: 220, align: 'left' });
                        doc.fontSize(11).font('NotoSansKR').fillColor('#222').text(`점검자: ${location.inspector || ''}`, 320, curY + 26, { width: 215, align: 'left' });
                        curY += headerH + 4;
                        for (let i = 0; i < 2; i++) {
                            doc.save();
                            doc.moveTo(50, curY + i * 3).lineTo(545, curY + i * 3).lineWidth(1).strokeColor('#e0e0e0').stroke();
                            doc.restore();
                        }
                        curY += 10;
                        doc.fontSize(11).font('NotoSansKR').fillColor('#222');
                        doc.font('NotoSansKR');
                        doc.fontSize(11).text('번호', marginX, curY, { width: colNumW, align: 'center' });
                        doc.fontSize(11).text('점검 항목', marginX + colNumW, curY, { width: colQW, align: 'center' });
                        doc.fontSize(11).text('답변', marginX + colNumW + colQW, curY, { width: colAW, align: 'center' });
                        yLine = curY + rowH - 10;
                        doc.save();
                        doc.moveTo(marginX, yLine).lineTo(marginX + tableWidth, yLine).lineWidth(1).strokeColor('#e0e0e0').stroke();
                        doc.restore();
                        curY += rowH;
                    }
                    doc.fontSize(11).font('NotoSansKR').fillColor('#222').text((index + 1).toString(), marginX, curY, { width: colNumW, align: 'center' });
                    doc.fontSize(11).font('NotoSansKR').fillColor('#222').text(item.question, marginX + colNumW, curY, { width: colQW, align: 'left' });
                    let answerY = curY;
                    doc.fontSize(10).font('NotoSansKR').fillColor('#222').text(answerText, marginX + colNumW + colQW, answerY, { width: colAW, align: 'right' });
                    answerY += answerLines;
                    // 이미지 썸네일 + 내부 링크
                    if (item.image && fs.existsSync(item.image)) {
                        try {
                            let imgBuffer = null;
                            if (path.extname(item.image).toLowerCase() === '.svg') {
                                imgBuffer = await sharp(item.image).png().toBuffer();
                            } else {
                                imgBuffer = fs.readFileSync(item.image);
                            }
                            // 썸네일 위치
                            const thumbX = marginX + colNumW + colQW;
                            const thumbY = answerY + 6;
                            doc.image(imgBuffer, thumbX, thumbY, { fit: [colAW, 60], align: 'right' });
                            // 내부 링크용 id 생성
                            const imgId = `img_${locationIdx}_${index}`;
                            doc.link(thumbX, thumbY, colAW, 60, { destination: imgId });
                            // 원본 이미지 정보 저장
                            imageLinks.push({ id: imgId, buffer: imgBuffer });
                        } catch (error) {
                            doc.fontSize(10).text('이미지 로드 실패', marginX + colNumW + colQW, answerY + 6, { width: colAW, align: 'right' });
                        }
                    }
                    doc.save();
                    doc.moveTo(marginX, curY + cellH - 2).lineTo(marginX + tableWidth, curY + cellH - 2).lineWidth(1).strokeColor('#e0e0e0').stroke();
                    doc.restore();
                    curY += cellH;
                }
                doc.y = curY + 10;
            }
            // PDF 마지막에 원본 이미지 페이지 추가
            for (const img of imageLinks) {
                doc.addPage();
                doc.addNamedDestination(img.id);
                doc.fontSize(13).font('NotoSansKR').text('첨부 이미지(원본)', 50, 60);
                doc.image(img.buffer, 100, 120, { fit: [400, 500], align: 'center' });
            }
            doc.end();
        })();
        stream.on('finish', () => {
            resolve(filepath);
        });
        stream.on('error', reject);
    });
}

// Excel 생성 함수
async function generateChecklistExcel(checklistData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('점검표 결과');
    
    // 제목 행
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = checklistData.title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // 기본 정보
    worksheet.getCell('A3').value = '점검자:';
    worksheet.getCell('B3').value = checklistData.inspector;
    worksheet.getCell('A4').value = '점검일:';
    worksheet.getCell('B4').value = checklistData.date;
    worksheet.getCell('A5').value = '점검장소:';
    worksheet.getCell('B5').value = checklistData.locations[0].name;
    
    // 헤더 설정
    const headerRow = 7;
    worksheet.getCell(`A${headerRow}`).value = '장소';
    worksheet.getCell(`B${headerRow}`).value = '번호';
    worksheet.getCell(`C${headerRow}`).value = '점검 항목';
    worksheet.getCell(`D${headerRow}`).value = '결과';
    worksheet.getCell(`E${headerRow}`).value = '비고';
    worksheet.getCell(`F${headerRow}`).value = '사진';
    
    // 헤더 스타일
    const headerCells = [`A${headerRow}`, `B${headerRow}`, `C${headerRow}`, `D${headerRow}`, `E${headerRow}`, `F${headerRow}`];
    headerCells.forEach(cellAddress => {
        const cell = worksheet.getCell(cellAddress);
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    
    // 컬럼 너비 설정
    worksheet.getColumn('A').width = 15; // 장소명
    worksheet.getColumn('B').width = 8;
    worksheet.getColumn('C').width = 40;
    worksheet.getColumn('D').width = 15;
    worksheet.getColumn('E').width = 30;
    worksheet.getColumn('F').width = 20;
    
    // 데이터 추가
    let currentRow = headerRow + 1;
    
    for (let location of checklistData.locations) {
        for (let i = 0; i < location.items.length; i++) {
            const item = location.items[i];
            worksheet.getCell(`A${currentRow}`).value = location.name;
            worksheet.getCell(`B${currentRow}`).value = i + 1;
            worksheet.getCell(`C${currentRow}`).value = item.question;
            worksheet.getCell(`D${currentRow}`).value = item.answer;
            worksheet.getCell(`E${currentRow}`).value = item.note || '';
            // 테두리 추가
            [`A${currentRow}`, `B${currentRow}`, `C${currentRow}`, `D${currentRow}`, `E${currentRow}`, `F${currentRow}`].forEach(cellAddress => {
                const cell = worksheet.getCell(cellAddress);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            // 이미지 추가
            if (item.image && fs.existsSync(item.image)) {
                try {
                    const imageId = workbook.addImage({
                        filename: item.image,
                        extension: 'svg'
                    });
                    worksheet.addImage(imageId, {
                        tl: { col: 5, row: currentRow - 1 },
                        ext: { width: 100, height: 100 }
                    });
                    worksheet.getRow(currentRow).height = 75;
                } catch (error) {
                    worksheet.getCell(`F${currentRow}`).value = '이미지 로드 실패';
                }
            }
            currentRow++;
        }
    }
    
    const filename = `checklist_${checklistData.id}_${Date.now()}.xlsx`;
    const filepath = path.join('temp', filename);
    
    if (!fs.existsSync('temp')) {
        fs.mkdirSync('temp');
    }
    
    await workbook.xlsx.writeFile(filepath);
    return filepath;
}

// PDF 다운로드 API
app.get('/api/checklist/:id/download/pdf', async (req, res) => {
    const id = parseInt(req.params.id);
    const checklist = checklistDatabase[id];
    const locationIdx = req.query.location !== undefined ? parseInt(req.query.location) : null;
    if (!checklist) {
        return res.status(404).json({ error: '점검표를 찾을 수 없습니다.' });
    }
    try {
        let checklistData = checklist;
        if (locationIdx !== null && checklist.locations[locationIdx]) {
            checklistData = {
                ...checklist,
                locations: [checklist.locations[locationIdx]]
            };
        }
        const filepath = await generateChecklistPDF(checklistData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(checklist.title)}_${checklist.date}.pdf"`);
        const fileStream = fs.createReadStream(filepath);
        fileStream.pipe(res);
        fileStream.on('end', () => {
            fs.unlinkSync(filepath);
        });
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        res.status(500).json({ error: 'PDF 생성에 실패했습니다.' });
    }
});

// Excel 다운로드 API
app.get('/api/checklist/:id/download/excel', async (req, res) => {
    const id = parseInt(req.params.id);
    const checklist = checklistDatabase[id];
    const locationIdx = req.query.location !== undefined ? parseInt(req.query.location) : null;
    if (!checklist) {
        return res.status(404).json({ error: '점검표를 찾을 수 없습니다.' });
    }
    try {
        let checklistData = checklist;
        if (locationIdx !== null && checklist.locations[locationIdx]) {
            checklistData = {
                ...checklist,
                locations: [checklist.locations[locationIdx]]
            };
        }
        const filepath = await generateChecklistExcel(checklistData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(checklist.title)}_${checklist.date}.xlsx"`);
        const fileStream = fs.createReadStream(filepath);
        fileStream.pipe(res);
        fileStream.on('end', () => {
            fs.unlinkSync(filepath);
        });
    } catch (error) {
        console.error('Excel 생성 실패:', error);
        res.status(500).json({ error: 'Excel 생성에 실패했습니다.' });
    }
});

// 이미지 업로드 API
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }
    
    res.json({
        filename: req.file.filename,
        path: req.file.path,
        url: `/uploads/${req.file.filename}`
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 서버가 성공적으로 시작되었습니다!`);
    console.log(`📱 웹사이트: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
    console.log(`\n✨ 브라우저에서 http://localhost:${PORT} 으로 접속하세요!`);
});

module.exports = app; 