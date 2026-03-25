'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';

interface User {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    zipCode?: string; // added
    role: 'user' | 'restaurant' | 'admin';
    subscriptionStatus: 'active' | 'inactive' | 'cancelled';
}

export default function Profile() {
    const [user, setUser] = useState<User>({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        zipCode: '', // added
        role: 'user',
        subscriptionStatus: 'inactive'
    });

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(user);
    const [showValidationError, setShowValidationError] = useState(false);
    const router = useRouter();

    useEffect(() => {
        document.title = 'Profile';
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get('/api/profile');
                setUser(response.data);
                setFormData(response.data);
            } catch (error) {
                toast.error('Error fetching profile');
            }
        };
        fetchProfile();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowValidationError(true);

        // Validate mobile number
        // if (formData.mobile.length < 10) {
        //     return;
        // }

        try {
            const response = await axios.put('/api/profile', formData);
            setUser(response.data);
            setIsEditing(false);
            setShowValidationError(false);
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error('Error updating profile');
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <User />
                    <span>Profile</span>
                </h1>

                <button
                    onClick={() => router.push('/account')}
                    className="flex items-center gap-2 text-sm bg-red-200 text-white-800 px-3 py-1.5 rounded hover:bg-red-200 transition"
                >
                    <ArrowLeft />
                    Back to Account
                </button>
            </div>

            {!isEditing ? (
                <div className="bg-white p-6 rounded-lg shadow-md transition duration-300 ease-in-out border border-gray-200">
                    {[
                        { label: 'First Name', value: user.firstName },
                        { label: 'Last Name', value: user.lastName },
                        { label: 'Email', value: user.email },
                        // { label: 'Mobile', value: user.mobile },
                         { label: 'Zipcode', value: user.zipCode || '-' }, // added
                        { label: 'Role', value: user.role },
                        { label: 'Subscription Status', value: user.subscriptionStatus }
                    ].map((item, idx) => (
                        <div className="mb-4" key={idx}>
                            <label className="font-semibold text-gray-700">{item.label}:</label>
                            <p className={`text-gray-900 ${item.label !== 'Email' ? 'capitalize' : ''}`}>{item.value}</p>
                        </div>
                    ))}
                    <div className="text-right">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="bg-white p-6 rounded-lg shadow-md animate-fade-in border border-gray-200"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block font-semibold mb-1">First Name:</label>
                            <input
                                type="text"
                                name="firstName"
                                placeholder="your first name"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1">Last Name:</label>
                            <input
                                type="text"
                                name="lastName"
                                placeholder="your last name"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                         <div>
                            <label className="block font-semibold mb-1">Zipcode:</label>
                            <input
                                type="text"
                                name="zipCode"
                                placeholder="your zipCode"
                                value={formData.zipCode}
                                onChange={handleInputChange}
                                className="w-full p-2 border rounded"
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block font-semibold mb-1">Email:</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            required
                            disabled
                        />
                    </div>
                    {/* <div className="mt-4">
                        <label className="block font-semibold mb-1">Mobile:</label>
                        <input
                            type="tel"
                            name="mobile"
                            value={formData.mobile}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Allow only numeric values
                                if (/^\d*$/.test(value)) {
                                    handleInputChange(e);
                                }
                            }}
                            className="w-full p-2 border rounded"
                            required
                            placeholder="Enter your mobile number"
                            title="Please enter a valid mobile number"
                            maxLength={11}
                            pattern="[0-9]*"
                        />
                        {showValidationError && formData.mobile.length < 10 && (
                            <span className="text-red-500 text-xs mt-1 block">Mobile number must be at least 10 digits</span>
                        )}
                        <span className="text-xs text-gray-500 ">Preferred contact number for enquiries and bookings</span>
                    </div> */}
                    <div className="flex justify-end gap-4 mt-6">
                        <button
                            type="submit"

                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsEditing(false);
                                setFormData(user);
                                setShowValidationError(false);
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}