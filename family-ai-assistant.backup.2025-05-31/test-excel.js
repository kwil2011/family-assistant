const ExcelJS = require('exceljs');
const workbook = new ExcelJS.Workbook();

// Create a worksheet
const worksheet = workbook.addWorksheet('Test Data');

// Add headers
worksheet.columns = [
    { header: 'Name', key: 'name', width: 15 },
    { header: 'Age', key: 'age', width: 10 },
    { header: 'City', key: 'city', width: 20 }
];

// Add rows
worksheet.addRows([
    { name: 'John', age: 30, city: 'New York' },
    { name: 'Jane', age: 25, city: 'London' },
    { name: 'Bob', age: 35, city: 'Paris' }
]);

// Save the file
workbook.xlsx.writeFile('test.xlsx')
    .then(() => {
        console.log('Excel file created successfully');
    })
    .catch(error => {
        console.error('Error creating Excel file:', error);
    }); 