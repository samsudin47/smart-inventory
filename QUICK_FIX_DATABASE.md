# ⚡ Quick Fix: Error "Public Key Retrieval is not allowed"

## 🎯 Solusi Cepat (1 Menit)

### Windows

Buka PowerShell di folder project, lalu jalankan:

```powershell
.\deploy\mysql\fix-database-auth.ps1
```

### Linux/Mac

Buka terminal di folder project, lalu jalankan:

```bash
bash deploy/mysql/fix-database-auth.sh
```

**Selesai!** Script akan otomatis memperbaiki masalahnya.

---

## 🔌 Setelah Script Berhasil

Gunakan koneksi berikut di database client Anda:

### Connection String JDBC

```
jdbc:mysql://127.0.0.1:3306/smart_inventory_db?allowPublicKeyRetrieval=true
```

### Atau di Database Client:

- **Host:** `127.0.0.1`
- **Port:** `3306`
- **Database:** `smart_inventory_db`
- **Username:** `AL` atau `root`
- **Password:** (cek di file `.env`, biasanya di `DB_PASSWORD`)
- **Advanced/Options:** Tambahkan `allowPublicKeyRetrieval=true`

---

## ❓ Masih Error?

1. **Pastikan container MySQL berjalan:**

    ```bash
    docker-compose ps smart_inventory_db
    ```

2. **Jika tidak berjalan, start dulu:**

    ```bash
    docker-compose up -d smart_inventory_db
    ```

3. **Cek password di `.env` file** - pastikan sesuai dengan yang digunakan

4. **Lihat dokumentasi lengkap:** `deploy/mysql/README.md`

---

## 📝 Manual Fix (Jika Script Tidak Bekerja)

1. Masuk ke MySQL:

    ```bash
    docker exec -it smart_inventory_db mysql -u root -p
    ```

2. Jalankan SQL (ganti `password` dengan password dari `.env`):

    ```sql
    ALTER USER 'AL'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
    FLUSH PRIVILEGES;
    ```

3. Exit MySQL: `exit`

4. Coba connect lagi dengan parameter `allowPublicKeyRetrieval=true`
