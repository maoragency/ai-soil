import React, { useState } from 'react';
import { SoilLayer, SPTRecord, HeaderData, ExtractedData } from '../types';
import { Check, Trash2, Plus, Info, MapPin, Calendar, Hash, Layers, ArrowLeft } from 'lucide-react';

interface ValidationTablesProps {
  initialData: ExtractedData[];
  onConfirm: (data: ExtractedData[]) => void;
}

export const ValidationTables: React.FC<ValidationTablesProps> = ({ initialData, onConfirm }) => {
  const [dataList, setDataList] = useState<ExtractedData[]>(initialData);
  const [activeTab, setActiveTab] = useState(0);

  const updateActiveBorehole = (updatedData: ExtractedData) => {
    const newDataList = [...dataList];
    newDataList[activeTab] = updatedData;
    setDataList(newDataList);
  };

  const handleHeaderChange = (field: keyof HeaderData, value: string) => {
    const currentData = dataList[activeTab];
    const newHeader = { ...currentData.header, [field]: value };
    let newDataList = [...dataList];
    if (field === 'projectName' || field === 'client') {
      newDataList = newDataList.map(item => ({ ...item, header: { ...item.header, [field]: value } }));
    } else {
      newDataList[activeTab] = { ...currentData, header: newHeader };
    }
    setDataList(newDataList);
  };

  const handleLayerChange = (id: string, field: keyof SoilLayer, value: any) => {
    const currentData = dataList[activeTab];
    const newLayers = currentData.layers.map(l => l.id === id ? { ...l, [field]: value } : l);
    updateActiveBorehole({ ...currentData, layers: newLayers });
  };

  const addLayer = () => {
    const currentData = dataList[activeTab];
    updateActiveBorehole({ ...currentData, layers: [...currentData.layers, { id: `new-${Date.now()}`, depthFrom: 0, depthTo: 0, description: 'תיאור', uscs: 'CL' }] });
  };

  const handleSPTChange = (id: string, field: keyof SPTRecord, value: any) => {
    const currentData = dataList[activeTab];
    const newSPT = currentData.spt.map(s => s.id === id ? { ...s, [field]: value } : s);
    updateActiveBorehole({ ...currentData, spt: newSPT });
  };

  const activeData = dataList[activeTab];
  if (!activeData) return null;

  return (
    <div className="max-w-7xl mx-auto pb-32 px-4 animate-fade-in">
      <div className="flex overflow-x-auto gap-2 mb-8 border-b border-slate-200">
        {dataList.map((item, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === idx ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            קידוח {item.header.boreholeName}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Info size={20}/> פרטי זיהוי</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase">שם הפרויקט</label>
              <input type="text" value={activeData.header.projectName} onChange={(e) => handleHeaderChange('projectName', e.target.value)} className="w-full bg-slate-50 border p-2 rounded mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">מס' קידוח</label>
              <input type="text" value={activeData.header.boreholeName} onChange={(e) => handleHeaderChange('boreholeName', e.target.value)} className="w-full bg-slate-50 border p-2 rounded mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">רום</label>
              <input type="text" value={activeData.header.elevation} onChange={(e) => handleHeaderChange('elevation', e.target.value)} className="w-full bg-slate-50 border p-2 rounded mt-1" />
            </div>
          </div>
        </div>

        {/* Layers Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2"><Layers size={20}/> שכבות קרקע</h3>
            <button onClick={addLayer} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded font-bold text-sm">+ הוסף שכבה</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-xs font-bold text-slate-400 border-b">
                  <th className="py-2 px-1">מ-</th>
                  <th className="py-2 px-1">עד-</th>
                  <th className="py-2 px-1">תיאור</th>
                  <th className="py-2 px-1">דקים%</th>
                  <th className="py-2 px-1">פלסטיות</th>
                  <th className="py-2 px-1">תפיחה</th>
                  <th className="py-2 px-1">צבע</th>
                  <th className="py-2 px-1">USCS</th>
                  <th className="py-2 px-1"></th>
                </tr>
              </thead>
              <tbody>
                {activeData.layers.map(l => (
                  <tr key={l.id} className="border-b hover:bg-slate-50">
                    <td className="p-1"><input type="number" value={l.depthFrom} onChange={(e) => handleLayerChange(l.id, 'depthFrom', Number(e.target.value))} className="w-14 bg-transparent border-none text-sm" /></td>
                    <td className="p-1"><input type="number" value={l.depthTo} onChange={(e) => handleLayerChange(l.id, 'depthTo', Number(e.target.value))} className="w-14 bg-transparent border-none text-sm" /></td>
                    <td className="p-1"><input type="text" value={l.description} onChange={(e) => handleLayerChange(l.id, 'description', e.target.value)} className="w-full bg-transparent border-none text-sm" /></td>
                    <td className="p-1"><input type="text" value={l.finePercent || ''} onChange={(e) => handleLayerChange(l.id, 'finePercent', e.target.value)} className="w-16 bg-transparent border-none text-xs" placeholder="-" /></td>
                    <td className="p-1"><input type="text" value={l.plasticity || ''} onChange={(e) => handleLayerChange(l.id, 'plasticity', e.target.value)} className="w-16 bg-transparent border-none text-xs" placeholder="-" /></td>
                    <td className="p-1"><input type="text" value={l.swelling || ''} onChange={(e) => handleLayerChange(l.id, 'swelling', e.target.value)} className="w-16 bg-transparent border-none text-xs" placeholder="-" /></td>
                    <td className="p-1"><input type="text" value={l.colorText || ''} onChange={(e) => handleLayerChange(l.id, 'colorText', e.target.value)} className="w-16 bg-transparent border-none text-xs" placeholder="-" /></td>
                    <td className="p-1 font-bold"><input type="text" value={l.uscs} onChange={(e) => handleLayerChange(l.id, 'uscs', e.target.value)} className="w-12 bg-transparent border-none text-sm text-center" /></td>
                    <td className="p-1"><button onClick={() => updateActiveBorehole({ ...activeData, layers: activeData.layers.filter(x => x.id !== l.id)})} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SPT Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Check size={20}/> בדיקות SPT</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeData.spt.map(s => (
                <div key={s.id} className="flex items-center gap-4 bg-slate-50 p-2 rounded border">
                   <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400">עומק (מ')</label>
                      <input type="number" value={s.depth} onChange={(e) => handleSPTChange(s.id, 'depth', Number(e.target.value))} className="w-full bg-transparent border-none text-sm font-bold" />
                   </div>
                   <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400">ערך N</label>
                      <input type="number" value={s.value} onChange={(e) => handleSPTChange(s.id, 'value', Number(e.target.value))} className="w-full bg-transparent border-none text-sm font-bold" />
                   </div>
                   <button onClick={() => updateActiveBorehole({ ...activeData, spt: activeData.spt.filter(x => x.id !== s.id)})} className="text-slate-300 hover:text-red-500 pt-3"><Trash2 size={16}/></button>
                </div>
              ))}
              <button onClick={() => updateActiveBorehole({...activeData, spt: [...activeData.spt, {id:`new-${Date.now()}`, depth:0, value:0}]})} className="border-2 border-dashed border-slate-200 text-slate-400 py-4 rounded-xl hover:bg-slate-50 transition-all">+ הוסף בדיקה</button>
           </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <button onClick={() => onConfirm(dataList)} className="bg-slate-900 text-white px-10 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold hover:bg-black transition-all">
          אשר והפק חתך מאוחד <ArrowLeft size={18}/>
        </button>
      </div>
    </div>
  );
};