import { NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(errData.parserError));
      });
      
      pdfParser.on('pdfParser_dataReady', () => {
        const extractedText = pdfParser.getRawTextContent();
        resolve(extractedText);
      });

      pdfParser.parseBuffer(buffer);
    });

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Could not extract any text from this PDF.' }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('PDF Parse Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse PDF' }, { status: 500 });
  }
}
