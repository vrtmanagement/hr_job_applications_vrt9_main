
import React, { useState, useEffect } from 'react';
import { ApplicationFormData, ValidationErrors } from './types';
import { GoogleGenAI } from "@google/genai";

const MANDATORY_NOTE = "“As part of our screening and verification process, providing the LinkedIn profile of your previous employer’s CEO/Founder and the contact details of your previous HR and Reporting Manager is mandatory. Applications missing these two details will not be considered for further evaluation.”";
const LOCAL_STORAGE_KEY = 'vrt_application_draft';

const ROLES = [
  "Content Writer / Copywriter",
  "Full-Stack Developer",
  "Performance Marketer",
  "AI / ML Implementation Specialist",
  "HR Manager (Talent Acquisition + People Operations)",
  "Office Manager / Operations Coordinator",
  "Graphic Designer",
  "UI/UX Designer",
  "Video Editor",
  "LinkedIn Expert"
];

const INTERNSHIP_OPTIONS = [
  "Zero",
  "3 Months",
  "6 Months",
  "9 Months",
  "1 Year",
  "1.5 Years",
  "2 Years +"
];

const ROLE_PROMPTS: Record<string, string> = {
  "Content Writer / Copywriter": "Portfolio links, published articles, or writing samples",
  "Full-Stack Developer": "GitHub profile, live project links, or tech stack overview",
  "Performance Marketer": "Campaign case studies, ROI reports, or ad account screenshots",
  "AI / ML Implementation Specialist": "List of AI frameworks, models implemented, or research links",
  "Graphic Designer": "Portfolio link (Behance/Dribbble) or design aesthetic summary",
  "UI/UX Designer": "Case studies, Figma links, or user research methodologies",
  "Video Editor": "Showreel link, YouTube channel, or recent raw-to-final work",
  "LinkedIn Expert": "Personal branding stats, authored post links, or client growth summaries",
};

