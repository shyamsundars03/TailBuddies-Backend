try {
    const pdfmakeServer = require('pdfmake/server');
    console.log('--- pdfmake/server test ---');
    console.log('Type of require(pdfmake/server):', typeof pdfmakeServer);
    console.log('Keys of require(pdfmake/server):', Object.keys(pdfmakeServer || {}));
    const PrinterServer = pdfmakeServer.Printer || pdfmakeServer.default || pdfmakeServer.PdfPrinter || pdfmakeServer;
    console.log('Final resolved Printer type:', typeof PrinterServer);
} catch (e) {
    console.log('pdfmake/server not found');
}


