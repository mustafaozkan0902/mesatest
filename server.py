#!/usr/bin/env python3
import http.server
import socketserver
import socket
import urllib.parse
import json
import os
import sys
import hashlib
from datetime import datetime

PORT = int(os.environ.get("PORT", 8088))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "santiye_data.json")
BACKUP_FILE = os.path.join(DATA_DIR, "santiye_data.bak.json")

def hash_pw(pw):
    return hashlib.sha256(pw.encode('utf-8')).hexdigest()

def get_network_ips():
    """Returns a list of local IP addresses to access from phones/tablets."""
    ips = []
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    if not ips:
        ips.append("127.0.0.1")
    return list(set(ips))

def load_data():
    if not os.path.exists(DATA_FILE):
        import init_data
        init_data.generate_initial_data()
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    # Save backup first
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f_in:
                content = f_in.read()
            with open(BACKUP_FILE, "w", encoding="utf-8") as f_bak:
                f_bak.write(content)
        except Exception as e:
            print(f"Backup error: {e}")

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

class SantiyeRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for API
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def send_json(self, data, status=200):
        response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def read_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                raw_body = self.rfile.read(content_length).decode('utf-8')
                return json.loads(raw_body)
        except Exception as e:
            print(f"Error parsing JSON body: {e}")
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/data':
            try:
                data = load_data()
                self.send_json(data)
            except Exception as e:
                self.send_json({"error": str(e)}, status=500)
            return

        elif path == '/api/status':
            self.send_json({
                "status": "online",
                "serverTime": datetime.now().isoformat(),
                "port": PORT,
                "localIps": get_network_ips()
            })
            return

        elif path == '/api/export':
            data = load_data()
            self.send_json(data)
            return

        # Fallback to serving static files (index.html, styles.css, app.js, etc.)
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path == '/api/auth/login':
            password = body.get('password', '')
            data = load_data()
            stored_hash = data.get('settings', {}).get('adminPasswordHash', hash_pw('admin123'))
            
            if hash_pw(password) == stored_hash:
                token = f"admin-token-{hash_pw(password + 'santiye_salt')[:16]}"
                self.send_json({
                    "success": True,
                    "message": "Giriş başarılı.",
                    "token": token,
                    "role": "admin"
                })
            else:
                self.send_json({
                    "success": False,
                    "message": "Hatalı yönetici şifresi!"
                }, status=401)
            return

        elif path == '/api/auth/change-password':
            current_pw = body.get('currentPassword', '')
            new_pw = body.get('newPassword', '')
            
            data = load_data()
            stored_hash = data.get('settings', {}).get('adminPasswordHash', hash_pw('admin123'))
            
            if hash_pw(current_pw) != stored_hash:
                self.send_json({"success": False, "message": "Mevcut şifre yanlış!"}, status=401)
                return
                
            if len(new_pw) < 4:
                self.send_json({"success": False, "message": "Yeni şifre en az 4 karakter olmalıdır."}, status=400)
                return
                
            data['settings']['adminPasswordHash'] = hash_pw(new_pw)
            save_data(data)
            self.send_json({"success": True, "message": "Yönetici şifresi başarıyla güncellendi."})
            return

        elif path == '/api/unit':
            # Update single unit
            unit_id = body.get('unitId')
            updated_unit = body.get('unitData')
            admin_user = body.get('adminUser', 'Admin')
            action_desc = body.get('actionDesc', 'Kat durumu güncellendi')
            
            if not unit_id or not updated_unit:
                self.send_json({"success": False, "message": "Eksik parametre!"}, status=400)
                return

            data = load_data()
            units = data.get('units', {})
            
            if unit_id not in units:
                self.send_json({"success": False, "message": "Kat bulunamadı!"}, status=404)
                return

            # Business rule validation:
            # 1. MESA can only be 'onaylandi' if Mekanik AND Klima are 'tamamlandi'
            mekanik_status = updated_unit.get('mekanik', {}).get('status', 'bekliyor')
            klima_status = updated_unit.get('klima', {}).get('status', 'bekliyor')
            mesa_status = updated_unit.get('mesa', {}).get('status', 'bekliyor')
            elk_status = updated_unit.get('elektrikTest', {}).get('status', 'kilitli')

            if mesa_status == 'onaylandi' and (mekanik_status != 'tamamlandi' or klima_status != 'tamamlandi'):
                self.send_json({
                    "success": False,
                    "message": "Kural Hatası: Mekanik ve Klima işleri tamamlanmadan MESA onayı verilemez!"
                }, status=400)
                return

            # 2. Elektrik Test can only be ready or higher if MESA is 'onaylandi'
            if elk_status in ['hazir', 'suruyor', 'tamamlandi'] and mesa_status != 'onaylandi':
                self.send_json({
                    "success": False,
                    "message": "Kural Hatası: MESA firması işi teslim alıp onay vermeden Elektrik Testine başlanamaz!"
                }, status=400)
                return

            # Auto-adjust status if prereqs changed:
            if mesa_status != 'onaylandi':
                updated_unit['elektrikTest']['status'] = 'kilitli'
            elif mesa_status == 'onaylandi' and elk_status == 'kilitli':
                updated_unit['elektrikTest']['status'] = 'hazir'

            updated_unit['updatedAt'] = datetime.now().strftime("%Y-%m-%d %H:%M")
            updated_unit['updatedBy'] = admin_user
            
            units[unit_id] = updated_unit
            
            # Add to audit logs
            log_entry = {
                "id": f"log-{int(datetime.now().timestamp())}",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "user": admin_user,
                "unitId": unit_id,
                "blockName": updated_unit.get('blockName', ''),
                "floorName": updated_unit.get('floorName', ''),
                "action": action_desc,
                "details": f"Mekanik: {mekanik_status}, Klima: {klima_status}, MESA: {mesa_status}, Test: {updated_unit['elektrikTest']['status']}",
                "badgeType": "success" if mesa_status == 'onaylandi' else "info"
            }
            logs = data.get('logs', [])
            logs.insert(0, log_entry)
            data['logs'] = logs[:100] # keep last 100 logs
            
            save_data(data)
            self.send_json({
                "success": True,
                "message": f"{updated_unit.get('blockName')} {updated_unit.get('floorName')} başarıyla güncellendi.",
                "unit": updated_unit
            })
            return

        elif path == '/api/bulk':
            # Bulk update
            unit_ids = body.get('unitIds', [])
            field = body.get('field') # 'mekanik', 'klima', 'mesa', 'elektrikTest'
            new_status = body.get('status')
            note = body.get('note', '')
            admin_user = body.get('adminUser', 'Admin')
            
            if not unit_ids or not field or not new_status:
                self.send_json({"success": False, "message": "Eksik parametre!"}, status=400)
                return
                
            data = load_data()
            units = data.get('units', {})
            updated_count = 0
            now_str = datetime.now().strftime("%Y-%m-%d")
            
            for uid in unit_ids:
                if uid in units:
                    u = units[uid]
                    
                    # Validate prerequisites
                    if field == 'mesa' and new_status == 'onaylandi':
                        if u['mekanik']['status'] != 'tamamlandi' or u['klima']['status'] != 'tamamlandi':
                            continue # skip if prereq not met
                            
                    if field == 'elektrikTest' and new_status in ['hazir', 'suruyor', 'tamamlandi']:
                        if u['mesa']['status'] != 'onaylandi':
                            continue # skip if MESA not approved
                            
                    u[field]['status'] = new_status
                    u[field]['date'] = now_str
                    if note:
                        u[field]['note'] = note
                        
                    # Auto update dependent states
                    if u['mesa']['status'] == 'onaylandi' and u['elektrikTest']['status'] == 'kilitli':
                        u['elektrikTest']['status'] = 'hazir'
                    elif u['mesa']['status'] != 'onaylandi':
                        u['elektrikTest']['status'] = 'kilitli'
                        
                    u['updatedAt'] = datetime.now().strftime("%Y-%m-%d %H:%M")
                    u['updatedBy'] = admin_user
                    updated_count += 1
                    
            # Audit log
            log_entry = {
                "id": f"log-{int(datetime.now().timestamp())}",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "user": admin_user,
                "unitId": "bulk",
                "blockName": f"{updated_count} Kat",
                "floorName": "Toplu İşlem",
                "action": f"Toplu {field.capitalize()} Güncellemesi",
                "details": f"{updated_count} adet birim için durum '{new_status}' yapıldı.",
                "badgeType": "warning"
            }
            logs = data.get('logs', [])
            logs.insert(0, log_entry)
            data['logs'] = logs[:100]
            
            save_data(data)
            self.send_json({
                "success": True,
                "message": f"{updated_count} kat başarıyla güncellendi.",
                "updatedCount": updated_count
            })
            return

        elif path == '/api/reset':
            import init_data
            init_data.generate_initial_data()
            self.send_json({"success": True, "message": "Tüm veriler varsayılan şantiye durumuna sıfırlandı."})
            return

        self.send_error(404, "Endpoint not found")

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    port = PORT
    for attempt_port in range(port, port + 20):
        try:
            with socketserver.TCPServer(("0.0.0.0", attempt_port), SantiyeRequestHandler) as httpd:
                local_ips = get_network_ips()
                print("=" * 65)
                print(f"🏗️  MESA ŞANTİYE ELEKTRİK TESTİ TAKİP SİSTEMİ ÇALIŞIYOR")
                print("=" * 65)
                print(f"💻 Bu Bilgisayardan Giriş : http://localhost:{attempt_port}")
                for ip in local_ips:
                    print(f"📱 Şantiyeden / Mobilden  : http://{ip}:{attempt_port}")
                print(f"🔑 Varsayılan Yönetici Şifresi : admin123")
                print("=" * 65)
                print("Sunucuyu durdurmak için Ctrl+C tuşlarına basabilirsiniz.")
                sys.stdout.flush()
                httpd.serve_forever()
                break
        except OSError as e:
            if attempt_port == port + 19:
                print(f"Hata: Port {attempt_port} açılamadı: {e}")
                sys.exit(1)
            continue

if __name__ == "__main__":
    run_server()
