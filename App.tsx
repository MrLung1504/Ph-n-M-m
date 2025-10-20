import React, { useState, useCallback, useRef } from 'react';
import { generateExam } from './services/geminiService';
import { ExamConfig, Question, QuestionType, questionTypeLabels, MultipleChoiceQuestion, TrueFalseQuestion, CognitiveLevel, cognitiveLevelLabels } from './types';

// --- SVG Icons ---
const IconDocumentText = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconCog = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const Spinner = () => <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const IconUpload = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;
const IconFile = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const IconXCircle = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconDownload = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;


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

const parsePdf = (file: File, onProgress: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!event.target?.result) return reject(new Error("Failed to read file"));
            try {
                const pdf = await (window as any).pdfjsLib.getDocument({ data: event.target.result }).promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map((s: any) => s.str).join(' ');
                    onProgress(Math.round((i / pdf.numPages) * 100));
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

// --- Helper Components ---
interface ConfigPanelProps {
    sourceText: string;
    setSourceText: (text: string) => void;
    config: ExamConfig;
    setConfig: (config: ExamConfig) => void;
    onGenerate: () => void;
    isLoading: boolean;
    sourceFile: File | null;
    setSourceFile: (file: File | null) => void;
    parsingProgress: number | null;
    setParsingProgress: (progress: number | null) => void;
    setError: (error: string | null) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ sourceText, setSourceText, config, setConfig, onGenerate, isLoading, sourceFile, setSourceFile, parsingProgress, setParsingProgress, setError }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        setSourceFile(file);
        setSourceText('');
        setParsingProgress(0);
        setError(null);

        try {
            let content = '';
            const fileType = file.name.split('.').pop()?.toLowerCase();
            if (fileType === 'docx') {
                content = await parseDocx(file);
                setParsingProgress(100);
            } else if (fileType === 'xlsx' || fileType === 'xls') {
                content = await parseXlsx(file);
                setParsingProgress(100);
            } else if (fileType === 'pdf') {
                content = await parsePdf(file, setParsingProgress);
            } else {
                throw new Error("Định dạng tệp không được hỗ trợ. Vui lòng chọn .docx, .xlsx, hoặc .pdf.");
            }
            setSourceText(content);
        } catch (error) {
            // FIX: Safely handle the error object by checking its instance type. This resolves potential runtime errors if a non-Error object is thrown.
            setError(error instanceof Error ? error.message : "Không thể xử lý tệp.");
            setSourceFile(null);
        } finally {
            setTimeout(() => setParsingProgress(null), 1000);
        }
    };
    
    const clearFile = () => {
        setSourceFile(null);
        setSourceText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

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
        // FIX: Add explicit types to the reduce function's accumulator and value to prevent potential type inference issues.
        const currentTotal = Object.values(currentLevels).reduce((sum: number, count: number) => sum + count, 0);

        if (checked && currentTotal === 0) {
            // If checking and it's currently all zeros, default to 1 knowledge question
            setConfig({ ...config, [type]: { ...config[type], [CognitiveLevel.Knowledge]: 1 } });
        } else if (!checked) {
            // If unchecking, set all levels for this type to 0
            const allZeroLevels = Object.fromEntries(Object.keys(currentLevels).map(k => [k, 0])) as Record<CognitiveLevel, number>;
            setConfig({ ...config, [type]: allZeroLevels });
        }
    };
    
    const isGenerateDisabled = isLoading || parsingProgress !== null || Object.values(config).every(levels => Object.values(levels).every(v => v === 0)) || sourceText.trim() === '';

    return (
        <div className="w-full lg:w-1/3 xl:w-1/4 p-6 bg-white rounded-2xl shadow-lg flex flex-col gap-6 h-fit">
            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2"><IconDocumentText /><span>Tải lên tài liệu</span></h2>
            
            <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files)} accept=".docx,.pdf,.xlsx,.xls" />
            
            {!sourceFile ? (
                <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                    <IconUpload />
                    <p className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-indigo-600">TẢI FILE LÊN</span> hoặc kéo thả
                    </p>
                    <p className="text-xs text-slate-500">DOCX, XLSX, PDF</p>
                </div>
            ) : (
                <div className="p-3 border border-slate-300 rounded-lg">
                    {parsingProgress !== null && parsingProgress < 100 ? (
                        <div className="flex flex-col items-center justify-center">
                            <p className="text-sm font-medium text-slate-700 mb-2">Đang xử lý: {sourceFile.name}</p>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${parsingProgress}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <IconFile />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{sourceFile.name}</p>
                                <p className="text-xs text-slate-500">{Math.round(sourceFile.size / 1024)} KB</p>
                            </div>
                            <button onClick={clearFile} className="text-slate-400 hover:text-red-500 transition"><IconXCircle /></button>
                        </div>
                    )}
                </div>
            )}

            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mt-2"><IconCog /><span>Cài đặt đề thi</span></h2>
            <div className="space-y-3">
                {Object.values(QuestionType).map(type => {
                    const isTypeActive = Object.values(config[type]).some(count => count > 0);
                    return (
                        <div key={type} className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 transition-all">
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
                                            <input id={`${type}-${level}`} type="number" value={config[type][level]} onChange={(e) => handleQuantityChange(type, level, e.target.value)} className="w-20 p-2 text-center border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition" min="0" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <button onClick={onGenerate} disabled={isGenerateDisabled} className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition duration-300 ease-in-out flex items-center justify-center gap-2">
                {isLoading ? <Spinner /> : 'Tạo Đề Thi'}
            </button>
        </div>
    );
};

const QuestionCard: React.FC<{ question: Question; index: number }> = ({ question, index }) => {
    const isMcq = (q: Question): q is MultipleChoiceQuestion => q.type === QuestionType.MultipleChoice && Array.isArray((q as MultipleChoiceQuestion).options);
    const isTfq = (q: Question): q is TrueFalseQuestion => q.type === QuestionType.TrueFalse && Array.isArray((q as TrueFalseQuestion).statements);

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200/80">
            <div className="flex items-start gap-4">
                <span className="text-lg font-bold text-indigo-600">Câu {index + 1}:</span>
                <div className="flex-1">
                    <p className="text-slate-800 font-medium">{question.question}</p>
                    <span className="text-xs font-semibold uppercase text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full mt-2 inline-block">
                        {cognitiveLevelLabels[question.level]}
                    </span>
                </div>
            </div>
            <div className="mt-4 pl-10 space-y-2 text-sm">
                {isMcq(question) && <ul className="list-none space-y-2">{question.options.map((option, i) => <li key={i} className={`flex items-center gap-3 p-2 rounded-md ${option === question.answer ? 'bg-green-100 text-green-800 font-semibold' : 'bg-slate-50'}`}><span className={`font-mono ${option === question.answer ? 'text-green-700' : 'text-slate-500'}`}>{String.fromCharCode(65 + i)}.</span><span>{option}</span></li>)}</ul>}
                {isTfq(question) && <ul className="list-none space-y-3">{question.statements.map((stmt, i) => <li key={i} className="flex items-center gap-3 p-2 rounded-md bg-slate-50/80"><span className="font-mono text-slate-500">{i + 1}.</span><span className="flex-1">{stmt.statement}</span><span className={`font-bold px-2 py-0.5 text-xs rounded-full ${stmt.answer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{stmt.answer ? 'ĐÚNG' : 'SAI'}</span></li>)}</ul>}
                {question.type === QuestionType.ShortAnswer && <p className="text-blue-700 bg-blue-100 p-2 rounded-md font-semibold">Đáp án: {question.answer}</p>}
                {question.type === QuestionType.Essay && <p className="text-purple-700 bg-purple-100 p-2 rounded-md font-semibold">Gợi ý đáp án: {question.answer}</p>}
            </div>
        </div>
    );
};

const DisplayPanel: React.FC<{ exam: Question[] | null; isLoading: boolean; error: string | null; handleExport: () => void }> = ({ exam, isLoading, error, handleExport }) => {
    const renderContent = () => {
        if (isLoading) return <div className="text-center p-10"><div role="status" className="flex flex-col items-center justify-center gap-4"><svg aria-hidden="true" className="w-12 h-12 text-gray-200 animate-spin dark:text-gray-600 fill-indigo-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5424 39.6781 93.9676 39.0409Z" fill="currentFill"/></svg><span className="text-lg font-semibold text-slate-600">AI đang làm việc...</span><p className="text-sm text-slate-500">Vui lòng chờ trong giây lát.</p></div></div>;
        if (error) return <div className="flex flex-col items-center justify-center text-center p-10 bg-red-50 border border-red-200 rounded-lg"><h3 className="text-lg font-bold text-red-700">Đã xảy ra lỗi</h3><p className="mt-2 text-red-600">{error}</p></div>;
        if (exam && exam.length > 0) return <div className="space-y-6"><div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">Đề thi đã tạo</h2><button onClick={handleExport} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300 flex items-center gap-2 text-sm"><IconDownload /> Xuất ra Word</button></div>{exam.map((q, index) => <QuestionCard key={q.id} question={q} index={index}/>)}</div>;
        return <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-100/80 border-2 border-dashed border-slate-300 rounded-2xl h-full"><h3 className="text-xl font-semibold text-slate-600">Sẵn sàng để tạo đề thi</h3><p className="mt-2 max-w-md text-slate-500">Tải lên tài liệu và cấu hình các loại câu hỏi, sau đó nhấn "Tạo Đề Thi" để bắt đầu.</p></div>;
    };
    return <div className="w-full h-full bg-slate-200/60 rounded-2xl p-6">{renderContent()}</div>;
};

// --- Main App Component ---
export default function App() {
    const [sourceText, setSourceText] = useState('');
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [parsingProgress, setParsingProgress] = useState<number | null>(null);
    const [config, setConfig] = useState<ExamConfig>({
        [QuestionType.MultipleChoice]: {
            [CognitiveLevel.Knowledge]: 2,
            [CognitiveLevel.Comprehension]: 0,
            [CognitiveLevel.Application]: 0,
        },
        [QuestionType.TrueFalse]: {
            [CognitiveLevel.Knowledge]: 1,
            [CognitiveLevel.Comprehension]: 0,
            [CognitiveLevel.Application]: 0,
        },
        [QuestionType.ShortAnswer]: {
            [CognitiveLevel.Knowledge]: 1,
            [CognitiveLevel.Comprehension]: 0,
            [CognitiveLevel.Application]: 0,
        },
        [QuestionType.Essay]: {
            [CognitiveLevel.Knowledge]: 0,
            [CognitiveLevel.Comprehension]: 0,
            [CognitiveLevel.Application]: 0,
        },
    });
    const [exam, setExam] = useState<Question[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateExam = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setExam(null);
        try {
            const generatedQuestions = await generateExam(sourceText, config);
            setExam(generatedQuestions);
        } catch (e) {
            // FIX: Safely handle the error object by checking its instance type.
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [sourceText, config]);

    const handleExportToWord = useCallback(() => {
        if (!exam) return;

        const docx = (window as any).docx;
        if (!docx) {
            setError("Không thể xuất file Word. Thư viện 'docx' chưa được tải. Vui lòng kiểm tra kết nối mạng và thử làm mới trang.");
            console.error("Error: window.docx is not defined. The docx library may have failed to load.");
            return;
        }

        const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;
        
        const formatQuestion = (q: Question, index: number) => {
            const children = [
                new TextRun({ text: `${index + 1}. `, bold: true }),
                new TextRun({ text: `(${cognitiveLevelLabels[q.level]}) `, italics: true }),
                new TextRun({ text: q.question, bold: true })
            ];
            
            if (q.type === QuestionType.MultipleChoice && (q as MultipleChoiceQuestion).options) {
                (q as MultipleChoiceQuestion).options.forEach((opt, i) => {
                    children.push(new TextRun({ text: `\n${String.fromCharCode(65 + i)}. ${opt}`, break: 1, indent: { left: 720 } }));
                });
            } else if (q.type === QuestionType.TrueFalse && (q as TrueFalseQuestion).statements) {
                 (q as TrueFalseQuestion).statements.forEach((stmt, i) => {
                    children.push(new TextRun({ text: `\n${i+1}. ${stmt.statement}`, break: 1, indent: { left: 720 } }));
                });
            }
            return new Paragraph({ children, spacing: { after: 200 } });
        };
        
        const getAnswer = (q: Question, index: number) => {
             let answerText = `${index + 1}. `;
             if (q.type === QuestionType.MultipleChoice) {
                const mcq = q as MultipleChoiceQuestion;
                const correctIndex = mcq.options.findIndex(opt => opt === mcq.answer);
                answerText += correctIndex > -1 ? String.fromCharCode(65 + correctIndex) : 'N/A';
             } else if (q.type === QuestionType.TrueFalse) {
                const tfq = q as TrueFalseQuestion;
                answerText += tfq.statements.map(s => s.answer ? 'Đ' : 'S').join(' - ');
             } else {
                answerText += q.answer || 'N/A';
             }
             return new Paragraph(answerText);
        }

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: "ĐỀ THI", heading: "Heading1", alignment: AlignmentType.CENTER }),
                    ...exam.flatMap((q, i) => [formatQuestion(q, i)]),
                    new Paragraph({ text: "ĐÁP ÁN", heading: "Heading1", alignment: AlignmentType.CENTER, pageBreakBefore: true }),
                    ...exam.map((q, i) => getAnswer(q, i))
                ],
            }],
        });

        Packer.toBlob(doc).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "de-thi.docx";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        });

    }, [exam, setError]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">AI RA ĐỀ THEO YÊU CẦU (THẦY LUNG)</h1>
                <p className="mt-2 text-lg text-slate-500">Tạo đề thi tự động với sức mạnh của AI</p>
            </header>
            <main className="flex flex-col lg:flex-row gap-8 max-w-screen-xl mx-auto">
                <ConfigPanel
                    sourceText={sourceText}
                    setSourceText={setSourceText}
                    config={config}
                    setConfig={setConfig}
                    onGenerate={handleGenerateExam}
                    isLoading={isLoading}
                    sourceFile={sourceFile}
                    setSourceFile={setSourceFile}
                    parsingProgress={parsingProgress}
                    setParsingProgress={setParsingProgress}
                    setError={setError}
                />
                <div className="flex-1">
                    <DisplayPanel
                        exam={exam}
                        isLoading={isLoading}
                        error={error}
                        handleExport={handleExportToWord}
                    />
                </div>
            </main>
        </div>
    );
}
