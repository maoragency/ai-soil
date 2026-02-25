import React, { useState } from 'react';
import { ProjectMetadata } from '../types';
import { ArrowLeft, PenTool } from 'lucide-react';

interface ProjectFormProps {
  initialWaterDepth: number;
  onSubmit: (meta: ProjectMetadata) => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ initialWaterDepth, onSubmit }) => {
  const [projectName, setProjectName] = useState('');
  const [boreholeName, setBoreholeName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !boreholeName) {
      alert("שדות חובה חסרים.");
      return;
    }
    onSubmit({
      projectName,
      boreholeName,
      waterTableDepth: initialWaterDepth
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-16 animate-fade-in-up">
      <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-10 relative overflow-hidden">
        
        {/* Decorative Background Blob - Position changed for RTL */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="relative">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-slate-900/20">
            <PenTool size={20} />
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-2">פרטים סופיים</h2>
          <p className="text-slate-500 mb-10">הוסף את פרטי הפרויקט לסיום הרשומה ההנדסית.</p>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">שם הפרויקט</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-lg rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent outline-none transition-all placeholder-slate-300"
                  placeholder="לדוגמה: הרחבת נתיבי איילון"
                  autoFocus
                />
              </div>

              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">מזהה קידוח (שם/מספר)</label>
                <input
                  type="text"
                  value={boreholeName}
                  onChange={(e) => setBoreholeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-lg rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent outline-none transition-all placeholder-slate-300"
                  placeholder="לדוגמה: K-24/A"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-black text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:shadow-xl flex justify-center items-center gap-3 transition-all transform hover:-translate-y-0.5"
            >
              <span>צור פרופיל</span>
              <ArrowLeft size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
