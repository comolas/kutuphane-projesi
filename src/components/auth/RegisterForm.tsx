import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import FormInput from '../common/FormInput';
import { validateEmail, validatePassword, validateName, validateStudentNumber, validateClass } from '../../utils/validation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Swal from 'sweetalert2';

interface Campus {
  id: string;
  name: string;
  code?: string;
  classes?: string[];
  branches?: string[];
}

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string, studentClass: string, studentNumber: string, campusId: string) => void;
  onLoginClick: () => void;
}

const siniflar = [
  "9-A", "9-B", "9-C", "9-D", "9-E", "9-F", "9-G", "9-I",
  "10-A", "10-B", "10-C", "10-D", "10-E", "10-F", "10-G", "10-H", "10-I", "10-J",
  "11-A", "11-B", "11-D", "11-E", "11-F", "11-G", "11-AB", "11-AC", "11-AD", "11-AE", "11-AF",
  "12-A", "12-B", "12-C", "12-D", "12-E", "12-F", "12-G", "12-H",
  "Öğretmen"
];

const branslar = [
  "Almanca", "Beden Eğitim", "Biyoloji", "Coğrafya", "Din Kültürü", "Elektrik",
  "Felsefe", "Fizik", "Kimya", "Makine", "Matematik", "İngilizce", "Tarih",
  "Türk Dili ve Edebiyatı", "Uçak Bakım"
];

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLoginClick,
}) => {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [campusId, setCampusId] = useState('');
  const [campusCode, setCampusCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    studentClass?: string;
    studentNumber?: string;
    email?: string;
    password?: string;
    campusId?: string;
    campusCode?: string;
  }>({});

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const campusesSnapshot = await getDocs(collection(db, 'campuses'));
        const campusesData = campusesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'İsimsiz Kampüs',
            code: data.code || '',
            classes: data.classes || [],
            branches: data.branches || []
          };
        });
        setCampuses(campusesData);
      } catch (error) {
        console.error('Kampüsler yüklenirken hata:', error);
      }
    };
    fetchCampuses();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    // İsim validation
    const firstNameValidation = validateName(firstName);
    if (!firstNameValidation.valid) {
      newErrors.firstName = firstNameValidation.error;
    }
    
    const lastNameValidation = validateName(lastName);
    if (!lastNameValidation.valid) {
      newErrors.lastName = lastNameValidation.error;
    }
    
    // Sınıf validation
    const classValidation = validateClass(studentClass);
    if (!classValidation.valid) {
      newErrors.studentClass = classValidation.error;
    }
    
    // Öğrenci no / Branş validation
    if (studentClass !== 'Öğretmen') {
      const studentNumberValidation = validateStudentNumber(studentNumber);
      if (!studentNumberValidation.valid) {
        newErrors.studentNumber = studentNumberValidation.error;
      }
    } else if (!studentNumber.trim()) {
      newErrors.studentNumber = t('register.branchRequired');
    }
    
    // Email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error;
    }
    
    // Şifre validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error;
    }
    
    // Kampüs validation
    if (!campusId.trim()) {
      newErrors.campusId = t('register.campusRequired');
    }
    
    // Kampüs kodu validation
    if (!campusCode.trim()) {
      newErrors.campusCode = t('register.campusCodeRequired');
    } else {
      const selectedCampus = campuses.find(c => c.id === campusId);
      if (selectedCampus && selectedCampus.code && campusCode.toUpperCase() !== selectedCampus.code.toUpperCase()) {
        newErrors.campusCode = t('register.campusCodeInvalid');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // E-posta domain kontrolü
    const allowedDomains = ['gmail.com', 'hotmail.com', 'icloud.com', 'proton.me', 'protonmail.com'];
    const emailDomain = email.toLowerCase().split('@')[1];
    
    if (!allowedDomains.includes(emailDomain)) {
      Swal.fire({
        icon: 'error',
        title: t('register.invalidEmailDomain'),
        text: t('register.invalidEmailDomainMsg')
      });
      return;
    }

    // allowedUsers kontrolü
    try {
      const q = query(
        collection(db, 'allowedUsers'),
        where('campusId', '==', campusId)
      );
      
      const snapshot = await getDocs(q);
      
      // Manuel filtreleme - büyük/küçük harf duyarsız
      const matchingUser = snapshot.docs.find(doc => {
        const data = doc.data();
        return (
          String(data.firstName || '').toLowerCase().trim() === firstName.toLowerCase().trim() &&
          String(data.lastName || '').toLowerCase().trim() === lastName.toLowerCase().trim() &&
          String(data.studentClass || '').trim() === studentClass.trim() &&
          String(data.studentNumber || '').trim() === studentNumber.trim()
        );
      });
      
      if (!matchingUser) {
        Swal.fire({
          icon: 'error',
          title: t('register.registrationFailed'),
          text: t('register.registrationFailedMsg')
        });
        return;
      }
      
      onSubmit(`${firstName} ${lastName}`, email, password, studentClass, studentNumber, campusId);
    } catch (error) {
      console.error('Doğrulama hatası:', error);
      Swal.fire(t('register.error'), t('register.errorMsg'), 'error');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const canProceedToStep2 = firstName.trim() && lastName.trim();
  const canProceedToStep3 = campusId && campusCode.trim() && studentClass && (studentClass !== 'Öğretmen' ? studentNumber.trim() : studentNumber.trim());
  const canSubmit = email.trim() && password.trim();

  return (
    <div className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 mx-auto hover:shadow-3xl hover:scale-[1.02] transition-all duration-500 group">
      <div className="flex justify-center mb-4">
        <div className="relative">
          <img src="https://r.resimlink.com/BJq8au6HpG.png" alt="Data Koleji Logo" className="w-20 h-20 rounded-2xl border-3 border-indigo-400/50 group-hover:border-indigo-500 transition-all duration-300 shadow-lg" />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </div>
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 tracking-tight">
          Data Koleji Kütüphanesi
        </h2>
        <p className="text-gray-600 font-medium">
          {t('register.subtitle')}
        </p>
      </div>
      
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-medium text-gray-500">{t('register.step')} {currentStep} / {totalSteps}</span>
          <span className="text-xs font-medium text-indigo-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="flex gap-2 mb-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                step <= currentStep
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {currentStep === 1 && t('register.stepLabels.personal')}
            {currentStep === 2 && t('register.stepLabels.education')}
            {currentStep === 3 && t('register.stepLabels.account')}
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label={t('register.firstName')}
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.firstName}
                placeholder={t('register.firstName')}
                icon="user"
                required
              />
              
              <FormInput
                label={t('register.lastName')}
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.lastName}
                placeholder={t('register.lastName')}
                icon="user"
                required
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={!canProceedToStep2}
                className="px-8"
              >
                {t('register.continue')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Education Information */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <FormInput
              label={t('register.campus')}
              as="select"
              value={campusId}
              onChange={(e) => {
                const selectedCampusId = e.target.value;
                setCampusId(selectedCampusId);
                
                const selectedCampus = campuses.find(c => c.id === selectedCampusId);
                if (selectedCampus) {
                  setAvailableClasses(selectedCampus.classes || []);
                  setAvailableBranches(selectedCampus.branches || []);
                } else {
                  setAvailableClasses([]);
                  setAvailableBranches([]);
                }
                
                setStudentClass('');
                setStudentNumber('');
                setCampusCode('');
              }}
              error={errors.campusId}
              icon="building"
              required
            >
              <option value="">{t('register.selectCampus')}</option>
              {campuses.map(campus => (
                <option key={campus.id} value={campus.id}>{campus.name}</option>
              ))}
            </FormInput>
            
            {campusId && (
              <FormInput
                label={t('register.campusCode')}
                type="text"
                value={campusCode}
                onChange={(e) => setCampusCode(e.target.value.toUpperCase())}
                error={errors.campusCode}
                placeholder={t('register.campusCodePlaceholder')}
                icon="key"
                required
              />
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label={t('register.class')}
                as="select"
                value={studentClass}
                onChange={(e) => {
                  setStudentClass(e.target.value);
                  setStudentNumber('');
                }}
                error={errors.studentClass}
                icon="book"
                required
              >
                <option value="">{t('register.selectClass')}</option>
                {availableClasses.map(s => <option key={s} value={s}>{s}</option>)}
              </FormInput>
              
              {studentClass === 'Öğretmen' ? (
                <FormInput
                  label={t('register.branch')}
                  as="select"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  error={errors.studentNumber}
                  icon="id-card"
                >
                  <option value="">{t('register.selectBranch')}</option>
                  {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </FormInput>
              ) : (
                <FormInput
                  label={t('register.studentNumber')}
                  type="text"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  error={errors.studentNumber}
                  placeholder={t('register.studentNumberPlaceholder')}
                  icon="id-card"
                />
              )}
            </div>
            
            <div className="flex justify-between">
              <Button type="button" onClick={prevStep} variant="outline">
                {t('register.back')}
              </Button>
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={!canProceedToStep3}
              >
                {t('register.continue')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Account Information */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <FormInput
              label={t('register.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="ornek@datakolej.edu.tr"
              icon="mail"
              required
            />
            
            <div className="relative">
              <FormInput
                label={t('register.password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="flex justify-between">
              <Button type="button" onClick={prevStep} variant="outline">
                {t('register.back')}
              </Button>
              <Button 
                type="submit" 
                disabled={!canSubmit}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <span className="flex items-center gap-2">
                  {t('register.registerButton')}
                  <span className="text-lg">✨</span>
                </span>
              </Button>
            </div>
          </div>
        )}
      </form>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          {t('register.alreadyHaveAccount')}{' '}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-indigo-600 hover:text-purple-600 font-semibold hover:underline transition-all duration-300"
          >
            {t('register.loginNow')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;