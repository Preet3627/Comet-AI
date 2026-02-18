import { Card } from "@/components/ui/card";

const loading = () => {
    return (
        <div className="h-screen bg-gradient-to-b font-instrument_sans from-gray-50 to-white flex flex-col overflow-hidden">
            <main className="flex-1 container mx-auto px-4 max-w-3xl overflow-hidden flex flex-col">
                {/* Branding Header Skeleton */}
                <div className="text-center mb-2 mt-4 flex-shrink-0">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="h-12 w-12 bg-gray-200 animate-pulse rounded-md" />
                    </div>
                    <div className="h-4 w-64 bg-gray-200 animate-pulse rounded-md mx-auto" />
                </div>

                {/* Main Configuration Content Skeleton */}
                <div className="flex-1 overflow-hidden">
                    <div className="space-y-6 p-6">
                        {/* Page Title */}
                        <div className="space-y-2">
                            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded-md" />
                            <div className="h-5 w-72 bg-gray-200 animate-pulse rounded-md" />
                        </div>

                        {/* LLM Provider Cards */}
                        <div className="space-y-4">
                            {[...Array(3)].map((_, index) => (
                                <Card key={index} className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-gray-200 animate-pulse rounded-md" />
                                            <div className="space-y-1">
                                                <div className="h-5 w-32 bg-gray-200 animate-pulse rounded-md" />
                                                <div className="h-4 w-48 bg-gray-200 animate-pulse rounded-md" />
                                            </div>
                                        </div>
                                        <div className="h-6 w-6 bg-gray-200 animate-pulse rounded-full" />
                                    </div>

                                    {/* Configuration Fields */}
                                    <div className="space-y-4">
                                        {[...Array(2)].map((_, fieldIndex) => (
                                            <div key={fieldIndex} className="space-y-2">
                                                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded-md" />
                                                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Model Selection */}
                        <Card className="p-6">
                            <div className="space-y-4">
                                <div className="h-5 w-32 bg-gray-200 animate-pulse rounded-md" />
                                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
                            </div>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Fixed Bottom Button Skeleton */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
                <div className="container mx-auto max-w-3xl">
                    <div className="h-12 w-full bg-gray-200 animate-pulse rounded-lg" />
                </div>
            </div>
        </div>
    );
};

export default loading;
