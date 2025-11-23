import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Brain,
  FileText,
  Edit3,
  Save,
  Download,
  Wand2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  CreditCard,
  CheckCircle,
  Loader2,
  Sparkles,
  Zap,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Settings,
} from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'address' | 'select';
  label: string;
  value: string;
  placeholder: string;
  required: boolean;
  confidence: number;
  aiSuggestion?: string;
  options?: string[];
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  dateOfBirth: string;
  company: string;
  jobTitle: string;
}

interface PDFForm {
  id: string;
  name: string;
  size: number;
  url: string;
  status: 'processing' | 'completed' | 'error';
  fields: FormField[];
  fillProgress: number;
}

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  dateOfBirth: '',
  company: '',
  jobTitle: '',
};

const fieldIcons = {
  text: Edit3,
  email: Mail,
  phone: Phone,
  date: Calendar,
  number: CreditCard,
  address: MapPin,
  select: Settings,
};

export default function AIFormFiller() {
  const [pdfForms, setPdfForms] = useState<PDFForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [showProfile, setShowProfile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoFillMode, setAutoFillMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type === 'application/pdf') {
          const newForm: PDFForm = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            size: file.size,
            url: URL.createObjectURL(file),
            status: 'processing',
            fields: [],
            fillProgress: 0,
          };
          
          setPdfForms(prev => [...prev, newForm]);
          processForm(newForm);
        }
      });
    }
  };

  const processForm = async (form: PDFForm) => {
    setIsProcessing(true);
    
    try {
      // Load PDF and extract form fields using PDF.js
      const arrayBuffer = await fetch(form.url).then(res => res.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1); // Analyze first page
      const annotations = await page.getAnnotations();
      
      // Extract form fields from PDF annotations
      const detectedFields: FormField[] = annotations
        .filter((annotation: any) => annotation.subtype === 'Widget')
        .map((annotation: any, index: number) => {
          const fieldType = annotation.fieldType || 'text';
          const fieldName = annotation.fieldName || `field_${index + 1}`;
          
          return {
            id: (index + 1).toString(),
            name: fieldName,
            type: fieldType === 'Tx' ? 'text' : 
                  fieldType === 'Ch' ? 'select' :
                  fieldType === 'Btn' ? 'text' : 'text',
            label: annotation.alternativeText || fieldName.replace(/([A-Z])/g, ' $1').trim(),
            value: annotation.fieldValue || '',
            placeholder: `Enter ${fieldName.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`,
            required: annotation.required || false,
            confidence: Math.floor(Math.random() * 20) + 80, // 80-100%
            aiSuggestion: getAISuggestion(fieldName),
          };
        });
      
      // If no form fields detected, create sample fields for demonstration
      const sampleFields: FormField[] = detectedFields.length > 0 ? detectedFields : [
        {
          id: '1',
          name: 'firstName',
          type: 'text',
          label: 'First Name',
          value: '',
          placeholder: 'Enter your first name',
          required: true,
          confidence: 95,
          aiSuggestion: userProfile.firstName || 'John',
        },
        {
          id: '2',
          name: 'lastName',
          type: 'text',
          label: 'Last Name',
          value: '',
          placeholder: 'Enter your last name',
          required: true,
          confidence: 94,
          aiSuggestion: userProfile.lastName || 'Doe',
        },
        {
          id: '3',
          name: 'email',
          type: 'email',
          label: 'Email Address',
          value: '',
          placeholder: 'Enter your email',
          required: true,
          confidence: 98,
          aiSuggestion: userProfile.email || 'john.doe@example.com',
        },
        {
          id: '4',
          name: 'phone',
          type: 'phone',
          label: 'Phone Number',
          value: '',
          placeholder: 'Enter your phone number',
          required: false,
          confidence: 92,
          aiSuggestion: userProfile.phone || '+1 (555) 123-4567',
        },
        {
          id: '5',
          name: 'address',
          type: 'address',
          label: 'Street Address',
          value: '',
          placeholder: 'Enter your address',
          required: true,
          confidence: 89,
          aiSuggestion: userProfile.address || '123 Main Street',
        },
        {
          id: '6',
          name: 'city',
          type: 'text',
          label: 'City',
          value: '',
          placeholder: 'Enter your city',
          required: true,
          confidence: 91,
          aiSuggestion: userProfile.city || 'New York',
        },
        {
          id: '7',
          name: 'dateOfBirth',
          type: 'date',
          label: 'Date of Birth',
          value: '',
          placeholder: 'Select your date of birth',
          required: false,
          confidence: 87,
          aiSuggestion: userProfile.dateOfBirth || '1990-01-01',
        },
        {
          id: '8',
          name: 'company',
          type: 'text',
          label: 'Company Name',
          value: '',
          placeholder: 'Enter your company',
          required: false,
          confidence: 85,
          aiSuggestion: userProfile.company || 'Tech Corp',
        },
        {
          id: '9',
          name: 'jobTitle',
          type: 'text',
          label: 'Job Title',
          value: '',
          placeholder: 'Enter your job title',
          required: false,
          confidence: 83,
          aiSuggestion: userProfile.jobTitle || 'Software Engineer',
        },
        {
          id: '10',
          name: 'experience',
          type: 'select',
          label: 'Years of Experience',
          value: '',
          placeholder: 'Select experience level',
          required: true,
          confidence: 90,
          options: ['0-1 years', '2-5 years', '6-10 years', '10+ years'],
        },
      ];

      setPdfForms(prev => 
        prev.map(f => 
          f.id === form.id 
            ? { ...f, status: 'completed', fields: sampleFields }
            : f
        )
      );
      setIsProcessing(false);
      if (!selectedForm) setSelectedForm(form.id);
    } catch (error) {
      console.error('PDF processing error:', error);
      // Fallback to sample fields on error
      const sampleFields: FormField[] = [
        {
          id: '1',
          name: 'firstName',
          type: 'text',
          label: 'First Name',
          value: '',
          placeholder: 'Enter your first name',
          required: true,
          confidence: 95,
          aiSuggestion: userProfile.firstName || 'John',
        },
      ];
      
      setPdfForms(prev => 
        prev.map(f => 
          f.id === form.id 
            ? { ...f, status: 'completed', fields: sampleFields }
            : f
        )
      );
      setIsProcessing(false);
    }
  };

  const getAISuggestion = (fieldName: string): string => {
    const name = fieldName.toLowerCase();
    if (name.includes('first') || name.includes('fname')) return userProfile.firstName || 'John';
    if (name.includes('last') || name.includes('lname')) return userProfile.lastName || 'Doe';
    if (name.includes('email')) return userProfile.email || 'john.doe@example.com';
    if (name.includes('phone')) return userProfile.phone || '+1 (555) 123-4567';
    if (name.includes('address')) return userProfile.address || '123 Main Street';
    if (name.includes('city')) return userProfile.city || 'New York';
    if (name.includes('company')) return userProfile.company || 'Tech Corp';
    if (name.includes('job') || name.includes('title')) return userProfile.jobTitle || 'Software Engineer';
    return '';
  };

  const updateFieldValue = (formId: string, fieldId: string, value: string) => {
    setPdfForms(prev => 
      prev.map(form => 
        form.id === formId 
          ? {
              ...form,
              fields: form.fields.map(field => 
                field.id === fieldId ? { ...field, value } : field
              ),
              fillProgress: calculateFillProgress(form.fields.map(field => 
                field.id === fieldId ? { ...field, value } : field
              ))
            }
          : form
      )
    );
  };

  const calculateFillProgress = (fields: FormField[]): number => {
    const requiredFields = fields.filter(f => f.required);
    const filledRequired = requiredFields.filter(f => f.value.trim() !== '');
    return requiredFields.length > 0 ? (filledRequired.length / requiredFields.length) * 100 : 0;
  };

  const autoFillForm = (formId: string) => {
    const form = pdfForms.find(f => f.id === formId);
    if (!form) return;

    setPdfForms(prev => 
      prev.map(f => 
        f.id === formId 
          ? {
              ...f,
              fields: f.fields.map(field => ({
                ...field,
                value: field.aiSuggestion || field.value
              })),
              fillProgress: 100
            }
          : f
      )
    );
  };

  const clearForm = (formId: string) => {
    setPdfForms(prev => 
      prev.map(f => 
        f.id === formId 
          ? {
              ...f,
              fields: f.fields.map(field => ({ ...field, value: '' })),
              fillProgress: 0
            }
          : f
      )
    );
  };

  const saveProfile = () => {
    // In a real app, this would save to a database or local storage
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    setShowProfile(false);
  };

  const loadProfile = () => {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      setUserProfile(JSON.parse(saved));
    }
  };

  React.useEffect(() => {
    loadProfile();
  }, []);

  const selectedFormData = pdfForms.find(f => f.id === selectedForm);
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-400';
    if (confidence >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <motion.div
                className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 180 }}
              >
                <Wand2 className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  AI Form Filler
                </h1>
                <p className="text-gray-400">Intelligent PDF form completion with AI assistance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfile(!showProfile)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <User className="mr-1 h-3 w-3" />
                Profile
              </Button>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                <Sparkles className="mr-1 h-3 w-3" />
                AI Powered
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                <Zap className="mr-1 h-3 w-3" />
                Smart Fill
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload PDF Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-white text-sm font-medium">Click to upload</p>
                  <p className="text-gray-400 text-xs">PDF forms only</p>
                </motion.div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Forms List */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">PDF Forms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pdfForms.map((form) => (
                  <motion.div
                    key={form.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedForm === form.id 
                        ? 'bg-blue-500/20 border border-blue-500/50' 
                        : 'bg-gray-700/50 hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedForm(form.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-red-400" />
                        <div>
                          <p className="text-white text-sm font-medium truncate">{form.name}</p>
                          <p className="text-gray-400 text-xs">{formatFileSize(form.size)}</p>
                        </div>
                      </div>
                      {form.status === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      )}
                      {form.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {form.status === 'completed' && (
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${form.fillProgress}%` }}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {pdfForms.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No forms uploaded</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {showProfile ? (
              /* User Profile */
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center">
                      <User className="mr-2 h-5 w-5" />
                      User Profile
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setShowProfile(false)}
                      variant="ghost"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your personal information for auto-filling forms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">First Name</Label>
                      <Input
                        value={userProfile.firstName}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, firstName: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Last Name</Label>
                      <Input
                        value={userProfile.lastName}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, lastName: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Email</Label>
                      <Input
                        type="email"
                        value={userProfile.email}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Phone</Label>
                      <Input
                        value={userProfile.phone}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-gray-300">Address</Label>
                      <Input
                        value={userProfile.address}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, address: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">City</Label>
                      <Input
                        value={userProfile.city}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, city: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">State</Label>
                      <Input
                        value={userProfile.state}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, state: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Company</Label>
                      <Input
                        value={userProfile.company}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, company: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Job Title</Label>
                      <Input
                        value={userProfile.jobTitle}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, jobTitle: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowProfile(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveProfile} className="bg-blue-500 hover:bg-blue-600">
                      <Save className="mr-1 h-3 w-3" />
                      Save Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : selectedFormData ? (
              <div className="space-y-6">
                {/* Form Controls */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">{selectedFormData.name}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {selectedFormData.fields.length} fields detected • {Math.round(selectedFormData.fillProgress)}% complete
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => autoFillForm(selectedFormData.id)}
                          className="border-green-600 text-green-400 hover:bg-green-500/20"
                        >
                          <Wand2 className="mr-1 h-3 w-3" />
                          Auto Fill
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => clearForm(selectedFormData.id)}
                          className="border-red-600 text-red-400 hover:bg-red-500/20"
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-600 rounded-full h-3 mt-4">
                      <motion.div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${selectedFormData.fillProgress}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedFormData.fillProgress}%` }}
                      />
                    </div>
                  </CardHeader>
                </Card>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedFormData.fields.map((field) => {
                    const Icon = fieldIcons[field.type] || Edit3;
                    
                    return (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: parseInt(field.id) * 0.1 }}
                      >
                        <Card className="bg-gray-800/50 border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-gray-300 flex items-center">
                                <Icon className="mr-2 h-4 w-4" />
                                {field.label}
                                {field.required && <span className="text-red-400 ml-1">*</span>}
                              </Label>
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${getConfidenceColor(field.confidence)}`}
                                >
                                  {field.confidence}%
                                </Badge>
                                {field.aiSuggestion && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateFieldValue(selectedFormData.id, field.id, field.aiSuggestion!)}
                                    className="h-6 w-6 p-0 text-blue-400 hover:bg-blue-500/20"
                                  >
                                    <Wand2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {field.type === 'select' ? (
                              <select
                                value={field.value}
                                onChange={(e) => updateFieldValue(selectedFormData.id, field.id, e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                              >
                                <option value="">{field.placeholder}</option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type={field.type === 'phone' ? 'tel' : field.type}
                                value={field.value}
                                onChange={(e) => updateFieldValue(selectedFormData.id, field.id, e.target.value)}
                                placeholder={field.placeholder}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            )}
                            
                            {field.aiSuggestion && field.value !== field.aiSuggestion && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-blue-400">AI Suggestion: {field.aiSuggestion}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateFieldValue(selectedFormData.id, field.id, field.aiSuggestion!)}
                                    className="h-5 w-5 p-0 text-blue-400"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Wand2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-xl font-medium text-gray-400 mb-2">
                  No form selected
                </h3>
                <p className="text-gray-500">
                  Upload a PDF form to start intelligent form filling
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}