
export interface ApplicationFormData {
  // Section 1: Reference
  reportingManagerName: string;
  reportingManagerTitle: string;
  reportingManagerPhone: string;
  reportingManagerEmail: string;
  reportingHRName: string;
  reportingHRTitle: string;
  reportingHREmail: string;
  reportingHRPhone: string;

  // Section 2: Candidate Details
  applyingRole: string;
  currentCTC: string;
  expectedSalary: string;
  resume: File | null;
  linkedinProfile: string;
  totalExperience: string;
  totalInternships: string; 
  roleSpecificNote: string; // Dynamic field for role-specific input
  roleSpecificFile: File | null; // Optional additional document for the role

  // Section 3: Role Fit
  locationConfirmation: 'yes' | 'no' | '';
  scheduleConfirmation: 'yes' | 'no' | '';
}

export interface ValidationErrors {
  [key: string]: string;
}
