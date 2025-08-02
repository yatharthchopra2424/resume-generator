import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState(``);
  const [jobDescription, setJobDescription] = useState('');
  const [resumePdfFile, setResumePdfFile] = useState<File | null>(null);
  const [llmResponse, setLlmResponse] = useState<string>('');

  const handleResumeCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!resumePdfFile) {
      setError('Please select a resume PDF file.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('jobDescription', jobDescription);
    formData.append('resumePdf', resumePdfFile);

    try {
      const response = await axios.post('/api/hackrx/create-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setLlmResponse(response.data);
    } catch (err) {
      setError('An error occurred while creating the resume.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/hackrx/update-prompt', { prompt });
      alert('Prompt updated successfully!');
    } catch (err) {
      setError('An error occurred while updating the prompt.');
      console.error(err);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>AI-Powered Resume Builder</h1>
        <form onSubmit={handlePromptChange}>
          <label htmlFor="prompt">System Prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter the system prompt"
            required
          />
          <button type="submit" className="btn btn-primary">
            Update Prompt
          </button>
        </form>
      </div>
      <div className="card">
        <h2>Create Your Resume</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleResumeCreate}>
          <label htmlFor="jobDescription">Job Description</label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Enter the job description"
            required
          />
          <label htmlFor="resumePdfFile">Resume PDF File</label>
          <input
            type="file"
            id="resumePdfFile"
            onChange={(e) => setResumePdfFile(e.target.files ? e.target.files[0] : null)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating Resume...' : 'Create Resume'}
          </button>
        </form>
        {llmResponse && (
          <div className="resume-output">
            <h2>LLM Response</h2>
            <pre>{llmResponse}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
