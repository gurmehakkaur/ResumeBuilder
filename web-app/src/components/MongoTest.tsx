'use client';

import { useEffect, useState } from "react";

export default function MongoTest() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Testing connection...')

    useEffect(() => {
        fetch('/api/test-db').then(res => res.json()).then(data => {
            if (data.message) {
                setStatus('success')
                setMessage(data.message);
            } else {
                setStatus('error');
                setMessage(data.error || "Unknown error");
            }
        })
            .catch(err => {
                setStatus(err);
                setMessage('Failed to test connection :(')
            })
    }, [])

    return (
        <div className="p-4 border border-gray-300 m-4 rounded">
            <h3 className="text-lg font-bold">MongoDB Connection Test</h3>
            <div className="mt-2">
                Status:
                {status === 'loading' && 'Testing ...'}
                {status === 'success' && 'Connected!'}
                {status === 'error' && 'Failed.....'}
            </div>
            <p className="mt-2 text-sm ">{message}</p>
        </div>
    )
}

