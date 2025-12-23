
import React, { useState, useRef } from 'react';
import { ArchitectAPIResponse, AnalysisStatus, Project } from './types';
import { architectResumeAndLetter } from './services/geminiService';
import ScoreGauge from './components/ScoreGauge';
import { 
  FileText, 
  Briefcase, 
  Terminal, 
  Zap, 
  Search, 
  Upload,
  Plus,
  Trash2,
  FolderCode,
  Copy,
  Check,
  Award,
  Mail,
  FileCheck,
  AlertCircle,
  Lightbulb,
  Download
} from 'lucide-react';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import { jsPDF } from 'jspdf';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

const App: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<ArchitectAPIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<'resume' | 'letter'>('resume');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File) => {
    setIsExtracting(true);
    setError(null);
    let fullText = "";
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      const pdf = await loadingTask.promise.catch((err: any) => {
        if (err.name === 'PasswordException') {
          throw new Error("This PDF is password protected. Please provide an unprotected file.");
        }
        if (err.name === 'InvalidPDFException') {
          throw new Error("The file provided is not a valid PDF or is corrupted.");
        }
        throw new Error("Failed to initialize PDF parsing engine.");
      });

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          if (pageText.trim()) {
            fullText += pageText + "\n";
          }
        } catch (pageErr) {
          console.warn(`Error parsing page ${i}:`, pageErr);
          // We continue to other pages even if one fails
        }
      }

      if (!fullText.trim()) {
        throw new Error("No readable text was found in the PDF. It might be a scanned image (OCR required).");
      }

      setResumeText(fullText);
    } catch (err: any) {
      console.error("PDF Extraction Error:", err);
      setError(err.message || "An unexpected error occurred while parsing the PDF.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') extractTextFromPDF(file);
    else if (file) setError("Please upload a valid PDF file.");
  };

  const addProject = () => {
    setProjects([...projects, {
      id: Math.random().toString(36).substr(2, 9),
      title: '', goal: '', technologies: '', outcome: ''
    }]);
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    setProjects(projects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProject = (id: string) => setProjects(projects.filter(p => p.id !== id));

  const handleGenerate = async () => {
    if (!resumeText && projects.length === 0) {
      setError("Please provide your background via resume text or projects.");
      return;
    }

    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setResult(null);
    
    try {
      let fullResume = resumeText;
      if (projects.length > 0) {
        fullResume += "\n\nPROJECTS\n" + projects.map(p => (
          `Title: ${p.title}\nGoal: ${p.goal}\nTech: ${p.technologies}\nOutcome: ${p.outcome}`
        )).join("\n---\n");
      }

      const architecture = await architectResumeAndLetter(fullResume, jdText);
      setResult(architecture);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err) {
      setError("Architecture generation failed. Check your API key or connection.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const downloadPDF = () => {
    if (!result) return;
    
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);

    const checkNewPage = (height: number) => {
      if (y + height > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };

    if (activeTab === 'resume') {
      const res = result.pdf_data.resume;
      
      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(res.full_name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const contactStr = `${res.contact_details.email} | ${res.contact_details.phone} | ${res.contact_details.linkedin} | ${res.contact_details.location}`;
      doc.text(contactStr, pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PROFESSIONAL SUMMARY', margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const summaryLines = doc.splitTextToSize(res.summary, maxWidth);
      checkNewPage(summaryLines.length * 5);
      doc.text(summaryLines, margin, y);
      y += (summaryLines.length * 5) + 10;

      // Skills
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('CORE EXPERTISE', margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const skillsStr = res.skills_list.join(' • ');
      const skillLines = doc.splitTextToSize(skillsStr, maxWidth);
      checkNewPage(skillLines.length * 5);
      doc.text(skillLines, margin, y);
      y += (skillLines.length * 5) + 10;

      // Experience
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('WORK EXPERIENCE', margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      res.work_experience.forEach(exp => {
        checkNewPage(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(exp.role, margin, y);
        const durationWidth = doc.getTextWidth(exp.duration);
        doc.text(exp.duration, pageWidth - margin - durationWidth, y);
        y += 5;
        
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.text(exp.company, margin, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        exp.bullet_points.forEach(bullet => {
          const bulletLines = doc.splitTextToSize(`• ${bullet}`, maxWidth - 5);
          checkNewPage(bulletLines.length * 5);
          doc.text(bulletLines, margin + 2, y);
          y += (bulletLines.length * 5) + 2;
        });
        y += 5;
      });

      // Education
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('ACADEMIC BACKGROUND', margin, y);
      y += 6;
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      res.education.forEach(edu => {
        checkNewPage(15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(edu.degree, margin, y);
        const yearWidth = doc.getTextWidth(edu.year);
        doc.text(edu.year, pageWidth - margin - yearWidth, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(edu.school, margin, y);
        y += 10;
      });

      doc.save(`${res.full_name}_Optimized_Resume.pdf`);
    } else {
      const letter = result.pdf_data.cover_letter;
      const res = result.pdf_data.resume;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(res.full_name, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(res.contact_details.location, margin, y);
      y += 5;
      doc.text(res.contact_details.email, margin, y);
      y += 15;

      doc.text(new Date().toLocaleDateString(), margin, y);
      y += 15;

      doc.setFont('helvetica', 'bold');
      doc.text(letter.hiring_manager_name, margin, y);
      y += 5;
      doc.text(letter.company_name, margin, y);
      y += 15;

      doc.setFont('helvetica', 'normal');
      doc.text(`Dear ${letter.hiring_manager_name},`, margin, y);
      y += 10;

      letter.body_paragraphs.forEach(para => {
        const lines = doc.splitTextToSize(para, maxWidth);
        checkNewPage(lines.length * 5);
        doc.text(lines, margin, y);
        y += (lines.length * 5) + 8;
      });

      y += 10;
      doc.text('Sincerely,', margin, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(res.full_name, margin, y);

      doc.save(`${res.full_name}_Cover_Letter.pdf`);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    let textToCopy = "";
    if (activeTab === 'resume') {
      const res = result.pdf_data.resume;
      textToCopy = `${res.full_name}\n${res.contact_details.email} | ${res.contact_details.phone}\n${res.contact_details.linkedin} | ${res.contact_details.location}\n\nSUMMARY\n${res.summary}\n\nSKILLS\n${res.skills_list.join(', ')}\n\nEXPERIENCE\n` +
        res.work_experience.map(e => `${e.role} - ${e.company}\n${e.duration}\n${e.bullet_points.map(b => `• ${b}`).join('\n')}`).join('\n\n');
    } else {
      textToCopy = `To: ${result.pdf_data.cover_letter.hiring_manager_name}\nAt: ${result.pdf_data.cover_letter.company_name}\n\n${result.pdf_data.cover_letter.body_paragraphs.join('\n\n')}`;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-12 selection:bg-amber-500/30">
      <header className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-2xl shadow-amber-900/40">
              <Terminal className="text-slate-950 w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">RESUME <span className="text-amber-500">ARCHITECT</span></h1>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <span className="flex items-center gap-1.5"><Zap className="text-amber-500" size={14} /> ATS OPTIMIZED</span>
            <span className="flex items-center gap-1.5"><FileCheck className="text-amber-500" size={14} /> GENERATIVE API</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Input Column */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-amber-500 font-black uppercase tracking-widest text-[11px]">
                <FileText size={16} />
                <h2>Core Background</h2>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 transition-all"
              >
                {isExtracting ? <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div> : <Upload size={12} />}
                {isExtracting ? 'PARSING...' : 'ATTACH CV'}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
            </div>
            <textarea
              className="w-full h-[180px] p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-sm leading-relaxed text-slate-300 placeholder:text-slate-700"
              placeholder="Paste current resume content or upload PDF..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />

            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-500 font-black uppercase tracking-widest text-[11px]">
                  <FolderCode size={16} />
                  <h2>Project Assets</h2>
                </div>
                <button onClick={addProject} className="text-[10px] font-black uppercase text-emerald-500 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all">
                  + Add Item
                </button>
              </div>
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {projects.map(p => (
                  <div key={p.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl relative group">
                    <button onClick={() => removeProject(p.id)} className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                    <div className="grid grid-cols-1 gap-2">
                      <input className="bg-transparent border-b border-slate-800 py-1 text-xs font-bold text-slate-200 outline-none focus:border-amber-500" placeholder="Project Name" value={p.title} onChange={e => updateProject(p.id, 'title', e.target.value)} />
                      <input className="bg-transparent border-b border-slate-800 py-1 text-[10px] text-slate-500 outline-none focus:border-amber-500" placeholder="Technologies" value={p.technologies} onChange={e => updateProject(p.id, 'technologies', e.target.value)} />
                      <textarea className="bg-transparent text-[11px] text-slate-400 h-12 resize-none outline-none" placeholder="Results & Outcomes..." value={p.outcome} onChange={e => updateProject(p.id, 'outcome', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-amber-500 font-black uppercase tracking-widest text-[11px]">
              <Briefcase size={16} />
              <h2>Target Specification</h2>
            </div>
            <textarea
              className="w-full h-[120px] p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all outline-none text-sm text-slate-400 placeholder:text-slate-700"
              placeholder="Paste Job Description for match optimization..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </section>

          <button
            onClick={handleGenerate}
            disabled={status === AnalysisStatus.LOADING || isExtracting}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-slate-950 flex items-center justify-center gap-3 transition-all ${
              status === AnalysisStatus.LOADING 
                ? 'bg-slate-800 cursor-not-allowed text-slate-600' 
                : 'bg-gradient-to-r from-amber-400 to-amber-600 hover:shadow-2xl hover:shadow-amber-500/30 active:scale-[0.98]'
            }`}
          >
            {status === AnalysisStatus.LOADING ? (
              <div className="w-6 h-6 border-4 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Zap size={20} className="fill-slate-950" />
                Architect Documents
              </>
            )}
          </button>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-1" size={16} />
              <p className="text-xs text-red-500 leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Right Preview Column */}
        <div className="lg:col-span-7">
          {!result && status !== AnalysisStatus.LOADING ? (
            <div className="h-full bg-slate-900/50 rounded-[40px] border-4 border-dashed border-slate-800 flex flex-col items-center justify-center p-12 text-center min-h-[700px]">
              <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
                <Search className="text-slate-700 w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-slate-400 uppercase tracking-tighter italic">Engine Ready</h2>
              <p className="text-slate-600 max-w-xs text-sm mt-2">Initialize document generation by providing background data.</p>
            </div>
          ) : status === AnalysisStatus.LOADING ? (
            <div className="h-full bg-slate-900/50 rounded-[40px] border border-slate-800 flex flex-col items-center justify-center p-12 min-h-[700px]">
               <div className="relative mb-12">
                  <div className="w-32 h-32 border-2 border-amber-500/10 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="text-amber-500 w-16 h-16 animate-pulse" />
                  </div>
               </div>
               <p className="text-xs font-black uppercase tracking-[0.4em] text-amber-500">Executing Architectural Protocols...</p>
            </div>
          ) : result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700 pb-20">
              {/* Score and Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center justify-center shadow-xl">
                  <ScoreGauge score={result.ui_display.ats_score} />
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <AlertCircle size={12} /> Critical Gaps
                    </h3>
                    <ul className="space-y-1">
                      {result.ui_display.score_breakdown.whats_missing.map((item, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="text-red-500 mt-1">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Lightbulb size={12} /> Key Improvements
                    </h3>
                    <ul className="space-y-1">
                      {result.ui_display.score_breakdown.what_improved.map((item, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-1">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Document Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-3xl border border-slate-800 inline-flex">
                <button 
                  onClick={() => setActiveTab('resume')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'resume' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <FileText size={16} /> Optimized Resume
                </button>
                <button 
                  onClick={() => setActiveTab('letter')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'letter' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Mail size={16} /> Cover Letter
                </button>
              </div>

              {/* Document Window */}
              <div className="bg-slate-900 rounded-[40px] border border-slate-800 overflow-hidden shadow-2xl">
                <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <Award size={14} className="text-amber-500" />
                    Architectural Output
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      <Download size={14} /> Download PDF
                    </button>
                    <button onClick={copyToClipboard} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Content'}
                    </button>
                  </div>
                </div>

                <div className="p-12 md:p-16 bg-white text-slate-900 min-h-[850px] shadow-inner font-serif selection:bg-amber-200">
                  {activeTab === 'resume' ? (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
                      <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
                        <h1 className="text-3xl font-bold uppercase tracking-tighter">{result.pdf_data.resume.full_name}</h1>
                        <div className="text-xs font-sans font-bold text-slate-600 uppercase tracking-widest flex flex-wrap justify-center gap-x-3">
                          <span>{result.pdf_data.resume.contact_details.email}</span>
                          <span>{result.pdf_data.resume.contact_details.phone}</span>
                          <span>{result.pdf_data.resume.contact_details.linkedin}</span>
                          <span>{result.pdf_data.resume.contact_details.location}</span>
                        </div>
                      </div>

                      <section>
                        <h2 className="text-sm font-sans font-black uppercase tracking-[0.2em] border-b border-slate-300 mb-3 text-slate-500">Professional Summary</h2>
                        <p className="text-sm leading-relaxed italic">{result.pdf_data.resume.summary}</p>
                      </section>

                      <section>
                        <h2 className="text-sm font-sans font-black uppercase tracking-[0.2em] border-b border-slate-300 mb-3 text-slate-500">Core Expertise</h2>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          {result.pdf_data.resume.skills_list.map((s, i) => (
                            <span key={i} className="text-xs font-sans font-bold uppercase">• {s}</span>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h2 className="text-sm font-sans font-black uppercase tracking-[0.2em] border-b border-slate-300 mb-4 text-slate-500">Work Experience</h2>
                        <div className="space-y-6">
                          {result.pdf_data.resume.work_experience.map((exp, i) => (
                            <div key={i} className="space-y-2">
                              <div className="flex justify-between items-baseline font-sans">
                                <h3 className="font-bold text-base">{exp.role}</h3>
                                <span className="text-xs font-bold text-slate-500">{exp.duration}</span>
                              </div>
                              <p className="text-sm font-bold italic opacity-70 mb-1">{exp.company}</p>
                              <ul className="space-y-1.5 ml-4">
                                {exp.bullet_points.map((b, j) => (
                                  <li key={j} className="text-sm leading-snug list-disc pl-2">{b}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h2 className="text-sm font-sans font-black uppercase tracking-[0.2em] border-b border-slate-300 mb-4 text-slate-500">Academic Background</h2>
                        <div className="space-y-3">
                          {result.pdf_data.resume.education.map((edu, i) => (
                            <div key={i} className="flex justify-between items-baseline font-sans">
                              <div>
                                <h3 className="font-bold text-sm">{edu.degree}</h3>
                                <p className="text-xs italic opacity-70">{edu.school}</p>
                              </div>
                              <span className="text-xs font-bold text-slate-500">{edu.year}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                       <div className="space-y-1 font-sans text-xs font-bold uppercase tracking-widest opacity-40">
                          <p>{result.pdf_data.resume.full_name}</p>
                          <p>{result.pdf_data.resume.contact_details.location}</p>
                       </div>
                       
                       <div className="space-y-1">
                          <p className="text-sm font-bold">To: {result.pdf_data.cover_letter.hiring_manager_name}</p>
                          <p className="text-sm opacity-50 italic">{result.pdf_data.cover_letter.company_name}</p>
                       </div>

                       <div className="space-y-6 text-base leading-relaxed text-slate-800">
                          {result.pdf_data.cover_letter.body_paragraphs.map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                       </div>

                       <div className="pt-8 space-y-1">
                          <p className="text-sm font-bold">Sincerely,</p>
                          <p className="text-lg font-bold uppercase italic tracking-tighter border-t border-slate-200 pt-2 inline-block min-w-[200px]">
                            {result.pdf_data.resume.full_name}
                          </p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
};

export default App;
