
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { generateExam } from './services/geminiService';
import { ExamConfig, Question, QuestionType, questionTypeLabels, MultipleChoiceQuestion, TrueFalseQuestion, OrderingQuestion, MatchingQuestion, CognitiveLevel, cognitiveLevelLabels } from './types';

// Let TypeScript know pdfjsLib is available on the window
declare const pdfjsLib: any;

// --- Color map for Cognitive Levels ---
const levelColorMap: Record<CognitiveLevel, { bg: string; text: string; border: string; }> = {
    [CognitiveLevel.Knowledge]: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
    [CognitiveLevel.Comprehension]: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-400' },
    [CognitiveLevel.Application]: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
    [CognitiveLevel.HighApplication]: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-400' },
};

// --- SVG Icons ---
const IconDocumentText = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconCog = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const Spinner = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const IconUpload = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;
const IconFile = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const IconXCircle = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconDownload = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const IconLanguage = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m4 13-4-4m0 0l-4 4m4-4v12M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const IconCreativeTeacher = () => (
    <div className="relative w-40 h-40">
        <svg viewBox="0 0 150 150" className="w-full h-full">
            {/* Desk */}
            <rect x="10" y="120" width="130" height="8" rx="4" className="fill-amber-800" />
            <rect x="25" y="128" width="8" height="18" className="fill-amber-800" />
            <rect x="117" y="128" width="8" height="18" className="fill-amber-800" />

            {/* Teacher - with bobbing animation */}
            <g className="animate-teacher-bob">
                <path d="M 55 120 C 60 90, 90 90, 95 120 Z" className="fill-sky-400" />
                <circle cx="75" cy="80" r="15" className="fill-sky-400" />
            </g>

            {/* Lightbulb - with glowing animation */}
            <g className="animate-lightbulb-glow" style={{ transformOrigin: '75px 50px' }}>
                <path d="M75,25 C66.7,25 60,31.7 60,40 C60,46 65,48 65,52 L65,55 L85,55 L85,52 C85,48 90,46 90,40 C90,31.7 83.3,25 75,25 Z" className="fill-yellow-300" />
                <rect x="70" y="55" width="10" height="5" className="fill-slate-400" />
            </g>

            {/* Idea particles - with rising animation */}
            <g>
                <circle cx="75" cy="60" r="3" className="fill-sky-400 animate-idea-rise" style={{ animationDelay: '0s' }} />
                <circle cx="65" cy="62" r="2" className="fill-sky-300 animate-idea-rise" style={{ animationDelay: '0.5s' }} />
                <circle cx="85" cy="62" r="2.5" className="fill-sky-300 animate-idea-rise" style={{ animationDelay: '1s' }} />
                 <circle cx="78" cy="65" r="2" className="fill-sky-200 animate-idea-rise" style={{ animationDelay: '1.5s' }} />
            </g>
        </svg>
        <style>
        {`
            @keyframes teacher-bob {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-2px); }
            }
            .animate-teacher-bob {
                animation: teacher-bob 3s infinite ease-in-out;
            }

            @keyframes lightbulb-glow {
                0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 2px #fef08a); }
                50% { opacity: 1; filter: drop-shadow(0 0 8px #fef08a); }
            }
            .animate-lightbulb-glow {
                animation: lightbulb-glow 2.5s infinite ease-in-out;
            }
            
            @keyframes idea-rise {
                0% { transform: translateY(0px); opacity: 1; }
                100% { transform: translateY(-35px); opacity: 0; }
            }
            .animate-idea-rise {
                animation: idea-rise 2s infinite linear;
            }
        `}
        </style>
    </div>
);


