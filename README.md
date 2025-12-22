# Smart Inventory

[![CI/CD Pipeline](https://github.com/samsudin47/smart-inventory/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/samsudin47/smart-inventory/actions/workflows/ci-cd.yml)

Aplikasi Smart Inventory Management System built with Laravel dan React (Inertia.js).

## 🚀 Features

- Inventory Management
- Stock Management (Masuk/Keluar/Tersedia)
- Product Management
- Kios Management
- User Management dengan Role-based Access

## 🛠️ Tech Stack

- **Backend**: Laravel 12, PHP 8.4
- **Frontend**: React 19, TypeScript, Tailwind CSS, Inertia.js
- **Database**: MySQL 8.0
- **Container**: Docker & Docker Compose

## 📋 Prerequisites

- PHP 8.4+
- Composer
- Node.js 20+
- Docker & Docker Compose (optional)

## 🔧 Installation

1. Clone repository

```bash
git clone https://github.com/samsudin47/smart-inventory.git
cd smart-inventory
```

2. Install dependencies

```bash
composer install
npm install
```

3. Setup environment

```bash
cp .env.example .env
php artisan key:generate
```

4. Run migrations

```bash
php artisan migrate
```

5. Build frontend

```bash
npm run build
```

6. Start development server

```bash
composer dev
# atau
php artisan serve
npm run dev
```

## 🐳 Docker Setup

```bash
docker-compose up -d
```

Aplikasi akan tersedia di `http://localhost:8000`

## 🧪 Testing

```bash
# Run PHP tests
composer test

# Run frontend linting
npm run lint

# Type checking
npm run types
```

## 📚 CI/CD

Project ini menggunakan GitHub Actions untuk CI/CD. Lihat [CI-CD-SETUP.md](.github/CI-CD-SETUP.md) untuk detail setup.

Workflow otomatis menjalankan:

- ✅ PHP Unit Tests
- ✅ Frontend Linting & Type Checking
- ✅ Docker Image Build

## 📄 License

MIT License
