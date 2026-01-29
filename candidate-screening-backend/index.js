import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import Application from './models/Application.js';
import upload from './middlewares/upload.js';
import supabase from './lib/supabase.js';

dotenv.config();

const app = express();
const PORT = 5050;

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());

// =======================
// Optional: clean temp uploads on start
// =======================
const uploadsDir = path.join(process.cwd(), 'uploads');
if (fs.existsSync(uploadsDir)) {
  fs.readdirSync(uploadsDir).forEach(file => {
    fs.unlinkSync(path.join(uploadsDir, file));
  });
  console.log('🧹 Cleaned uploads directory');
}

// =======================
// Health check
// =======================
app.get('/', (req, res) => {
  res.status(200).json({ ok: true, message: 'Backend is running' });
});

// =======================
// Submit Application
// =======================
app.post(
  '/applications',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'roleSpecificFile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const resumeFile = req.files?.resume?.[0];
      const roleSpecificFile = req.files?.roleSpecificFile?.[0];

      if (!resumeFile) {
        return res.status(400).json({ error: 'Resume is required' });
      }

      // =======================
      // Upload RESUME (PRIVATE)
      // =======================
      const resumeBuffer = fs.readFileSync(resumeFile.path);
      const resumePath = `resumes/${Date.now()}-${resumeFile.originalname}`;

      const { error: resumeError } = await supabase.storage
        .from('resumes')
        .upload(resumePath, resumeBuffer, {
          contentType: resumeFile.mimetype,
        });

      if (resumeError) throw resumeError;

      // =======================
      // Upload ROLE FILE (optional)
      // =======================
      let roleSpecificFilePath = null;

      if (roleSpecificFile) {
        const roleBuffer = fs.readFileSync(roleSpecificFile.path);
        roleSpecificFilePath = `role-files/${Date.now()}-${roleSpecificFile.originalname}`;

        const { error: roleError } = await supabase.storage
          .from('resumes')
          .upload(roleSpecificFilePath, roleBuffer, {
            contentType: roleSpecificFile.mimetype,
          });

        if (roleError) throw roleError;
      }

      // =======================
      // Save to MongoDB (PATHS ONLY)
      // =======================
      const application = new Application({
        ...req.body,
        resumePath: resumePath,
        roleSpecificFilePath: roleSpecificFilePath,
      });

      await application.save();

      // =======================
      // Cleanup local temp files
      // =======================
      fs.unlinkSync(resumeFile.path);
      if (roleSpecificFile) fs.unlinkSync(roleSpecificFile.path);

      res.status(201).json({
        message: 'Application submitted successfully',
        id: application._id,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// =======================
// Get Resume (SIGNED URL)
// =======================
app.get('/applications/:id/resume', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const { data, error } = await supabase.storage
      .from('resumes')
      .createSignedUrl(application.resumePath, 60 * 10); // 10 minutes

    if (error) throw error;

    res.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Start server
// =======================
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});

// =======================
// MongoDB connection
// =======================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));