import React, { useState } from 'react';
import { Loader2, AlertCircle, FileText, Files } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;

if (pdfjs && pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface FileSource {
  base64?: string;
  html?: string;
}

interface FileUploadProps {
  onFilesSelect: (files: FileSource[]) => void;
  isLoading: boolean;
  loadingProgress?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, isLoading, loadingProgress }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [internalLoadingMsg, setInternalLoadingMsg] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const convertDocxToHtml = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      return result.value; // The generated HTML
    } catch (err) {
      console.error("DOCX Conversion Error", err);
      throw new Error("נכשל בחילוץ מידע מקובץ ה-Word.");
    }
  };

  const convertPdfToImages = async (file: File): Promise<string[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      const images: string[] = [];
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        setInternalLoadingMsg(`ממיר עמוד PDF ${i} מתוך ${totalPages} (איכות גבוהה)...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 3.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        images.push(base64);
      }
      return images;
    } catch (err) {
      throw new Error("שגיאה בהמרת קובץ ה-PDF.");
    }
  };

  const processFiles = async (fileList: File[]) => {
    setError(null);
    setInternalLoadingMsg('מכין קבצים...');
    const validSources: FileSource[] = [];

    try {
      for (const file of fileList) {
        if (file.name.endsWith('.docx')) {
          const html = await convertDocxToHtml(file);
          validSources.push({ html });
        } else if (file.type === 'application/pdf') {
          const pdfImages = await convertPdfToImages(file);
          validSources.push(...pdfImages.map(base64 => ({ base64 })));
        } else if (file.type.startsWith('image/')) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });
          validSources.push({ base64 });
        }
      }

      if (validSources.length === 0) {
        setError('לא זוהו קבצים תקינים. תומך ב-Word (docx), PDF ותמונות.');
        return;
      }

      onFilesSelect(validSources);
    } catch (err) {
      setError('שגיאה בעיבוד הקבצים.');
    } finally {
      setInternalLoadingMsg('');
    }
  };

  const activeLoadingText = loadingProgress || internalLoadingMsg;
  const isProcessing = isLoading || !!internalLoadingMsg;

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">פרויקט חדש: חתך הנדסי</h2>
        <p className="text-slate-500 mt-2 text-lg font-light">
          ייבא לוגים (Word, PDF או תמונות) ליצירת חתך קרקע מאוחד.
        </p>
      </div>

      <div 
        className={`relative group bg-white rounded-3xl shadow-xl border-2 transition-all p-12 text-center
          ${isDragging ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100'}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:text-emerald-600 transition-all">
          {isProcessing ? <Loader2 className="animate-spin" size={40} /> : <Files size={40} />}
        </div>
        
        {isProcessing ? (
          <p className="text-slate-500 text-sm font-medium animate-pulse">{activeLoadingText || 'מעבד...'}</p>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-slate-800">גרור לכאן קבצי קידוחים</h3>
            <p className="text-slate-400 text-sm">תומך ב-DOCX, PDF, JPG, PNG</p>
            <input type="file" id="file-upload" className="hidden" accept=".docx,image/*,application/pdf" multiple onChange={handleFileChange} />
            <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer shadow-lg">
              <FileText size={18} /> בחר קבצים
            </label>
          </div>
        )}
      </div>
    </div>
  );
};