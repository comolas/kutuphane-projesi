import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Button from '../common/Button';
import FormInput from '../common/FormInput';

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string, studentClass: string, studentNumber: string) => void;
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
    if (!studentNumber.trim()) {
      if (studentClass === 'Öğretmen') {
        newErrors.studentNumber = 'Branş gereklidir';
      } else {
        newErrors.studentNumber = 'Öğrenci no gereklidir';
      }
    }
    
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
        <img src="https://r.resimlink.com/BJq8au6HpG.png" alt="Data Koleji Logo" className="w-36 h-36 rounded-full border-4 border-indigo-400" />
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
            as="select"
            value={studentClass}
            onChange={(e) => {
              setStudentClass(e.target.value);
              setStudentNumber(''); // Reset student number/branch on class change
            }}
            error={errors.studentClass}
            icon="book"
          >
            <option value="">Sınıfınızı Seçin</option>
            {siniflar.map(s => <option key={s} value={s}>{s}</option>)}
          </FormInput>
          
          {studentClass === 'Öğretmen' ? (
            <FormInput
              label="Branş"
              as="select"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              error={errors.studentNumber}
              icon="id-card"
            >
              <option value="">Branşınızı Seçin</option>
              {branslar.map(b => <option key={b} value={b}>{b}</option>)}
            </FormInput>
          ) : (
            <FormInput
              label="Öğrenci No"
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              error={errors.studentNumber}
              placeholder="Örn: 1234"
              icon="id-card"
            />
          )}
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
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {showPassword ? <EyeOff size={1} /> : <Eye size={1} />}
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