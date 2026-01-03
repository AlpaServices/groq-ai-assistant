import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv')) {
      extractedText = fileBuffer.toString('utf-8');
    } 
    else if (fileName.endsWith('.json')) {
      const jsonContent = JSON.parse(fileBuffer.toString('utf-8'));
      extractedText = JSON.stringify(jsonContent, null, 2);
    }
    else if (fileName.endsWith('.docx')) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value;
    }
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      extractedText = '';
      workbook.SheetNames.forEach((sheetName: string) => {
        extractedText += `\n=== Sheet: ${sheetName} ===\n`;
        const sheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        extractedText += csvData;
      });
    }
    else if (fileName.endsWith('.pdf')) {
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
      } catch (pdfError) {
        extractedText = '[PDF parsing failed - file may be image-based or corrupted]';
      }
    }
    else {
      try {
        extractedText = fileBuffer.toString('utf-8');
      } catch {
        return NextResponse.json(
          { success: false, error: 'Unsupported file type' },
          { status: 400 }
        );
      }
    }

    const maxLength = 50000;
    if (extractedText.length > maxLength) {
      extractedText = extractedText.substring(0, maxLength) + '\n\n[... Content truncated due to length ...]';
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      content: extractedText,
      contentLength: extractedText.length,
    });

  } catch (error: any) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse file' },
      { status: 500 }
    );
  }
}
