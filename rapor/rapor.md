# Yemekhane Otomasyonu – Dönem Ödevi Raporu

**Seçilen Mimari Yol:** Web API + Arayüz (HTML5, CSS3, saf JavaScript `fetch`)

---

## Aşama 1: Altyapı ve Replikasyon Doğrulaması

### 1.1. Servislerin Ayağa Kaldırılması ve Sağlık Durumu
Proje kök dizininde `docker compose up -d` komutu çalıştırıldıktan sonra tüm servislerin durumu kontrol edilmiştir:

**Komut:**
```bash
docker compose ps -a
```

**Çıktı:**
```text
NAME                        IMAGE                COMMAND                  SERVICE         CREATED         STATUS                     PORTS
yemekhane-frontend-1        yemekhane-frontend   "httpd-foreground -D…"   frontend        2 minutes ago   Up 2 minutes (healthy)     0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
yemekhane-mysql-primary-1   mysql:8.4            "docker-entrypoint.s…"   mysql-primary   8 minutes ago   Up 8 minutes (healthy)     0.0.0.0:3307->3306/tcp, [::]:3307->3306/tcp
yemekhane-mysql-replica-1   mysql:8.4            "docker-entrypoint.s…"   mysql-replica   8 minutes ago   Up 8 minutes (healthy)     0.0.0.0:3308->3306/tcp, [::]:3308->3306/tcp
yemekhane-redis-1           redis:7.4-alpine     "docker-entrypoint.s…"   redis           8 minutes ago   Up 8 minutes (healthy)     0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
yemekhane-replica-setup-1   mysql:8.4            "bash /replica-setup…"   replica-setup   8 minutes ago   Exited (0) 6 minutes ago
```
Tüm kalıcı servisler `Up (healthy)`, ilk replikasyon kurulumunu yapan `replica-setup` servisi ise `Exited (0)` durumundadır.

### 1.2. Replikasyon ve Redis Durumu
**Komut:**
```bash
docker compose exec mysql-replica mysql -uroot -pyemekhane_kok -e "SHOW REPLICA STATUS\G"
```

**Çıktı (Özet):**
```text
             Replica_IO_State: Waiting for source to send event
                  Source_Host: mysql-primary
                  Source_User: repl
           Replica_IO_Running: Yes
          Replica_SQL_Running: Yes
        Seconds_Behind_Source: 0
            Executed_Gtid_Set: 2b4c9671-e4f7-11f1-b5ac-263a5d4208f0:1-42
                Auto_Position: 1
```

**Redis Kontrolü:**
```bash
docker compose exec redis redis-cli ping
# Çıktı: PONG
```

### 1.3. Kaynakta Bakiye Yükleme ve Replikada Doğrulama
**Komutlar:**
```bash
docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
docker compose exec mysql-primary mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 100)"
docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
```

**Çıktılar:**
```text
+----+--------+
| id | bakiye |
+----+--------+
|  7 | 355.00 |
+----+--------+

+------------+--------+
| hareket_id | bakiye |
+------------+--------+
|        455 | 455.00 |
+------------+--------+

+----+--------+
| id | bakiye |
+----+--------+
|  7 | 455.00 |
+----+--------+
```

### 1.4. Replikaya Yazma Denemesi (Salt Okunur Doğrulaması)
**Komut:**
```bash
docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 50)"
```

**Çıktı:**
```text
ERROR 1290 (HY000) at line 1: The MySQL server is running with the --super-read-only option so it cannot execute this statement
```

### 1.5. Replika Kesintisi Sonrası Değişikliklerin Yakalanması (GTID)
**Komutlar:**
```bash
docker compose stop mysql-replica
docker compose exec mysql-primary mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 200)"
docker compose start mysql-replica
docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
```

**Çıktılar:**
```text
Container yemekhane-mysql-replica-1 Stopped

+------------+--------+
| hareket_id | bakiye |
+------------+--------+
|        456 | 655.00 |
+------------+--------+

Container yemekhane-mysql-replica-1 Started

+----+--------+
| id | bakiye |
+----+--------+
|  7 | 655.00 |
+----+--------+
```