import React, { useState } from 'react';
import { Book, Mail, Phone, MapPin, X, Instagram } from 'lucide-react';

const Footer: React.FC = () => {
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
      <footer className="bg-gray-100 dark:bg-gray-800 transition-colors duration-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Logo and Description */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Book 
                  size={24} 
                  className="text-indigo-900 dark:text-indigo-400 transition-colors duration-200" 
                />
                <h2 className="ml-2 text-lg font-bold text-indigo-900 dark:text-white transition-colors duration-200">
                  Data Koleji Kütüphanesi
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
                Kitap ve bilgi dünyasına açılan dijital kapınız. Kapsamlı koleksiyonumuzla keşfedin, öğrenin ve gelişin.
              </p>
            </div>
            
            {/* Social Media Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white transition-colors duration-200">
                Sosyal Medyada Bizi Takip Edin!
              </h3>
              <div className="flex flex-wrap gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center space-x-2 text-gray-600 dark:text-gray-400 ${social.color} transition-colors duration-200`}
                    aria-label={`Follow us on ${social.name}`}
                  >
                    <social.icon className="w-6 h-6" />
                    <span className="text-sm">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white transition-colors duration-200">
                İletişim
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <MapPin size={18} className="text-indigo-900 dark:text-indigo-400 flex-shrink-0 mt-1 transition-colors duration-200" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
                    Ovacık Mahallesi, 548. Cadde No :5, 06220 Keçiören/Ankara
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <Phone size={18} className="text-indigo-900 dark:text-indigo-400 transition-colors duration-200" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
                    (0312) 456-7890
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <Mail size={18} className="text-indigo-900 dark:text-indigo-400 transition-colors duration-200" />
                  <span className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
                    datakolejikutuphane@gmail.com
                  </span>
                </li>
              </ul>
            </div>
            
            {/* iPhone Mockup */}
            <div className="flex justify-center items-center">
                <div className="relative mx-auto border-black dark:border-gray-800 bg-black border-[10px] rounded-[2.5rem] h-[280px] w-[150px] shadow-xl">
                    <div className="w-[70px] h-[10px] bg-black top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
                    <div className="h-[20px] w-[3px] bg-black absolute -left-[13px] top-[60px] rounded-l-lg"></div>
                    <div className="h-[32px] w-[3px] bg-black absolute -left-[13px] top-[90px] rounded-l-lg"></div>
                    <div className="h-[32px] w-[3px] bg-black absolute -left-[13px] top-[130px] rounded-l-lg"></div>
                    <div className="h-[48px] w-[3px] bg-black absolute -right-[13px] top-[110px] rounded-r-lg"></div>
                    <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-black">
                        <img src="https://r.resimlink.com/L2H7vA3-u.png" className="w-full h-full object-cover" alt="App Screenshot"/>
                    </div>
                </div>
            </div>
          </div>
          
          <hr className="my-8 border-gray-300 dark:border-gray-700 transition-colors duration-200" />
          
          {/* Bottom Section */}
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
            <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
              © {currentYear} Data Koleji Kütüphanesi. Tüm hakları saklıdır.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <button 
                onClick={() => setShowSecurityPolicy(true)}
                className="text-gray-600 dark:text-gray-400 hover:text-indigo-900 dark:hover:text-indigo-400 transition-colors duration-200"
              >
                Güvenlik Politikası
              </button>
              <button
                onClick={() => setShowTerms(true)}
                className="text-gray-600 dark:text-gray-400 hover:text-indigo-900 dark:hover:text-indigo-400 transition-colors duration-200"
              >
                Hizmet Koşulları
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Security Policy Modal */}
      {showSecurityPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Güvenlik Politikası</h2>
              <button
                onClick={() => setShowSecurityPolicy(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
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

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hizmet Koşulları</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
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