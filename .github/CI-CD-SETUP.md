# Panduan Setup CI/CD GitHub Actions

## 📋 Langkah-langkah Setup

### 1. **Commit dan Push File Workflow**

Pastikan file workflow sudah di-commit dan push ke repository GitHub:

```bash
# Cek status git
git status

# Tambahkan file workflow ke staging
git add .github/workflows/ci-cd.yml

# Commit dengan pesan yang jelas
git commit -m "feat: add CI/CD pipeline with tests, linting, and docker build"

# Push ke repository
git push origin main
# atau
git push origin master
# atau
git push origin develop
```

### 2. **Verifikasi di GitHub**

Setelah push, workflow akan otomatis berjalan. Untuk melihat:

1. Buka repository di GitHub
2. Klik tab **"Actions"** di bagian atas
3. Anda akan melihat workflow **"CI/CD Pipeline"** sedang berjalan
4. Klik pada workflow run untuk melihat detail progress

### 3. **Memahami Status Workflow**

Workflow terdiri dari 3 job utama:

- ✅ **PHP Tests** - Menjalankan PHPUnit tests dan Laravel Pint
- ✅ **Frontend Lint & Type Check** - Menjalankan ESLint, TypeScript check, dan Prettier
- ✅ **Docker Build** - Build Docker image (hanya jika 2 job sebelumnya berhasil)

### 4. **Melihat Hasil dan Logs**

- **Hijau (✓)** = Semua test/check berhasil
- **Merah (✗)** = Ada yang gagal, klik untuk melihat detail error
- **Kuning (⏳)** = Masih berjalan

Klik pada job yang gagal untuk melihat log error detail.

## 🔧 Troubleshooting

### Masalah: Workflow tidak berjalan

**Solusi:**
- Pastikan file ada di `.github/workflows/ci-cd.yml`
- Pastikan branch yang di-push sesuai dengan trigger (main/master/develop)
- Cek tab "Actions" di GitHub, mungkin perlu diaktifkan

### Masalah: PHP Tests gagal

**Kemungkinan penyebab:**
- Database connection error
- Missing dependencies
- Test case yang error

**Solusi:**
- Cek log di GitHub Actions untuk detail error
- Pastikan semua migration berjalan dengan baik
- Run test lokal dulu: `composer test`

### Masalah: Frontend Lint gagal

**Kemungkinan penyebab:**
- ESLint errors
- TypeScript type errors
- Prettier formatting issues

**Solusi:**
- Run lokal: `npm run lint` dan `npm run types`
- Fix formatting: `npm run format`
- Cek log di GitHub Actions

### Masalah: Docker Build gagal

**Kemungkinan penyebab:**
- Dockerfile error
- Missing files
- Build context issues

**Solusi:**
- Test build lokal: `docker build -f deploy/Dockerfile .`
- Cek log di GitHub Actions untuk detail error

## 🚀 Optimasi dan Tips

### 1. **Menambahkan Badge Status**

Tambahkan badge di README.md untuk menampilkan status CI/CD:

```markdown
![CI/CD](https://github.com/samsudin47/smart-inventory/workflows/CI/CD%20Pipeline/badge.svg)
```

### 2. **Mengaktifkan Auto-fix**

Jika ingin auto-fix code style issues, uncomment bagian commit di workflow lint.yml

### 3. **Menambahkan Deployment**

Untuk menambahkan deployment otomatis:

1. Uncomment bagian `deploy` di `ci-cd.yml`
2. Tambahkan GitHub Secrets untuk credentials:
   - Settings → Secrets and variables → Actions
   - Tambahkan secrets yang diperlukan (SSH keys, server info, dll)
3. Sesuaikan script deployment sesuai kebutuhan

### 4. **Menambahkan Notifikasi**

Tambahkan notifikasi ke Slack/Discord/Email saat workflow selesai:

```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 📝 Catatan Penting

- Workflow akan berjalan setiap kali ada push atau pull request ke branch main/master/develop
- Pastikan `.env.example` selalu update dengan environment variables yang diperlukan
- Jangan commit file `.env` ke repository (sudah di .gitignore)
- Untuk production deployment, gunakan GitHub Secrets untuk menyimpan credentials

## 🔗 Referensi

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Laravel Testing](https://laravel.com/docs/testing)
- [Docker Documentation](https://docs.docker.com/)