// --- File Parsing Logic ---
const parseDocx = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!event.target?.result) return reject(new Error("Failed to read file"));
            try {
                const result = await (window as any).mammoth.extractRawText({ arrayBuffer: event.target.result });
                resolve(result.value);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

const parseXlsx = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target?.result) return reject(new Error("Failed to read file"));
            try {
                const data = new Uint8Array(event.target.result as ArrayBuffer);
                const workbook = (window as any).XLSX.read(data, { type: 'array' });
                let content = '';
                workbook.SheetNames.forEach((sheetName: string) => {
                    const worksheet = workbook.Sheets[sheetName];
                    content += (window as any).XLSX.utils.sheet_to_txt(worksheet);
                });
                resolve(content);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

const parsePdf = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!event.target?.result) return reject(new Error("Failed to read file"));
            try {
                const loadingTask = pdfjsLib.getDocument({ data: event.target.result });
                const pdf = await loadingTask.promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map((item: any) => item.str).join(' ');
                    textContent += '\n'; // Add a newline between pages
                }
                resolve(textContent);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

interface SourceMaterial {
  id: string;
  file: File;
  status: 'pending' | 'parsing' | 'success' | 'error';
  textContent?: string;
  base64?: string;
  mimeType?: string;
  progress?: number;
  error?: string;
}

// --- Helper Components ---
interface ConfigPanelProps {
    config: ExamConfig;
    setConfig: (config: ExamConfig) => void;
    onGenerate: () => void;
    isLoading: boolean;
    sourceMaterials: SourceMaterial[];
    onAddFiles: (files: FileList) => void;
    onRemoveMaterial: (id: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, onGenerate, isLoading, sourceMaterials, onAddFiles, onRemoveMaterial, language, setLanguage }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleQuantityChange = (type: QuestionType, level: CognitiveLevel, value: string) => {
        const newCount = Math.max(0, parseInt(value, 10) || 0);
        setConfig({
            ...config,
            [type]: {
                ...config[type],
                [level]: newCount
            }
        });
    };

    const handleCheckboxChange = (type: QuestionType, checked: boolean) => {
        const currentLevels = config[type];
        const currentTotal = Object.entries(currentLevels)
            .filter(([key]) => key !== 'settings')
            .reduce((sum, [, count]) => sum + (count as number), 0);

        if (checked && currentTotal === 0) {
            setConfig({ ...config, [type]: { ...config[type], [CognitiveLevel.Knowledge]: 1 } });
        } else if (!checked) {
            const allZeroLevels = Object.fromEntries(
                Object.keys(currentLevels)
                    .filter(k => k !== 'settings')
                    .map(k => [k, 0])
            ) as Record<CognitiveLevel, number>;
            setConfig({ ...config, [type]: { ...config[type], ...allZeroLevels } });
        }
    };

    const handleItemCountChange = (level: CognitiveLevel, value: string) => {
        const newCount = Math.max(2, Math.min(5, parseInt(value, 10) || 2));
        const matchingConfig = config[QuestionType.Matching];
        setConfig({
            ...config,
            [QuestionType.Matching]: {
                ...matchingConfig,
                settings: {
                    ...matchingConfig.settings,
                    levelSettings: {
                        ...matchingConfig.settings?.levelSettings,
                        [level]: {
                            ...matchingConfig.settings?.levelSettings?.[level],
                            itemCount: newCount,
                        }
                    }
                },
            },
        });
    };
    
    const totalQuestions = Object.values(config)
        .flatMap(typeConfig => Object.entries(typeConfig)
            .filter(([key]) => key !== 'settings')
            .map(([, count]) => count as number)
        )
        .reduce((sum, count) => sum + count, 0);
        
    const isParsing = sourceMaterials.some(m => m.status === 'parsing');
    const hasSource = sourceMaterials.some(m => m.status === 'success' && (m.textContent || m.base64));

    const isGenerateDisabled = isLoading || isParsing || totalQuestions === 0 || !hasSource;

