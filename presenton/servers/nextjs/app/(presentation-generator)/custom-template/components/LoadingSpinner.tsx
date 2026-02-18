import React from "react";
import { Loader2 } from "lucide-react";
import Header from "@/app/(presentation-generator)/dashboard/components/Header";

interface LoadingSpinnerProps {
  message: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      <div className="flex items-center justify-center aspect-video mx-auto px-6">
        <div className="text-center space-y-2 my-6 bg-white p-6 rounded-lg shadow-md">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
          <p>{message}</p>
        </div>
      </div>
    </div>
  );
}; 