import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema(
  {
    applicantType: {
      type: String,
      enum: ['experienced', 'fresh'],
      required: true,
    },

    // Reference & Verification (Experienced only)
    reportingManagerName: String,
    reportingManagerTitle: String,
    reportingManagerPhone: String,
    reportingManagerEmail: String,

    reportingHRName: String,
    reportingHRTitle: String,
    reportingHREmail: String,
    reportingHRPhone: String,

    // Candidate Details
    applyingRole: {
      type: String,
      required: true,
    },
    currentCTC: String,
    expectedSalary: String,
    linkedinProfile: {
      type: String,
      required: true,
    },

    totalExperience: String,   // experienced
    totalInternships: String,  // fresh

    // Role-specific
    roleSpecificNote: {
      type: String,
      required: true,
    },

    // File paths (NOT files)
    resumePath: {
      type: String,
      required: true,
    },
    roleSpecificFilePath: String,

    // Role fit
    locationConfirmation: {
      type: String,
      enum: ['yes', 'no'],
      required: true,
    },
    scheduleConfirmation: {
      type: String,
      enum: ['yes', 'no'],
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
    collection: 'hr_job_application_data',
  }
);

export default mongoose.model('Application', ApplicationSchema);