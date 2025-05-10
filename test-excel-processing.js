const fs = require('fs');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, 'test.xlsx');
const fileData = fs.readFileSync(filePath);

// Simulate the process-document handler
async function testExcelProcessing() {
    try {
        const ExcelJS = require('exceljs');
        console.log('Processing Excel file...');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileData);
        let content = '';
        
        for (const worksheet of workbook.worksheets) {
            content += `Sheet: ${worksheet.name}\n`;
            worksheet.eachRow((row, rowNumber) => {
                const rowData = row.values.slice(1); // Skip the first element (undefined)
                content += rowData.join('\t') + '\n';
            });
            content += '\n';
        }
        console.log('Excel content length:', content.length);
        console.log('\nProcessed content:');
        console.log(content);
    } catch (error) {
        console.error('Error processing Excel file:', error);
    }
}

testExcelProcessing(); 