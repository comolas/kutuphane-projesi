import React, { useState } from 'react';
import { Book, Mail, Phone, MapPin, X, Instagram, Clock, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [showSecurityPolicy, setShowSecurityPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const socialLinks = [
    {
      name: 'Instagram',
      icon: Instagram,
      url: 'https://www.instagram.com/data_koleji/',
      color: 'hover:text-pink-600'
    }
  ];
  
  return (
    <>
      <footer className="relative bg-gradient-to-br from-indigo-50/50 via-purple-50/40 to-pink-50/30 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 transition-all duration-500">
        {/* Wave Divider */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
          <svg className="relative block w-full h-12" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white dark:fill-gray-800"></path>
          </svg>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="space-y-4 group">
              <div className="flex items-center">
                <img src="https://r.resimlink.com/BJq8au6HpG.png" alt="Logo" className="w-16 h-16 rounded-full shadow-lg group-hover:shadow-xl transition-all duration-300" />
                <h2 className="ml-3 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Data Koleji Kütüphanesi
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {t('footer.description')}
              </p>
              
              {/* Download Buttons */}
              <div className="flex flex-col gap-2 mt-4">
                <a
                  href="https://firebasestorage.googleapis.com/v0/b/data-49543.firebasestorage.app/o/app-debug.apk?alt=media&token=cbd139e7-91b5-4dcf-9dac-734ab2a9dce5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-4 py-2.5 bg-black hover:bg-gray-900 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M3 20.5C3 21.3284 3.67157 22 4.5 22H19.5C20.3284 22 21 21.3284 21 20.5V9.5C21 8.67157 20.3284 8 19.5 8H4.5C3.67157 8 3 8.67157 3 9.5V20.5Z" fill="#3DDC84"/>
                    <path d="M7.5 2L9.5 4L7.5 6" stroke="#3DDC84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.5 2L14.5 4L16.5 6" stroke="#3DDC84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="flex-1 text-left">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">{t('footer.downloadAndroid')}</div>
                    <div className="text-sm font-semibold text-white">{t('footer.downloadGooglePlay')}</div>
                  </div>
                  <Download className="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform" />
                </a>
                
                <a
                  href="https://firebasestorage.googleapis.com/v0/b/data-49543.firebasestorage.app/o/K%C3%BCt%C3%BCphane%20Projesi%20Setup%201.1.0.exe?alt=media&token=4232da10-a3d0-4975-a3af-81aa6894b494"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3H21V21H3V3Z" fill="#00A4EF"/>
                    <path d="M3 3H11V11H3V3Z" fill="#FFB900"/>
                    <path d="M13 3H21V11H13V3Z" fill="#F25022"/>
                    <path d="M3 13H11V21H3V13Z" fill="#00A4EF"/>
                    <path d="M13 13H21V21H13V13Z" fill="#7FBA00"/>
                  </svg>
                  <div className="flex-1 text-left">
                    <div className="text-[10px] text-blue-100 uppercase tracking-wide">{t('footer.downloadWindows')}</div>
                    <div className="text-sm font-semibold text-white">{t('footer.downloadDesktop')}</div>
                  </div>
                  <Download className="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
            
            {/* Social Media Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></span>
                {t('footer.followUs')}
              </h3>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/20 transition-all duration-300 hover:-translate-y-1"
                    aria-label={`Follow us on ${social.name}`}
                  >
                    <social.icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></span>
                {t('footer.contactTitle')}
              </h3>
              <ul className="space-y-3">
                <li className="group flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Ovacık Mahallesi, 548. Cadde No :5, 06220 Keçiören/Ankara
                  </span>
                </li>
                <li className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Phone size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-300 text-sm">(0312) 456-7890</span>
                </li>
                <li className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Mail size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-300 text-sm">datakolejikutuphane@gmail.com</span>
                </li>
              </ul>
              
              <div className="mt-6 p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                  {t('footer.workingHours')}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('footer.mondayFriday')}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">08:00 - 17:00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('footer.saturday')}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">09:00 - 14:00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{t('footer.sunday')}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">{t('footer.closed')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* iPhone Mockup */}
            <div className="flex justify-center items-center">
                <div className="relative mx-auto border-black dark:border-gray-700 bg-black border-[10px] rounded-[2.5rem] h-[280px] w-[150px] shadow-2xl hover:shadow-indigo-500/30 transition-all duration-500 hover:scale-105">
                    <div className="w-[70px] h-[10px] bg-black top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
                    <div className="h-[20px] w-[3px] bg-black absolute -left-[13px] top-[60px] rounded-l-lg"></div>
                    <div className="h-[32px] w-[3px] bg-black absolute -left-[13px] top-[90px] rounded-l-lg"></div>
                    <div className="h-[32px] w-[3px] bg-black absolute -left-[13px] top-[130px] rounded-l-lg"></div>
                    <div className="h-[48px] w-[3px] bg-black absolute -right-[13px] top-[110px] rounded-r-lg"></div>
                    <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-black ring-2 ring-indigo-500/20">
                        <img src="https://r.resimlink.com/L2H7vA3-u.png" className="w-full h-full object-cover" alt="App Screenshot"/>
                    </div>
                    <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3rem] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                </div>
            </div>
          </div>
          
          <div className="my-8 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
          
          {/* Bottom Section */}
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              {t('footer.rightsReserved', { year: currentYear })}
            </p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <button 
                onClick={() => setShowSecurityPolicy(true)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-white bg-white/60 dark:bg-gray-800/60 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30"
              >
                {t('footer.securityPolicy')}
              </button>
              <button
                onClick={() => setShowTerms(true)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-white bg-white/60 dark:bg-gray-800/60 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 hover:border-transparent transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30"
              >
                {t('footer.termsOfService')}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Security Policy Drawer */}
      {showSecurityPolicy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowSecurityPolicy(false)}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl w-full max-w-2xl h-full shadow-2xl transform transition-transform duration-300 animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/20 flex justify-between items-center bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-2xl font-bold text-white">{t('footer.securityPolicy')}</h2>
              <button
                onClick={() => setShowSecurityPolicy(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto h-[calc(100%-88px)]">
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-xl font-semibold mb-4">1. Veri Güvenliği</h3>
                <p className="mb-4">
                  Data Koleji Kütüphanesi, kullanıcılarının kişisel verilerinin güvenliğini en üst düzeyde tutmayı taahhüt eder. Verileriniz SSL şifreleme protokolleri kullanılarak korunmaktadır.
                </p>

                <h3 className="text-xl font-semibold mb-4">2. Kişisel Bilgilerin Korunması</h3>
                <p className="mb-4">
                  Kullanıcılarımızın kişisel bilgileri yalnızca kütüphane hizmetlerinin sağlanması amacıyla kullanılmaktadır. Bu bilgiler üçüncü taraflarla paylaşılmamaktadır.
                </p>

                <h3 className="text-xl font-semibold mb-4">3. Hesap Güvenliği</h3>
                <p className="mb-4">
                  Kullanıcılar, hesap güvenliklerini sağlamak için güçlü şifreler kullanmalı ve bu şifreleri düzenli olarak değiştirmelidir. Şüpheli bir aktivite durumunda derhal kütüphane yönetimine bildirilmelidir.
                </p>

                <h3 className="text-xl font-semibold mb-4">4. Sistem Güvenliği</h3>
                <p className="mb-4">
                  Kütüphane sistemimiz düzenli olarak güvenlik testlerinden geçirilmekte ve güncel güvenlik protokolleri uygulanmaktadır. Olası güvenlik açıkları sürekli olarak takip edilmekte ve gerekli önlemler alınmaktadır.
                </p>

                <h3 className="text-xl font-semibold mb-4">5. Kullanıcı Sorumlulukları</h3>
                <p>
                  Kullanıcılar, kendi hesaplarının güvenliğinden sorumludur. Şifre paylaşımı ve güvenlik ihlalleri durumunda oluşabilecek zararlardan kullanıcılar sorumlu tutulacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Drawer */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowTerms(false)}>
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl w-full max-w-2xl h-full shadow-2xl transform transition-transform duration-300 animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/20 flex justify-between items-center bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-2xl font-bold text-white">{t('footer.termsOfService')}</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto h-[calc(100%-88px)]">
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-xl font-semibold mb-4">1. Üyelik Koşulları</h3>
                <p className="mb-4">
                  Data Koleji Kütüphanesi'ne üyelik, Data Koleji öğrencileri ve personeli ile sınırlıdır. Üyelik başvurusu sırasında verilen bilgilerin doğruluğu esastır.
                </p>

                <h3 className="text-xl font-semibold mb-4">2. Ödünç Alma Kuralları</h3>
                <p className="mb-4">
                  - Bir kullanıcı aynı anda en fazla 5 kitap ödünç alabilir<br />
                  - Ödünç alma süresi 14 gündür<br />
                  - Süre uzatma işlemi bir kez yapılabilir<br />
                  - Gecikme durumunda günlük ceza uygulanır
                </p>

                <h3 className="text-xl font-semibold mb-4">3. Kullanıcı Sorumlulukları</h3>
                <p className="mb-4">
                  Kullanıcılar ödünç aldıkları materyallerin bakımından ve zamanında iadesinden sorumludur. Materyal kaybı veya hasarı durumunda yenisinin temini veya bedel ödemesi gereklidir.
                </p>

                <h3 className="text-xl font-semibold mb-4">4. Dijital Hizmetler</h3>
                <p className="mb-4">
                  Online katalog ve dijital kaynaklar yalnızca eğitim ve araştırma amaçlı kullanılmalıdır. İçeriklerin ticari amaçla kullanımı ve çoğaltılması yasaktır.
                </p>

                <h3 className="text-xl font-semibold mb-4">5. Davranış Kuralları</h3>
                <p className="mb-4">
                  Kütüphane içerisinde diğer kullanıcıların çalışma ortamına saygı gösterilmeli, sessizlik kuralına uyulmalıdır. Kurallara uymayan kullanıcıların üyelikleri askıya alınabilir.
                </p>

                <h3 className="text-xl font-semibold mb-4">6. Değişiklik Hakkı</h3>
                <p>
                  Kütüphane yönetimi, hizmet koşullarında değişiklik yapma hakkını saklı tutar. Değişiklikler web sitesi üzerinden duyurulacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;