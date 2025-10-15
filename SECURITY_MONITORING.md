# 🔒 Güvenlik İzleme Sistemi

## Otomatik Güvenlik Kontrolleri

### 1. Haftalık Güvenlik Taraması
- **Ne Zaman**: Her Pazartesi saat 09:00
- **Ne Yapar**: Frontend ve backend bağımlılıklarını tarar
- **Nerede**: GitHub Actions → Security Audit workflow
- **Rapor**: Actions sekmesinde detaylı sonuçlar

### 2. Pull Request Kontrolleri
- **Ne Zaman**: Her PR açıldığında
- **Ne Yapar**: 
  - Yeni eklenen bağımlılıkları kontrol eder
  - Güvenlik açığı varsa PR'a yorum ekler
  - Moderate ve üzeri açıklar için PR'ı başarısız yapar
- **Nerede**: PR sayfasında otomatik yorum

### 3. Dependabot Güncellemeleri
- **Ne Zaman**: Her Pazartesi saat 09:00
- **Ne Yapar**:
  - Güvenlik açığı olan paketler için otomatik PR oluşturur
  - Versiyon güncellemeleri önerir
  - Maksimum 5 açık PR (frontend + backend)
- **Nerede**: Pull Requests sekmesi

## Manuel Kontrol

Güvenlik taramasını manuel çalıştırmak için:

```bash
# Frontend
npm audit --audit-level=moderate

# Backend
cd functions
npm audit --audit-level=moderate
```

## GitHub Actions'da Manuel Çalıştırma

1. GitHub repo → Actions sekmesi
2. "Security Audit" workflow'u seç
3. "Run workflow" butonuna tıkla
4. Branch seç ve çalıştır

## Bildirimler

### GitHub Bildirimleri
- Watch → Custom → Security alerts ✅
- Güvenlik açığı bulunduğunda email alırsınız

### Slack/Discord Entegrasyonu (Opsiyonel)

Slack bildirimi eklemek için `.github/workflows/security-audit.yml` dosyasına ekleyin:

```yaml
- name: Slack Bildirimi
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "⚠️ Güvenlik açığı tespit edildi!"
      }
```

## Güvenlik Seviyeleri

- **Critical**: Acil müdahale gerekir (0-24 saat)
- **High**: Hızlı müdahale gerekir (1-7 gün)
- **Moderate**: Planlı güncelleme (1-30 gün)
- **Low**: Rutin güncelleme (opsiyonel)

## Kurulum Sonrası Yapılacaklar

1. ✅ `.github/dependabot.yml` dosyasında `your-github-username` kısmını güncelleyin
2. ✅ GitHub repo → Settings → Code security and analysis
   - Dependabot alerts: Enable
   - Dependabot security updates: Enable
3. ✅ İlk workflow'u manuel çalıştırarak test edin
4. ✅ GitHub bildirimlerini aktif edin

## Raporlama

### Haftalık Rapor Formatı
- ✅ Toplam bağımlılık sayısı
- ⚠️ Tespit edilen güvenlik açıkları
- 📊 Seviye dağılımı (Critical/High/Moderate/Low)
- 🔧 Önerilen aksiyonlar

### Rapor Erişimi
- GitHub Actions → Security Audit → Son çalıştırma
- Summary sekmesinde özet rapor
- Logs sekmesinde detaylı çıktı

## Sorun Giderme

**Workflow çalışmıyor:**
- Actions sekmesinin aktif olduğundan emin olun
- Repository Settings → Actions → Allow all actions

**Dependabot PR oluşturmuyor:**
- Settings → Code security → Dependabot alerts aktif mi?
- `.github/dependabot.yml` dosyası doğru konumda mı?

**Bildirim gelmiyor:**
- GitHub Settings → Notifications → Security alerts ✅

## Güvenlik Politikası

Güvenlik açığı bulduğunuzda:
1. Dependabot PR'ını inceleyin
2. Breaking change var mı kontrol edin
3. Test ortamında deneyin
4. Production'a deploy edin
5. Güvenlik raporunu güncelleyin

## İletişim

Güvenlik sorunları için: [GitHub Security Advisories](https://github.com/your-repo/security/advisories)
