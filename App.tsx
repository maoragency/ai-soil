import React, { useState, useRef } from 'react';
import { AppStage, ExtractedData } from './types';
import { FileUpload } from './components/FileUpload';
import { ValidationTables } from './components/ValidationTables';
import { SoilProfileChart } from './components/SoilProfileChart';
import { parseBoreholeLog } from './services/geminiService';
import { Layers, Check, RotateCcw, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import * as jspdfLib from 'jspdf';

const jsPDF = (jspdfLib as any).default?.jsPDF || (jspdfLib as any).jsPDF || (jspdfLib as any).default || jspdfLib;

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>('upload');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [extractedDataList, setExtractedDataList] = useState<ExtractedData[] | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  /**
   * Intelligently merges multiple ExtractedData pieces by Borehole Name.
   * If image A has descriptions for BH1 and image B has SPT for BH1, they become ONE BH1 record.
   */
  const mergeBoreholes = (rawList: ExtractedData[]): ExtractedData[] => {
    const mergedMap: Record<string, ExtractedData> = {};

    rawList.forEach(item => {
      // Normalize borehole name for matching (trim and simple cleanup)
      const name = (item.header.boreholeName || "").trim();
      if (!name) return;

      if (!mergedMap[name]) {
        mergedMap[name] = { ...item };
      } else {
        const existing = mergedMap[name];
        
        // Merge Layers (if existing has none or if this one has more)
        if (item.layers.length > 0) {
          existing.layers = [...existing.layers, ...item.layers].sort((a,b) => a.depthFrom - b.depthFrom);
          // De-duplicate layers by depth if needed, but for now simple append
          const seenDepths = new Set();
          existing.layers = existing.layers.filter(l => {
             const key = `${l.depthFrom}-${l.depthTo}`;
             if (seenDepths.has(key)) return false;
             seenDepths.add(key);
             return true;
          });
        }

        // Merge SPT
        if (item.spt.length > 0) {
          existing.spt = [...existing.spt, ...item.spt].sort((a,b) => a.depth - b.depth);
          const seenSptDepths = new Set();
          existing.spt = existing.spt.filter(s => {
             if (seenSptDepths.has(s.depth)) return false;
             seenSptDepths.add(s.depth);
             return true;
          });
        }

        // Merge Headers (take non-empty values)
        if (!existing.header.projectName) existing.header.projectName = item.header.projectName;
        if (!existing.header.elevation || existing.header.elevation === "0.00") existing.header.elevation = item.header.elevation;
        if (!existing.header.coordinates) existing.header.coordinates = item.header.coordinates;
        if (existing.header.waterTable === "-" || !existing.header.waterTable) existing.header.waterTable = item.header.waterTable;
      }
    });

    return Object.values(mergedMap).sort((a, b) => {
        // Natural sort for borehole names (1, 2, 3...)
        return a.header.boreholeName.localeCompare(b.header.boreholeName, undefined, {numeric: true, sensitivity: 'base'});
    });
  };

  const handleFilesSelect = async (sources: { base64?: string, html?: string }[]) => {
    setLoading(true);
    setLoadingProgress('מאתחל עיבוד מרובה...');
    
    let allExtracted: ExtractedData[] = [];
    let errorCount = 0;

    try {
      for (let i = 0; i < sources.length; i++) {
        setLoadingProgress(`מנתח עמוד ${i + 1} מתוך ${sources.length}...`);
        
        // Increase delay between pages to 5s to help prevent rate limits before they happen
        if (i > 0) {
          setLoadingProgress(`ממתין בין עמודים (עמוד ${i + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); 
          setLoadingProgress(`מנתח עמוד ${i + 1} מתוך ${sources.length}...`);
        }

        try {
          const arrayResult = await parseBoreholeLog(sources[i]);
          allExtracted = [...allExtracted, ...arrayResult];
        } catch (err: any) {
          console.error(`Failed to process page ${i + 1}`, err);
          errorCount++;
          // If we hit a hard limit even after retries, we might want to alert, 
          // but we continue to next page if possible
        }
      }

      if (allExtracted.length === 0) {
        throw new Error("לא ניתן היה לחלץ נתונים מאף עמוד. וודא שאין חסימת מכסות (Quota).");
      }
      
      const mergedResults = mergeBoreholes(allExtracted);
      setExtractedDataList(mergedResults);
      setStage('validation');
      
      if (errorCount > 0) {
        alert(`העיבוד הסתיים, אך ${errorCount} עמודים נכשלו עקב חריגת מכסה או שגיאת פענוח.`);
      }
    } catch (error: any) {
      alert(error.message || "שגיאה בניתוח הלוגים. וודא שהתמונות ברורות ושמכסת ה-API שלך תקינה.");
    } finally {
      setLoading(false);
      setLoadingProgress('');
    }
  };

  const handleValidationConfirm = (finalData: ExtractedData[]) => {
    setExtractedDataList(finalData);
    setStage('result');
  };

  const handleReset = () => {
    if (window.confirm("להתחיל מחדש?")) {
      setStage('upload');
      setExtractedDataList(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!chartRef.current || !extractedDataList) return;
    setIsGeneratingPDF(true);
    
    // נותנים לדפדפן זמן קצר לוודא שהכל מרונדר סופית
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const container = chartRef.current;
      // אנחנו רוצים ללכוד את הדיב הפנימי שנוצר על ידי SoilProfileChart
      // זה הדיב שמכיל את כל ה-SVG בלי קשר לגלילה של הקונטיינר החיצוני
      const captureTarget = container.firstChild as HTMLElement;

      if (!captureTarget) {
        throw new Error("Target element not found");
      }

      const canvas = await html2canvas(captureTarget, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const imgWidthMm = (canvas.width / 2) * 0.264583;
      const imgHeightMm = (canvas.height / 2) * 0.264583;

      const pdf = new jsPDF({
        orientation: imgWidthMm > imgHeightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [imgWidthMm + 20, imgHeightMm + 20]
      });

      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidthMm, imgHeightMm);
      pdf.save(`cross-section-${extractedDataList?.[0]?.header?.projectName || 'project'}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("שגיאה ביצירת ה-PDF. נסה שוב או בדוק את חיבור האינטרנט.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" dir="rtl">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <Layers className="text-slate-900" size={24} />
          <h1 className="text-lg font-bold">GeoPlot AI</h1>
        </div>
        {stage !== 'upload' && <button onClick={handleReset} className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-2"><RotateCcw size={14} /> פרויקט חדש</button>}
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {stage === 'upload' && <FileUpload onFilesSelect={handleFilesSelect} isLoading={loading} loadingProgress={loadingProgress} />}
        {stage === 'validation' && extractedDataList && <ValidationTables initialData={extractedDataList} onConfirm={handleValidationConfirm} />}
        {stage === 'result' && extractedDataList && (
          <div className="flex flex-col items-center">
            <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="mb-6 bg-slate-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg">
              {isGeneratingPDF ? <Loader2 className="animate-spin" /> : <Download size={18} />} הורד PDF הנדסי
            </button>
            <div ref={chartRef} className="bg-white border rounded-lg shadow-2xl p-6 overflow-auto max-w-full">
              <SoilProfileChart data={extractedDataList} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}; export default App;