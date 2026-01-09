import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Beaker, CheckCircle2, ChevronRight, TestTube } from 'lucide-react';
import { Button } from '../../components/atoms/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/molecules/Card';
import { cn } from '../../lib/utils';
import { Input } from '../../components/atoms/Input';

type TestType = 'respiratory' | 'sti' | 'drug';

const TEST_TYPES = [
    {
        id: 'respiratory',
        title: 'Respiratory Panel',
        description: 'Flu, COVID-19, RSV testing',
        icon: Activity,
        color: 'text-blue-600',
        bg: 'bg-blue-100'
    },
    {
        id: 'sti',
        title: 'STI Screening',
        description: 'Confidential sexual health panel',
        icon: TestTube,
        color: 'text-rose-600',
        bg: 'bg-rose-100'
    },
    {
        id: 'drug',
        title: 'Drug Monitoring',
        description: 'Standard toxicology screening',
        icon: Beaker,
        color: 'text-amber-600',
        bg: 'bg-amber-100'
    }
];

export function RequestTest() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [selectedTest, setSelectedTest] = useState<TestType | null>(null);
    const [symptoms, setSymptoms] = useState('');

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);
    const handleSubmit = () => {
        // Simulate API call
        setTimeout(() => {
            setStep(3);
        }, 1000);
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            {/* Progress */}
            <div className="mb-8 flex items-center justify-between px-4">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                            step >= s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                            {s}
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                            {s === 1 ? 'Select Test' : s === 2 ? 'Details' : 'Confirm'}
                        </span>
                    </div>
                ))}
                {/* Connector Lines - simplified for this demo */}
            </div>

            {step === 1 && (
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-slate-900 text-center">What kind of test do you need?</h1>
                    <div className="grid gap-4">
                        {TEST_TYPES.map((test) => {
                            const Icon = test.icon;
                            return (
                                <div
                                    key={test.id}
                                    onClick={() => setSelectedTest(test.id as TestType)}
                                    className={cn(
                                        "cursor-pointer p-4 rounded-xl border-2 transition-all hover:bg-slate-50 flex items-center gap-4",
                                        selectedTest === test.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"
                                    )}
                                >
                                    <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center shrink-0", test.bg)}>
                                        <Icon className={cn("h-6 w-6", test.color)} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900">{test.title}</h3>
                                        <p className="text-sm text-slate-500">{test.description}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300" />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleNext} disabled={!selectedTest}>
                            Next Step
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Additional Details</CardTitle>
                        <CardDescription>Please provide a bit more context for the provider.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Symptoms (Optional)
                            </label>
                            <Input
                                placeholder="e.g. Cough, Fever, etc."
                                value={symptoms}
                                onChange={(e) => setSymptoms(e.target.value)}
                            />
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
                            By submitting this request, you consent to the selected testing procedure. A provider will review your request shortly.
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={handleBack}>Back</Button>
                        <Button onClick={handleSubmit}>Submit Request</Button>
                    </CardFooter>
                </Card>
            )}

            {step === 3 && (
                <Card className="text-center py-8">
                    <CardContent className="flex flex-col items-center">
                        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Submitted!</h2>
                        <p className="text-slate-500 max-w-sm mb-8">
                            Your request has been sent to the nursing team. We'll notify you when it's approved.
                        </p>
                        <Button onClick={() => navigate('/resident')}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
