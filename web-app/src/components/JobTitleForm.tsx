'use client';

import { useState, useEffect } from 'react';

export default function JobTitleForm() {
    const [jobTitle, setJobTitle] = useState('');
    const [currentJobTitle, setCurrentJobTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCurrentJobTitle();
    }, []);

    const fetchCurrentJobTitle = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            
            if (response.ok && data.users && data.users.length > 0) {
                // Find user with static email
                const user = data.users.find((u: { email: string; }) => u.email === 'static@email.com');
                if (user && user.job) {
                    setCurrentJobTitle(user.job);
                    setJobTitle(user.job); // Pre-fill form with current job
                }
            }
        } catch (error) {
            console.error('Failed to fetch current job title:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!jobTitle.trim()) {
            setError('Please enter a job title');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch('/api/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ job: jobTitle.trim() }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Your job title has been saved.');
                setCurrentJobTitle(jobTitle.trim());
            } else {
                setError(data.error || 'Failed to save job title');
            }
        } catch {
            setError('Unable to connect to database. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-black mb-4">Job Title</h2>
            
            {/* Show current job title if it exists */}
            {currentJobTitle && (
                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">Current job title:</p>
                    <p className="font-semibold text-blue-900">{currentJobTitle}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-900 mb-1">
                        Enter your job title:
                    </label>
                    <input
                        type="text"
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="e.g., Software Developer"
                        className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? 'Saving...' : 'Save Job Title'}
                </button>
            </form>

            {/* Success message */}
            {message && (
                <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                    {message}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                </div>
            )}
        </div>
    );
}