    const MaterialItem: React.FC<{ material: SourceMaterial; onRemove: (id: string) => void }> = ({ material, onRemove }) => {
        const isImage = material.file.type.startsWith('image/');
        return (
            <div className="p-3 border border-slate-300 rounded-lg flex items-center gap-3 bg-white">
                {isImage && material.base64 ? (
                     <img src={`data:${material.mimeType};base64,${material.base64}`} alt={material.file.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                    <IconFile />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{material.file.name}</p>
                    {material.status === 'success' && <p className="text-xs text-slate-500">{Math.round(material.file.size / 1024)} KB - Hoàn tất</p>}
                    {material.status === 'error' && <p className="text-xs text-red-500 truncate" title={material.error}>{material.error}</p>}
                    {material.status === 'parsing' && (
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${material.progress || 0}%` }}></div>
                        </div>
                    )}
                </div>
                <button onClick={() => onRemove(material.id)} className="text-slate-400 hover:text-red-500 transition"><IconXCircle /></button>
            </div>
        );
    };

    return (
        <div className="w-full lg:w-1/3 xl:w-1/4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg flex flex-col gap-6 h-fit border border-slate-200/80">
            <div>
                <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-4">
                    <IconDocumentText />
                    <span>Nguồn Tài Liệu</span>
                </h2>
                <div className="space-y-4">
                    {/* Unified Upload Area */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => e.target.files && onAddFiles(e.target.files)} 
                      accept=".docx,.xlsx,.xls,.pdf,image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                    />
                    <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                        <IconUpload />
                        <p className="mt-2 text-sm text-slate-600"><span className="font-semibold text-indigo-600">TẢI TỆP LÊN</span> hoặc kéo thả</p>
                        <p className="text-xs text-slate-500">Tài liệu (DOCX, XLSX, PDF) và Hình ảnh</p>
                    </div>

                    {/* Display uploaded files */}
                    {sourceMaterials.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                           {sourceMaterials.map(material => (
                               <MaterialItem key={material.id} material={material} onRemove={onRemoveMaterial} />
                           ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
                <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-4"><IconCog /><span>Cài đặt đề kiểm tra</span></h2>
                
                <div className="mb-4">
                    <label htmlFor="language-select" className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <IconLanguage />
                        Ngôn ngữ đề
                    </label>
                    <select
                        id="language-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-md shadow-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    >
                        <option value="vietnamese">Tiếng Việt</option>
                        <option value="english">Tiếng Anh</option>
                        <option value="french">Tiếng Pháp</option>
                    </select>
                </div>

                <div className="space-y-3">
                    {Object.values(QuestionType).map(type => {
                        const typeConfig = config[type];
                        const isTypeActive = Object.entries(typeConfig)
                            .filter(([key]) => key !== 'settings')
                            .some(([, count]) => (count as number) > 0);
                        return (
                            <div key={type} className={`p-3 rounded-lg border transition-all ${isTypeActive ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50/80 border-slate-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id={type} checked={isTypeActive} onChange={(e) => handleCheckboxChange(type, e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                        <label htmlFor={type} className="font-medium text-slate-700">{questionTypeLabels[type]}</label>
                                    </div>
                                </div>
                                {isTypeActive && (
                                    <div className="mt-4 pl-4 space-y-3">
                                        {Object.values(CognitiveLevel).map(level => (
                                            <div key={level} className="flex items-center justify-between gap-3">
                                                <label htmlFor={`${type}-${level}`} className="text-sm text-slate-600">{cognitiveLevelLabels[level]}</label>
                                                <div className="flex items-center gap-2">
                                                    {type === QuestionType.Matching && (
                                                         <div className="flex items-center gap-1.5">
                                                            <label htmlFor={`matching-items-${level}`} className="text-sm text-slate-500">Số cặp:</label>
                                                            <select 
                                                                id={`matching-items-${level}`}
                                                                value={config[QuestionType.Matching].settings?.levelSettings?.[level]?.itemCount || 4}
                                                                onChange={(e) => handleItemCountChange(level, e.target.value)}
                                                                className="w-[60px] p-2 text-center bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
                                                            >
                                                                <option value={2}>2</option>
                                                                <option value={3}>3</option>
                                                                <option value={4}>4</option>
                                                                <option value={5}>5</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                    <input id={`${type}-${level}`} type="number" value={config[type][level]} onChange={(e) => handleQuantityChange(type, level, e.target.value)} className="w-20 p-2 text-center bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition" min="0" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <button onClick={onGenerate} disabled={isGenerateDisabled} className="w-full mt-auto bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition duration-300 ease-in-out flex items-center justify-center gap-2 transform hover:scale-105">
                {isLoading ? <Spinner /> : 'Tạo Đề Kiểm Tra'}
            </button>
        </div>
    );
};

// --- Type Guards & Helpers ---
const isMcq = (q: Question): q is MultipleChoiceQuestion => q.type === QuestionType.MultipleChoice && Array.isArray((q as MultipleChoiceQuestion).options);
const isTfq = (q: Question): q is TrueFalseQuestion => q.type === QuestionType.TrueFalse && Array.isArray((q as TrueFalseQuestion).statements);
const isOrdering = (q: Question): q is OrderingQuestion => q.type === QuestionType.Ordering;
const isMatching = (q: Question): q is MatchingQuestion => q.type === QuestionType.Matching && Array.isArray((q as MatchingQuestion).columns);

// Robust string normalization for comparison
const normalizeString = (str: string | undefined | null): string => {
    if (!str) return '';
    // Normalize by trimming, converting to lower case, and removing common punctuation.
    // This makes comparisons more robust against minor AI inconsistencies.
    return str
        .trim()
        .toLowerCase()
        .replace(/[.,;:"'?!()[\]{}]/g, '');
};

const getListItemPrefix = (index: number, columnIndex: number): string => {
    // Generates prefixes like: 1, A, a, 1), A)
    switch (columnIndex % 5) {
        case 0: return `${index + 1}`;
        case 1: return `${String.fromCharCode(65 + index)}`;
        case 2: return `${String.fromCharCode(97 + index)}`;
        case 3: return `${index + 1})`;
        case 4: return `${String.fromCharCode(65 + index)})`;
        default: return `${index + 1}`;
    }
};

const QuestionCard: React.FC<{ question: Question; index: number }> = ({ question, index }) => {
    const colors = levelColorMap[question.level] || levelColorMap[CognitiveLevel.Knowledge];

    const scrambledItems = useMemo(() => {
        if (!isOrdering(question)) return [];
        // Priority 1: Use items if they exist and are not empty
        if (question.items && question.items.length > 0) {
            return question.items;
        }
        // Priority 2: Use correctOrder and shuffle it
        if (question.correctOrder && question.correctOrder.length > 0) {
            return [...question.correctOrder].sort(() => Math.random() - 0.5);
        }
        // Priority 3 (Fallback): Use answer, split it, and shuffle it
        if (question.answer) {
            return question.answer.split(' ').sort(() => Math.random() - 0.5);
        }
        return [];
    }, [question]);
    
    const orderingAnswer = useMemo(() => {
        if (!isOrdering(question)) return null;
        // Priority 1: Use the answer field if it exists and is not just whitespace
        if (question.answer && question.answer.trim()) {
            return question.answer;
        }
        // Priority 2 (Fallback): Construct the answer from correctOrder
        if (question.correctOrder && question.correctOrder.length > 0) {
            return question.correctOrder.join(' ');
        }
        return null; // Fallback to null if no answer is found
    }, [question]);

    const shuffledOptions = useMemo(() => {
        if (!isMcq(question)) return [];
        return [...question.options].sort(() => Math.random() - 0.5);
    }, [question]);

    const matchingData = useMemo(() => {
        if (!isMatching(question) || !question.columns || question.columns.length < 2) {
            return null;
        }

        const leftColumn = question.columns[0];
        const rightColumnOriginal = question.columns[1];
        
        if (!leftColumn?.items || !rightColumnOriginal?.items) return null;

        // Shuffle the items of the right column
        const rightColumnShuffled = {
            ...rightColumnOriginal,
            items: [...rightColumnOriginal.items].sort(() => Math.random() - 0.5)
        };
        
        const shuffledColumns = [leftColumn, rightColumnShuffled];
        
        const answerStrings = (question.answerKey || []).map(match => {
            if (!Array.isArray(match) || match.length < 2) return null;
            
            const leftItem = match[0];
            const rightItem = match[1];

            const leftItemIndex = leftColumn.items.findIndex(item => normalizeString(item) === normalizeString(leftItem));
            const rightItemShuffledIndex = rightColumnShuffled.items.findIndex(item => normalizeString(item) === normalizeString(rightItem));
            
            if (leftItemIndex === -1 || rightItemShuffledIndex === -1) return null;

            return `${getListItemPrefix(leftItemIndex, 0)} - ${getListItemPrefix(rightItemShuffledIndex, 1)}`;
        }).filter((s): s is string => s !== null);


        return {
            columns: shuffledColumns,
            answers: answerStrings
        };
    }, [question]);

    return (
        <div className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${colors.border}`}>
            <div className="flex items-start gap-4">
                <span className={`text-lg font-bold ${colors.text}`}>Câu {index + 1}:</span>
                <div className="flex-1">
                    <p className="text-slate-800 font-medium">{question.question}</p>
                    <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full mt-2 inline-block ${colors.bg} ${colors.text}`}>
                        {cognitiveLevelLabels[question.level]}
                    </span>
                </div>
            </div>
            <div className="mt-4 pl-10 space-y-4 text-sm">
                {isMcq(question) && (
                    <div className="space-y-3">
                        <ul className="list-none space-y-2">
                            {shuffledOptions.map((option, i) => {
                                const isCorrect = normalizeString(question.answer) === normalizeString(option);
                                return (
                                <li key={i} className={`flex items-center gap-3 p-2 rounded-md ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'bg-slate-50'}`}>
                                    <span className={`font-mono ${isCorrect ? 'text-green-700' : 'text-slate-500'}`}>{String.fromCharCode(65 + i)}.</span>
                                    <span>{option}</span>
                                </li>
                                );
                            })}
                        </ul>
                        <div>
                            <p className="font-semibold text-slate-600 mb-1 text-sm">Đáp án đúng:</p>
                            {question.answer && question.answer.trim() ? (
                                <div className="p-2 bg-green-100 text-green-800 rounded-md font-semibold">
                                    {question.answer}
                                </div>
                            ) : (
                                <div className="p-2 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                                    (Chưa có đáp án)
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {isTfq(question) && (
                    <ul className="list-none space-y-3">
                        {question.statements.map((stmt, i) => (
                            <li key={i} className="flex items-start justify-between gap-4 p-2 rounded-md bg-slate-50/80">
                                <div className="flex-1">
                                    <span className="font-mono text-slate-500 mr-2">{i + 1}.</span>
                                    <span>{stmt.statement}</span>
                                </div>
                                {typeof stmt.answer === 'boolean' ? (
                                    <span className={`font-bold px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${stmt.answer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {stmt.answer ? 'ĐÚNG' : 'SAI'}
                                    </span>
                                ) : (
                                    <span className="font-bold px-2 py-0.5 text-xs rounded-full flex-shrink-0 bg-yellow-100 text-yellow-800">
                                        ???
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {isOrdering(question) && (
                    <div className="space-y-3">
                        <div className="p-3 bg-slate-100 border border-slate-200 rounded-md">
                            <p className="text-slate-800 font-medium tracking-wide">
                                {scrambledItems.join(' / ')}
                            </p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-600 mb-2">Đáp án đúng:</p>
                            {orderingAnswer ? (
                                <div className="p-3 bg-green-100 text-green-800 rounded-md font-semibold">
                                    {orderingAnswer}
                                </div>
                            ) : (
                                <div className="p-2 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                                    (Chưa có đáp án)
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {isMatching(question) && (
                    matchingData ? (
                        <div className="space-y-4">
                            <div className="flex gap-8">
                               {matchingData.columns.map((col, colIndex) => (
                                    <div key={colIndex} className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-700 border-b pb-1 mb-2">{col.title}</h4>
                                        <ul className="list-none space-y-1">
                                            {col.items.map((item, itemIndex) => (
                                                <li key={itemIndex}>
                                                    <span className="font-mono text-slate-500 mr-2">{getListItemPrefix(itemIndex, colIndex)}.</span>{item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                            {matchingData.answers.length > 0 ? (
                                <div>
                                     <p className="font-semibold text-slate-600 mb-2">Đáp án ghép nối:</p>
                                     <ul className="list-none space-y-2">
                                        {matchingData.answers.map((answerString, matchIndex) => (
                                             <li key={matchIndex} className="p-2 bg-green-100 text-green-800 rounded-md font-semibold">
                                                {answerString}
                                             </li>
                                        ))}
                                     </ul>
                                </div>
                            ) : (
                                 <div className="p-2 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                                    (Chưa có đáp án ghép nối)
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-2 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                            (Dữ liệu câu hỏi không hợp lệ hoặc thiếu đáp án)
                        </div>
                    )
                )}
                {(question.type === QuestionType.ShortAnswer ||
                  question.type === QuestionType.FillInTheBlank ||
                  question.type === QuestionType.Essay) && (
                    <div>
                        <p className="font-semibold text-slate-600 mb-1 text-sm">
                            {question.type === QuestionType.Essay ? 'Gợi ý đáp án:' : 'Đáp án:'}
                        </p>
                        {question.answer && question.answer.trim() ? (
                            <div className={`p-2 rounded-md font-semibold 
                                ${question.type === QuestionType.ShortAnswer ? 'bg-blue-100 text-blue-700' :
                                  question.type === QuestionType.FillInTheBlank ? 'bg-amber-100 text-amber-700' :
                                  'bg-purple-100 text-purple-700'}`
                                }>
                                {question.answer}
                            </div>
                        ) : (
                            <div className="p-2 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                                (Chưa có đáp án)
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const DisplayPanel: React.FC<{ exam: Question[] | null; isLoading: boolean; error: string | null; handleExportQuestions: () => void; handleExportAnswers: () => void; }> = ({ exam, isLoading, error, handleExportQuestions, handleExportAnswers }) => {
    const renderContent = () => {
        if (isLoading) return <div className="text-center p-10"><div role="status" className="flex flex-col items-center justify-center gap-4"><IconCreativeTeacher /><span className="text-lg font-semibold text-slate-600 mt-2">Chờ thầy Lung soạn đề...</span><p className="text-sm text-slate-500">Quá trình này có thể mất một vài phút.</p></div></div>;
        if (error) return <div className="text-center p-10 bg-red-50 border border-red-200 rounded-lg"><h3 className="text-lg font-semibold text-red-700">Đã xảy ra lỗi</h3><p className="mt-2 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p></div>;
        if (exam) return <div className="space-y-6">{exam.map((q, i) => <QuestionCard key={q.id} question={q} index={i} />)}</div>;
        return <div className="text-center p-10 bg-gradient-to-br from-slate-50 to-slate-100 border border-dashed border-slate-300 rounded-lg"><h3 className="text-lg font-semibold text-slate-700">Chưa có đề kiểm tra nào</h3><p className="mt-1 text-sm text-slate-500">Sử dụng bảng điều khiển để tải tài liệu và tạo đề kiểm tra của bạn.</p></div>;
    };
    
    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/80">
            {exam && !isLoading && (
                 <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-700">Kết quả đề kiểm tra</h2>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExportQuestions} className="inline-flex items-center gap-2 bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-sky-700 transition transform hover:scale-105 text-sm">
                            <IconDownload />
                            <span>Tải Câu Hỏi (.txt)</span>
                        </button>
                         <button onClick={handleExportAnswers} className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-teal-700 transition transform hover:scale-105 text-sm">
                            <IconDownload />
                            <span>Tải Đáp Án (.txt)</span>
                        </button>
                    </div>
                 </div>
            )}
            <div className="p-6">
                {renderContent()}
            </div>
        </div>
    );
};

// --- Helper Functions and Initial State for App ---

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove "data:mime/type;base64," part
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

const initialConfig: ExamConfig = Object.values(QuestionType).reduce((acc, type) => {
    acc[type] = {
        [CognitiveLevel.Knowledge]: 0,
        [CognitiveLevel.Comprehension]: 0,
        [CognitiveLevel.Application]: 0,
        [CognitiveLevel.HighApplication]: 0,
    };
    if (type === QuestionType.Matching) {
        acc[type].settings = {
            levelSettings: {
                [CognitiveLevel.Knowledge]: { itemCount: 4 },
                [CognitiveLevel.Comprehension]: { itemCount: 4 },
                [CognitiveLevel.Application]: { itemCount: 4 },
                [CognitiveLevel.HighApplication]: { itemCount: 4 },
            }
        };
    }
    return acc;
}, {} as ExamConfig);

const downloadTxtFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- Main App Component ---

const App: React.FC = () => {
    const [sourceMaterials, setSourceMaterials] = useState<SourceMaterial[]>([]);
    const [config, setConfig] = useState<ExamConfig>(initialConfig);
    const [exam, setExam] = useState<Question[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState('vietnamese');

    const handleAddFiles = useCallback((files: FileList) => {
        const newMaterials: SourceMaterial[] = Array.from(files).map(file => ({
            id: crypto.randomUUID(),
            file,
            status: 'pending',
        }));

        setSourceMaterials(prev => [...prev, ...newMaterials]);

        newMaterials.forEach(material => {
            const processFile = async () => {
                setSourceMaterials(prev => prev.map(m => m.id === material.id ? { ...m, status: 'parsing', progress: 0 } : m));
                
                try {
                    let textContent: string | undefined;
                    let base64: string | undefined;
                    let mimeType: string | undefined;

                    if (material.file.type.startsWith('image/')) {
                        mimeType = material.file.type;
                        base64 = await fileToBase64(material.file);
                    } else {
                        // Progress is not granular for docx/xlsx, so we'll just set it to 50% initially
                        setSourceMaterials(prev => prev.map(m => m.id === material.id ? { ...m, progress: 50 } : m));

                        if (material.file.name.endsWith('.docx')) {
                            textContent = await parseDocx(material.file);
                        } else if (material.file.name.endsWith('.xlsx') || material.file.name.endsWith('.xls')) {
                            textContent = await parseXlsx(material.file);
                        } else if (material.file.name.endsWith('.pdf')) {
                            textContent = await parsePdf(material.file);
                        } else {
                            throw new Error(`Unsupported file type: ${material.file.name}`);
                        }
                    }
                    
                    setSourceMaterials(prev => prev.map(m => m.id === material.id ? { ...m, status: 'success', textContent, base64, mimeType, progress: 100 } : m));

                } catch (e: any) {
                    setSourceMaterials(prev => prev.map(m => m.id === material.id ? { ...m, status: 'error', error: e.message || 'Parsing failed' } : m));
                }
            };
            processFile();
        });
    }, []);

    const handleRemoveMaterial = useCallback((id: string) => {
        setSourceMaterials(prev => prev.filter(m => m.id !== id));
    }, []);
    
    const handleGenerateExam = useCallback(async () => {
        setError(null);
        setExam(null);
        setIsLoading(true);

        const sourceText = sourceMaterials
            .filter(m => m.status === 'success' && m.textContent)
            .map(m => m.textContent)
            .join('\n\n---\n\n');
        
        const images = sourceMaterials
            .filter(m => m.status === 'success' && m.base64 && m.mimeType)
            .map(m => ({ data: m.base64!, mimeType: m.mimeType! }));

        try {
            const generatedExam = await generateExam(sourceText, config, images, language);
            setExam(generatedExam);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [config, sourceMaterials, language]);

    const handleExportQuestions = useCallback(() => {
        if (!exam) return;

        let examText = "ĐỀ KIỂM TRA\n\n";
        exam.forEach((q, index) => {
            examText += `Câu ${index + 1}: ${q.question}\n`;
            if (isMcq(q)) {
                q.options.forEach((opt, i) => {
                    examText += `  ${String.fromCharCode(65 + i)}. ${opt}\n`;
                });
            } else if (isTfq(q)) {
                q.statements.forEach((stmt, i) => {
                    examText += `  ${i + 1}. ${stmt.statement}\n`;
                });
            } else if (isOrdering(q)) {
                let scrambled: string[] = [];
                if (q.items && q.items.length > 0) {
                    scrambled = q.items;
                } else if (q.correctOrder && q.correctOrder.length > 0) {
                    scrambled = [...q.correctOrder].sort(() => Math.random() - 0.5);
                } else if (q.answer) {
                    scrambled = q.answer.split(' ').sort(() => Math.random() - 0.5);
                }
                examText += `  Các từ/cụm từ: ${scrambled.join(' / ')}\n`;
            } else if (isMatching(q)) {
                if (!q.columns || q.columns.length < 2) {
                    examText += '  (Lỗi: Dữ liệu câu hỏi ghép nối không đầy đủ)\n';
                } else {
                    q.columns.forEach((col, colIndex) => {
                        examText += `${col.title}:\n`;
                        col.items.forEach((item, itemIndex) => {
                            examText += `  ${getListItemPrefix(itemIndex, colIndex)}. ${item}\n`;
                        });
                    });
                }
            }
            examText += "\n";
        });

        downloadTxtFile(examText, 'de-kiem-tra-cau-hoi.txt');
    }, [exam]);

    const handleExportAnswers = useCallback(() => {
        if (!exam) return;
        
        let answerText = "ĐÁP ÁN ĐỀ KIỂM TRA\n\n";
        exam.forEach((q, index) => {
            answerText += `Câu ${index + 1}: `;
            if (isMcq(q)) {
                const correctIndex = q.options.findIndex(opt => normalizeString(opt) === normalizeString(q.answer));
                if (correctIndex !== -1) {
                    answerText += `${String.fromCharCode(65 + correctIndex)}. ${q.answer}\n`;
                } else {
                    answerText += `${q.answer || '(Không có đáp án)'}\n`;
                }
            } else if (isTfq(q)) {
                answerText += '\n';
                q.statements.forEach((stmt, i) => {
                    answerText += `  ${i + 1}. ${stmt.answer ? 'Đúng' : 'Sai'}\n`;
                });
            } else if (isOrdering(q)) {
                const correctAnswer = q.answer || (q.correctOrder ? q.correctOrder.join(' ') : 'Không có đáp án');
                answerText += `${correctAnswer}\n`;
            } else if (isMatching(q)) {
                answerText += '\n';
                if (q.answerKey && q.answerKey.length > 0) {
                    q.answerKey.forEach(match => {
                        if (Array.isArray(match) && match.length >= 2) {
                            answerText += `  ${match[0]} - ${match[1]}\n`;
                        }
                    });
                } else {
                     answerText += '  (Không có đáp án ghép nối)\n';
                }
            } else if (q.answer) {
                answerText += `${q.answer}\n`;
            } else {
                answerText += '(Không có đáp án)\n';
            }
             answerText += "\n";
        });

        downloadTxtFile(answerText, 'de-kiem-tra-dap-an.txt');
    }, [exam]);


    return (
        <main className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-indigo-100 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-screen-xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500">HỆ THỐNG AI TẠO ĐỀ</h1>
                    <p className="mt-3 text-lg text-slate-600">Tạo Đề Kiểm Tra Và Ôn Tập (Teacher Lung)</p>
                </header>
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <ConfigPanel
                        config={config}
                        setConfig={setConfig}
                        onGenerate={handleGenerateExam}
                        isLoading={isLoading}
                        sourceMaterials={sourceMaterials}
                        onAddFiles={handleAddFiles}
                        onRemoveMaterial={handleRemoveMaterial}
                        language={language}
                        setLanguage={setLanguage}
                    />
                    <div className="flex-1 w-full">
                        <DisplayPanel 
                            exam={exam} 
                            isLoading={isLoading} 
                            error={error} 
                            handleExportQuestions={handleExportQuestions}
                            handleExportAnswers={handleExportAnswers}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default App;
