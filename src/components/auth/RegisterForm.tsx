import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Button from '../common/Button';
import FormInput from '../common/FormInput';

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string, studentClass: string, studentNumber: string) => void;
  onLoginClick: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLoginClick,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    studentClass?: string;
    studentNumber?: string;
    email?: string;
    password?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!firstName.trim()) newErrors.firstName = 'Ad gereklidir';
    if (!lastName.trim()) newErrors.lastName = 'Soyad gereklidir';
    if (!studentClass.trim()) newErrors.studentClass = 'Sınıf gereklidir';
    if (!studentNumber.trim()) newErrors.studentNumber = 'Öğrenci no gereklidir';
    
    if (!email) {
      newErrors.email = 'E-posta adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Geçersiz e-posta adresi';
    }
    
    if (!password) {
      newErrors.password = 'Şifre gereklidir';
    } else if (password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(`${firstName} ${lastName}`, email, password, studentClass, studentNumber);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8 mx-auto">
      <div className="flex justify-center mb-6">
        <img src="https://r.resimlink.com/wqGy2-Yc.jpg" alt="Data Koleji Logo" className="w-36 h-36 sm:w-30 sm:h-30" />
      </div>
      
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 text-center">
        Data Koleji Kütüphanesi
      </h2>
      <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-8">
        Yeni üyelik oluşturun ve bilgiye erişim sağlayın.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Adınız"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
            placeholder="Adınız"
            icon="user"
          />
          
          <FormInput
            label="Soyadınız"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.lastName}
            placeholder="Soyadınız"
            icon="user"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Sınıf"
            type="text"
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            error={errors.studentClass}
            placeholder="Örn: 9-A"
            icon="book"
          />
          
          <FormInput
            label="Öğrenci No"
            type="text"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
            error={errors.studentNumber}
            placeholder="Örn: 1234"
            icon="id-card"
          />
        </div>
        
        <FormInput
          label="E-posta Adresiniz"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="ornek@datakolej.edu.tr"
          icon="mail"
        />
        
        <div className="relative">
          <FormInput
            label="Şifreniz"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            placeholder="••••••••"
            icon="lock"
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

        <Button type="submit" fullWidth>
          Kayıt Ol
        </Button>
      </form>
      
      <div className="mt-4 sm:mt-6 text-center">
        <p className="text-sm text-gray-600">
          Zaten hesabınız var mı?{' '}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Giriş yapın
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;