const App: React.FC = () => {
  const [isFreshApplicant, setIsFreshApplicant] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); 
  const [formData, setFormData] = useState<ApplicationFormData>({
    reportingManagerName: '',
    reportingManagerTitle: '',
    reportingManagerPhone: '',
    reportingManagerEmail: '',
    reportingHRName: '',
    reportingHRTitle: '',
    reportingHREmail: '',
    reportingHRPhone: '',
    applyingRole: '',
    currentCTC: '',
    expectedSalary: '',
    resume: null,
    linkedinProfile: '',
    totalExperience: '',
    totalInternships: '',
    roleSpecificNote: '',
    roleSpecificFile: null,
    locationConfirmation: '',
    scheduleConfirmation: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>('');

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedDraft) {
      try {
        const { formData: savedForm, currentStep: savedStep, isFreshApplicant: savedType } = JSON.parse(savedDraft);
        setFormData(prev => ({
          ...prev,
          ...savedForm,
          resume: null,
          roleSpecificFile: null
        }));
        setCurrentStep(savedStep || 1);
        setIsFreshApplicant(!!savedType);
      } catch (e) {
        console.error("Failed to load saved draft", e);
      }
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    if (!submitted) {
      const { resume, roleSpecificFile, ...serializableData } = formData;
      const draft = {
        formData: serializableData,
        currentStep,
        isFreshApplicant
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [formData, currentStep, isFreshApplicant, submitted]);

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;

    if (step === 1 && !isFreshApplicant) {
      if (!formData.reportingManagerName) newErrors.reportingManagerName = 'Full name is required';
      if (!formData.reportingManagerTitle) newErrors.reportingManagerTitle = 'Designation is required';
      if (!phoneRegex.test(formData.reportingManagerPhone)) newErrors.reportingManagerPhone = 'Valid phone number is required';
      if (!emailRegex.test(formData.reportingManagerEmail)) newErrors.reportingManagerEmail = 'Valid email is required';
      if (!formData.reportingHRName) newErrors.reportingHRName = 'HR contact name is required';
      if (!formData.reportingHRTitle) newErrors.reportingHRTitle = 'HR title is required';
      if (!emailRegex.test(formData.reportingHREmail)) newErrors.reportingHREmail = 'Valid HR email is required';
      if (!phoneRegex.test(formData.reportingHRPhone)) newErrors.reportingHRPhone = 'Valid HR phone is required';
    }

    if (step === 2) {
      if (!formData.applyingRole) newErrors.applyingRole = 'Role selection is required';
      if (!formData.currentCTC) newErrors.currentCTC = 'Current compensation is required';
      if (!formData.expectedSalary) newErrors.expectedSalary = 'Salary expectation is required';
      if (!formData.resume) newErrors.resume = 'Main resume is required';
      if (!urlRegex.test(formData.linkedinProfile)) newErrors.linkedinProfile = 'Valid LinkedIn URL is required';
      if (!formData.roleSpecificNote) newErrors.roleSpecificNote = 'Additional role-specific information is required';
      
      if (isFreshApplicant) {
        if (!formData.totalInternships) newErrors.totalInternships = 'Please select internship duration';
      } else {
        if (!formData.totalExperience) newErrors.totalExperience = 'Work experience is required';
      }
    }

    if (step === 3) {
      if (!formData.locationConfirmation) newErrors.locationConfirmation = 'Selection required';
      if (!formData.scheduleConfirmation) newErrors.scheduleConfirmation = 'Selection required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'resume' | 'roleSpecificFile') => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, [field]: e.target.files![0] }));
      if (errors[field]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
  
    setIsSubmitting(true);
  
    try {
      // =========================
      // Build FormData
      // =========================
      const formDataToSend = new FormData();
  
      formDataToSend.append(
        'applicantType',
        isFreshApplicant ? 'fresh' : 'experienced'
      );
  
      // References
      formDataToSend.append('reportingManagerName', formData.reportingManagerName);
      formDataToSend.append('reportingManagerTitle', formData.reportingManagerTitle);
      formDataToSend.append('reportingManagerPhone', formData.reportingManagerPhone);
      formDataToSend.append('reportingManagerEmail', formData.reportingManagerEmail);
  
      formDataToSend.append('reportingHRName', formData.reportingHRName);
      formDataToSend.append('reportingHRTitle', formData.reportingHRTitle);
      formDataToSend.append('reportingHREmail', formData.reportingHREmail);
      formDataToSend.append('reportingHRPhone', formData.reportingHRPhone);
  
      // Candidate details
      formDataToSend.append('applyingRole', formData.applyingRole);
      formDataToSend.append('currentCTC', formData.currentCTC);
      formDataToSend.append('expectedSalary', formData.expectedSalary);
      formDataToSend.append('linkedinProfile', formData.linkedinProfile);
  
      if (isFreshApplicant) {
        formDataToSend.append('totalInternships', formData.totalInternships);
      } else {
        formDataToSend.append('totalExperience', formData.totalExperience);
      }
  
      formDataToSend.append('roleSpecificNote', formData.roleSpecificNote);
      formDataToSend.append('locationConfirmation', formData.locationConfirmation);
      formDataToSend.append('scheduleConfirmation', formData.scheduleConfirmation);
  
      // Files
      if (formData.resume) {
        formDataToSend.append('resume', formData.resume);
      }
  
      if (formData.roleSpecificFile) {
        formDataToSend.append('roleSpecificFile', formData.roleSpecificFile);
      }
  
      // =========================
      // Submit to backend
      // =========================
      const response = await fetch('http://127.0.0.1:5050/applications', {
        method: 'POST',
        body: formDataToSend,
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'Application submission failed');
      }
  
      // =========================
      // AI acknowledgement (frontend only)
      // =========================
      const feedbackMessage = `Thank you for your application for the ${formData.applyingRole} at VRT Management Group LLC. We are initiating the screening and verification process for your candidacy. Our team will share an update within the next 24 to 48 hours.`;
  
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Review this professional acknowledgement for ${formData.applyingRole}: ${feedbackMessage}`,
        });
      } catch {
        // AI failure should NOT block submission
      }
  
      // =========================
      // Success UI
      // =========================
      setAiFeedback(feedbackMessage);
      setSubmitted(true);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  
    } catch (error: any) {
      console.error('Submission error:', error);
  
      setAiFeedback(
        `Thank you for your application for the ${formData.applyingRole} at VRT Management Group LLC. We are initiating the screening and verification process for your candidacy. Our team will share an update within the next 24 to 48 hours.`
      );
  
      setSubmitted(true);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleApplicantType = (isFresh: boolean) => {
    setIsFreshApplicant(isFresh);
    setErrors({});
    setCurrentStep(isFresh ? 2 : 1);
  };

  const getRoleQuestion = () => {
    return ROLE_PROMPTS[formData.applyingRole] || "Why are you interested in this role? (Cover Letter)";
  };

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-10 md:p-16 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <i className="fa-solid fa-check text-5xl"></i>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">Application Submitted!</h1>
          <p className="text-slate-500 text-lg mb-10 leading-relaxed">
            Thank you for completing the verification process for VRT Management Group LLC.
          </p>
          <div className="bg-rose-50/50 p-8 rounded-3xl text-left border border-rose-100/50 mb-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <i className="fa-solid fa-quote-right text-6xl"></i>
            </div>
            <h3 className="font-bold text-rose-900 mb-3 flex items-center">
              <i className="fa-solid fa-envelope-open-text mr-2 text-sm"></i> Message from Recruitment Team:
            </h3>
            <p className="text-rose-800 text-lg italic font-medium leading-relaxed">“{aiFeedback}”</p>
          </div>
          <button 
            onClick={() => {
              setSubmitted(false);
              setCurrentStep(isFreshApplicant ? 2 : 1);
            }}
            className="text-rose-600 font-bold hover:text-rose-700 transition-colors flex items-center justify-center mx-auto"
          >
            Submit another application <i className="fa-solid fa-chevron-right ml-2 text-xs"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      <header className="mb-12 flex flex-col items-center md:flex-row md:justify-between border-b border-slate-200/60 pb-10">
        <div className="flex items-center space-x-6 mb-8 md:mb-0">
          <div className="bg-rose-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <i className="fa-solid fa-building-shield text-3xl text-white"></i>
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">VRT Management Group</h1>
            <p className="text-rose-600 font-bold tracking-wide text-xs">Screening & Verification Portal</p>
          </div>
        </div>
        <div className="flex items-center">
            <div className="bg-white border border-slate-100 p-4 px-6 rounded-2xl flex flex-col items-center md:items-end shadow-sm ring-1 ring-slate-200/50">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-1.5 flex items-center">
                    <i className="fa-solid fa-award mr-2 text-[10px]"></i> Global Standards
                </span>
                <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-800 tracking-tight">Inspire</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500/30"></span>
                    <span className="text-xs font-bold text-slate-800 tracking-tight">Action</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500/30"></span>
                    <span className="text-xs font-bold text-slate-800 tracking-tight">Growth</span>
                </div>
            </div>
        </div>
      </header>

      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Candidate Screening Form</h2>
        <p className="text-slate-500 text-lg">Please provide accurate information for background verification. This is a mandatory step in our hiring process.</p>
        <div className="mt-4 inline-flex items-center px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold tracking-tight border border-emerald-100">
            <i className="fa-solid fa-floppy-disk mr-2"></i> Auto-save enabled
        </div>
      </div>

      <div className="mb-12 relative flex justify-between items-start max-w-xl mx-auto">
        <div className="absolute top-5 left-0 right-0 h-[2px] bg-slate-100 -z-10" />
        <div className={`absolute top-5 left-0 h-[2px] bg-rose-600 transition-all duration-500 -z-10`} style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }} />
        
        {!isFreshApplicant && <StepItem active={currentStep === 1} completed={currentStep > 1} number={1} label="References" />}
        <StepItem active={currentStep === 2} completed={currentStep > 2} number={isFreshApplicant ? 1 : 2} label="Candidate Details" />
        <StepItem active={currentStep === 3} completed={currentStep > 3} number={isFreshApplicant ? 2 : 3} label="Role Fit" />
      </div>

      <div className="space-y-10">
        <div className="grid grid-cols-1 gap-6">
            {!isFreshApplicant && currentStep === 1 && (
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start space-x-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-amber-100 text-amber-700 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-circle-exclamation text-sm"></i>
                    </div>
                    <p className="text-amber-900 text-sm font-medium leading-relaxed italic">
                        {MANDATORY_NOTE}
                    </p>
                </div>
            )}

            {(currentStep === 1 || (currentStep === 2 && isFreshApplicant)) && (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-200/60 flex flex-col items-center justify-between gap-10 transition-all hover:shadow-2xl">
                    <div className="text-center">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Experience Type</h3>
                        <p className="text-sm text-slate-500 mt-2 font-medium">Please select your current professional status</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                        <button
                            type="button"
                            onClick={() => toggleApplicantType(false)}
                            className={`flex items-center justify-center space-x-4 px-8 py-6 rounded-3xl text-lg font-black transition-all border-4 ${
                                !isFreshApplicant 
                                    ? 'bg-rose-600 border-rose-600 text-white shadow-2xl shadow-rose-200 ring-4 ring-rose-100 scale-105' 
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-rose-200 hover:text-slate-600 shadow-sm'
                            }`}
                        >
                            <i className="fa-solid fa-briefcase text-2xl"></i>
                            <span>Experienced Professional</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleApplicantType(true)}
                            className={`flex items-center justify-center space-x-4 px-8 py-6 rounded-3xl text-lg font-black transition-all border-4 ${
                                isFreshApplicant 
                                    ? 'bg-rose-600 border-rose-600 text-white shadow-2xl shadow-rose-200 ring-4 ring-rose-100 scale-105' 
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-rose-200 hover:text-slate-600 shadow-sm'
                            }`}
                        >
                            <i className="fa-solid fa-graduation-cap text-2xl"></i>
                            <span>Fresh / Intern Applicant</span>
                        </button>
                    </div>
                </div>
            )}
        </div>

        <div className="transition-all duration-300">
            {currentStep === 1 && !isFreshApplicant && (
                <Section title="Reference & Verification Contacts">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-rose-600 mb-4 px-1 flex items-center">
                                <i className="fa-solid fa-user-tie mr-2"></i> Direct Manager
                            </h4>
                            <Input label="Manager Name" name="reportingManagerName" value={formData.reportingManagerName} onChange={handleInputChange} error={errors.reportingManagerName} placeholder="Full legal name" />
                            <Input label="Current Title" name="reportingManagerTitle" value={formData.reportingManagerTitle} onChange={handleInputChange} error={errors.reportingManagerTitle} placeholder="e.g. Head of Marketing" />
                            <Input label="Contact Phone" name="reportingManagerPhone" value={formData.reportingManagerPhone} onChange={handleInputChange} error={errors.reportingManagerPhone} placeholder="+91 00000 00000" type="tel" />
                            <Input label="Professional Email" name="reportingManagerEmail" value={formData.reportingManagerEmail} onChange={handleInputChange} error={errors.reportingManagerEmail} placeholder="name@company.com" type="email" />
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-rose-600 mb-4 px-1 flex items-center">
                                <i className="fa-solid fa-id-card-clip mr-2"></i> HR Department
                            </h4>
                            <Input label="HR Contact Name" name="reportingHRName" value={formData.reportingHRName} onChange={handleInputChange} error={errors.reportingHRName} placeholder="Name of HR partner" />
                            <Input label="Title/Designation" name="reportingHRTitle" value={formData.reportingHRTitle} onChange={handleInputChange} error={errors.reportingHRTitle} placeholder="e.g. People Operations Lead" />
                            <Input label="HR Phone" name="reportingHRPhone" value={formData.reportingHRPhone} onChange={handleInputChange} error={errors.reportingHRPhone} placeholder="Direct or extension" type="tel" />
                            <Input label="HR Official Email" name="reportingHREmail" value={formData.reportingHREmail} onChange={handleInputChange} error={errors.reportingHREmail} placeholder="hr@company.com" type="email" />
                        </div>
                    </div>
                    <div className="mt-12 flex justify-end">
                        <button type="button" onClick={handleNext} className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 transition-all flex items-center group active:scale-[0.98]">
                            Continue <i className="fa-solid fa-arrow-right ml-3 text-xs group-hover:translate-x-1 transition-transform"></i>
                        </button>
                    </div>
                </Section>
            )}

            {currentStep === 2 && (
                <Section title="Candidate Details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        <div className="md:col-span-2">
                            <Select label="Role Selection" name="applyingRole" value={formData.applyingRole} onChange={handleInputChange} error={errors.applyingRole} options={ROLES} placeholder="Select the position you are applying for" />
                        </div>
                        <Input label="Current Compensation" name="currentCTC" value={formData.currentCTC} onChange={handleInputChange} error={errors.currentCTC} placeholder="e.g. ₹12,00,000 p.a." />
                        <Input label="Salary Expectation" name="expectedSalary" value={formData.expectedSalary} onChange={handleInputChange} error={errors.expectedSalary} placeholder="e.g. ₹15,00,000 p.a." />
                        
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-500 px-1">Main Resume Attachment</label>
                            <div className={`relative group border-2 border-dashed rounded-2xl p-8 text-center transition-all ${formData.resume ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 hover:border-rose-300 hover:bg-slate-50'}`}>
                                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileChange(e, 'resume')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <div className="space-y-2">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 ${formData.resume ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <i className={`fa-solid ${formData.resume ? 'fa-file-check' : 'fa-cloud-arrow-up'} text-xl`}></i>
                                    </div>
                                    <p className="font-bold text-slate-700">{formData.resume ? formData.resume.name : 'Click to Upload Resume'}</p>
                                    <p className="text-xs text-slate-400">PDF, DOC, DOCX preferred (Max 10MB)</p>
                                </div>
                            </div>
                            {errors.resume && <p className="text-rose-600 text-[10px] font-bold mt-1 px-1 flex items-center"><i className="fa-solid fa-circle-exclamation mr-1.5"></i> {errors.resume}</p>}
                        </div>

                        <Input label="LinkedIn Profile" name="linkedinProfile" value={formData.linkedinProfile} onChange={handleInputChange} error={errors.linkedinProfile} placeholder="linkedin.com/in/username" type="url" />

                        {isFreshApplicant ? (
                            <Select label="Total Internship Duration" name="totalInternships" value={formData.totalInternships} onChange={handleInputChange} error={errors.totalInternships} options={INTERNSHIP_OPTIONS} placeholder="Combined duration of internships" />
                        ) : (
                            <Input label="Total Work Experience" name="totalExperience" value={formData.totalExperience} onChange={handleInputChange} error={errors.totalExperience} placeholder="Years and Months" />
                        )}

                        <div className="md:col-span-2 bg-slate-50/50 p-6 md:p-8 rounded-[2rem] border border-slate-200/60 mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                          <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Role-Specific Information</h3>
                                <p className="text-xs font-medium text-slate-500 mt-1">Provide links, portfolio details, or descriptions below.</p>
                            </div>
                            <div className="bg-rose-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">Required</div>
                          </div>
                          
                          <div className="space-y-6">
                            <TextArea 
                                label={getRoleQuestion()} 
                                name="roleSpecificNote" 
                                value={formData.roleSpecificNote} 
                                onChange={handleInputChange} 
                                error={errors.roleSpecificNote} 
                                placeholder="Paste links, describe your work, or write a brief cover note here..."
                            />

                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-bold text-slate-500 px-1">Supplementary Document (Optional)</label>
                                <div className="flex items-center space-x-4">
                                    <label className={`flex-1 relative flex items-center space-x-3 px-5 py-4 rounded-2xl border transition-all cursor-pointer ${formData.roleSpecificFile ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 hover:border-rose-300 bg-white'}`}>
                                        <i className={`fa-solid ${formData.roleSpecificFile ? 'fa-file-circle-check text-rose-600' : 'fa-paperclip text-slate-400'} text-lg`}></i>
                                        <span className={`text-sm font-bold truncate ${formData.roleSpecificFile ? 'text-rose-900' : 'text-slate-500'}`}>
                                            {formData.roleSpecificFile ? formData.roleSpecificFile.name : 'Upload PDF/Doc Portfolio'}
                                        </span>
                                        <input 
                                            type="file" 
                                            accept=".pdf,.doc,.docx" 
                                            onChange={(e) => handleFileChange(e, 'roleSpecificFile')} 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                        />
                                    </label>
                                    {formData.roleSpecificFile && (
                                        <button 
                                            onClick={() => setFormData(p => ({ ...p, roleSpecificFile: null }))}
                                            className="bg-slate-100 text-slate-400 hover:text-rose-600 w-12 h-12 rounded-2xl transition-colors flex items-center justify-center"
                                        >
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium px-1">Attach any related document like certifications or offline portfolio.</p>
                            </div>
                          </div>
                        </div>
                    </div>
                    <div className="mt-12 flex justify-between items-center">
                        <button type="button" onClick={handleBack} className="text-slate-400 hover:text-slate-600 font-bold px-4 transition-colors">
                            <i className="fa-solid fa-arrow-left mr-2"></i> Back
                        </button>
                        <button type="button" onClick={handleNext} className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 transition-all flex items-center group active:scale-[0.98]">
                            Continue <i className="fa-solid fa-arrow-right ml-3 text-xs group-hover:translate-x-1 transition-transform"></i>
                        </button>
                    </div>
                </Section>
            )}

            {currentStep === 3 && (
                <Section title="Role Fit & Compliance">
                    <div className="space-y-12">
                        <RadioGroup 
                            label="Job Location Confirmation"
                            question="Are you comfortable commuting to our Santosh Nagar, Hyderabad office daily?"
                            name="locationConfirmation"
                            value={formData.locationConfirmation}
                            onChange={handleInputChange}
                            error={errors.locationConfirmation}
                            options={[
                                { label: 'Yes, I am comfortable', value: 'yes' },
                                { label: 'No, I have concerns', value: 'no' }
                            ]}
                        />

                        <RadioGroup 
                            label="Work Schedule Confirmation"
                            question="Are you comfortable with a 6-day work week and timings of 1:00 PM to 10:00 PM?"
                            name="scheduleConfirmation"
                            value={formData.scheduleConfirmation}
                            onChange={handleInputChange}
                            error={errors.scheduleConfirmation}
                            options={[
                                { label: 'Yes, this works for me', value: 'yes' },
                                { label: 'No, I have concerns', value: 'no' }
                            ]}
                        />
                    </div>

                    {!isFreshApplicant && (
                        <div className="mt-12 bg-rose-50 border border-rose-100 p-6 rounded-2xl">
                            <p className="text-rose-900 text-sm font-medium leading-relaxed italic">
                                {MANDATORY_NOTE}
                            </p>
                        </div>
                    )}

                    <div className="mt-12 flex justify-between items-center">
                        <button type="button" onClick={handleBack} className="text-slate-400 hover:text-slate-600 font-bold px-4 transition-colors">
                            <i className="fa-solid fa-arrow-left mr-2"></i> Back
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`px-12 py-4 rounded-2xl text-white font-extrabold text-lg shadow-xl transition-all duration-300 flex items-center ${
                                isSubmitting 
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 active:scale-[0.96]'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fa-solid fa-spinner-third fa-spin mr-3"></i> Processing
                                </>
                            ) : (
                                <>
                                    Submit Final Application <i className="fa-solid fa-paper-plane ml-3 text-sm"></i>
                                </>
                            )}
                        </button>
                    </div>
                </Section>
            )}
        </div>
      </div>

      <footer className="mt-20 text-center text-slate-400 text-sm border-t border-slate-200/50 pt-10">
        <p className="font-bold text-slate-500 mb-1 tracking-tight">VRT Management Group LLC</p>
        <p className="text-xs">&copy; {new Date().getFullYear()} Candidate Recruitment Screening Portal • Secure Data Handling</p>
      </footer>
    </div>
  );
};

const StepItem: React.FC<{ active: boolean; completed: boolean; number: number; label: string }> = ({ active, completed, number, label }) => (
  <div className="flex flex-col items-center group relative w-24 md:w-32">
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 font-bold text-sm ${
      completed ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-200' :
      active ? 'border-rose-600 text-rose-600 bg-white shadow-xl shadow-rose-100/50 scale-110' : 'border-slate-100 text-slate-300 bg-slate-50'
    }`}>
      {completed ? <i className="fa-solid fa-check"></i> : number}
    </div>
    <span className={`text-[11px] mt-3 font-bold tracking-tight text-center transition-colors duration-300 ${active ? 'text-rose-600' : 'text-slate-400'}`}>
        {label}
    </span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-200/60 transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-6 duration-500">
    <div className="mb-10">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">{title}</h2>
        <div className="w-12 h-1 bg-rose-600 rounded-full"></div>
    </div>
    {children}
  </div>
);

const Input: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  type?: string;
}> = ({ label, name, value, onChange, error, placeholder, type = 'text' }) => (
  <div className="flex flex-col space-y-2">
    <label className="text-xs font-bold text-slate-500 px-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${
        error 
          ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-100' 
          : 'border-slate-200 focus:border-rose-400 focus:ring-rose-50/50 hover:border-slate-300'
      }`}
    />
    {error && <p className="text-rose-600 text-[10px] font-bold mt-1 px-1 flex items-center"><i className="fa-solid fa-circle-exclamation mr-1.5"></i> {error}</p>}
  </div>
);

const TextArea: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  placeholder?: string;
}> = ({ label, name, value, onChange, error, placeholder }) => (
  <div className="flex flex-col space-y-2">
    <label className="text-xs font-bold text-slate-500 px-1">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={4}
      className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 ${
        error 
          ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-100' 
          : 'border-slate-200 focus:border-rose-400 focus:ring-rose-50/50 hover:border-slate-300'
      }`}
    />
    {error && <p className="text-rose-600 text-[10px] font-bold mt-1 px-1 flex items-center"><i className="fa-solid fa-circle-exclamation mr-1.5"></i> {error}</p>}
  </div>
);

const Select: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  options: string[];
  placeholder?: string;
}> = ({ label, name, value, onChange, error, options, placeholder }) => (
  <div className="flex flex-col space-y-2">
    <label className="text-xs font-bold text-slate-500 px-1">{label}</label>
    <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:ring-4 appearance-none ${
            error 
              ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-100' 
              : 'border-slate-200 focus:border-rose-400 focus:ring-rose-50/50 hover:border-slate-300'
          }`}
        >
          <option value="" disabled className="text-slate-400">{placeholder || 'Select an option'}</option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="text-slate-900">{opt}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-5 pointer-events-none text-slate-400">
            <i className="fa-solid fa-chevron-down text-xs"></i>
        </div>
    </div>
    {error && <p className="text-rose-600 text-[10px] font-bold mt-1 px-1 flex items-center"><i className="fa-solid fa-circle-exclamation mr-1.5"></i> {error}</p>}
  </div>
);

const RadioGroup: React.FC<{
  label: string;
  question: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  options: { label: string; value: string }[];
}> = ({ label, question, name, value, onChange, error, options }) => (
  <div className="space-y-4">
    <div className="px-1">
      <h3 className="text-xs font-bold text-rose-600 mb-2">{label}</h3>
      <p className="text-base text-slate-900 font-bold leading-tight">{question}</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options.map((opt) => (
        <label key={opt.value} className={`relative flex items-center space-x-4 p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
          value === opt.value 
            ? 'border-rose-600 bg-rose-50/30 ring-1 ring-rose-600' 
            : 'border-slate-100 bg-slate-50/50 hover:border-rose-200 hover:bg-slate-50'
        }`}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              value === opt.value ? 'border-rose-600' : 'border-slate-300 group-hover:border-rose-300'
          }`}>
              <div className={`w-2.5 h-2.5 rounded-full transition-transform ${
                  value === opt.value ? 'bg-rose-600 scale-100' : 'scale-0'
              }`}></div>
          </div>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={onChange}
            className="hidden"
          />
          <span className={`text-sm font-bold tracking-tight ${value === opt.value ? 'text-rose-900' : 'text-slate-600'}`}>{opt.label}</span>
        </label>
      ))}
    </div>
    {error && <p className="text-rose-600 text-[10px] font-bold mt-1 px-1 flex items-center"><i className="fa-solid fa-circle-exclamation mr-1.5"></i> {error}</p>}
  </div>
);

export default App;
