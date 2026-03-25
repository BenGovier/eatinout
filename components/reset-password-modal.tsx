import React from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ResetPasswordModal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded shadow-lg w-96 h-auto">
                <div className="text-center">
                    <h1 className="text-green-500 text-3xl mb-4">✅</h1>
                    <h2 className="text-xl font-bold mb-4 text-green-500">Password Changed</h2>
                    <p className="mb-4">Your password has been reset successfully.</p>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="mr-2 bg-gray-300 text-black py-2 px-4 rounded hover:bg-gray-400"
                    >
                        Close
                    </button>
                    <button
                        onClick={onConfirm}
                        className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
                    >
                        Go to Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordModal;