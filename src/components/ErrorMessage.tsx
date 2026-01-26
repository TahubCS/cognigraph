import { AlertCircle, XCircle } from 'lucide-react';

interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export default function ErrorMessage({ title = "Error", message, onRetry, onDismiss }: ErrorMessageProps) {
    return (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-300">{title}</h3>
                    <p className="text-sm text-red-200 mt-1">{message}</p>
                    
                    <div className="flex gap-2 mt-3">
                        {onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded-md transition-colors"
                        >
                            Try Again
                        </button>
                        )}
                        {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-md transition-colors"
                        >
                            Dismiss
                        </button>
                        )}
                    </div>
                </div>
                
                {onDismiss && (
                <button onClick={onDismiss} className="text-gray-400 hover:text-white">
                    <XCircle className="w-4 h-4" />
                </button>
                )}
            </div>
        </div>
    );
}