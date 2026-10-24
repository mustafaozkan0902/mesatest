#!/usr/bin/env python3
import json
import os
import hashlib
from datetime import datetime, timedelta

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "santiye_data.json")

def hash_pw(pw):
    return hashlib.sha256(pw.encode('utf-8')).hexdigest()

def generate_initial_data():
    now = datetime.now()
    d_str = lambda days_ago: (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")
    
    blocks = [
        {"id": i, "name": f"Blok {i}", "code": f"B{i:02d}"} for i in range(1, 11)
    ]
    
    floors = [
        {"id": "cati", "name": "Çatı Katı", "short": "ÇATI", "order": 8},
        {"id": "kat4", "name": "4. Kat", "short": "4. KAT", "order": 7},
        {"id": "kat3", "name": "3. Kat", "short": "3. KAT", "order": 6},
        {"id": "kat2", "name": "2. Kat", "short": "2. KAT", "order": 5},
        {"id": "kat1", "name": "1. Kat", "short": "1. KAT", "order": 4},
        {"id": "zemin", "name": "Zemin Kat", "short": "ZEMİN", "order": 3},
        {"id": "b1", "name": "Bodrum 1 (B1)", "short": "B1", "order": 2},
        {"id": "b2", "name": "Bodrum 2 (B2)", "short": "B2", "order": 1}
    ]
    
    units = {}
    logs = []
    
    for b in blocks:
        b_id = b["id"]
        b_name = b["name"]
        
        for f in floors:
            f_id = f["id"]
            f_name = f["name"]
            f_order = f["order"]
            u_key = f"{b_id}_{f_id}"
            
            # Realistic sample distribution based on block and floor
            # Blok 1 & 2 are ahead, Blok 3-5 in middle, Blok 6-10 early stage
            progress_rank = (11 - b_id) * 3 + (9 - f_order)
            
            mekanik_status = "bekliyor"
            mekanik_date = ""
            mekanik_note = ""
            
            klima_status = "bekliyor"
            klima_date = ""
            klima_note = ""
            
            mesa_status = "bekliyor"
            mesa_date = ""
            mesa_officer = ""
            mesa_doc = ""
            mesa_note = ""
            
            elk_status = "kilitli"
            elk_date = ""
            elk_tester = ""
            elk_report = ""
            elk_note = ""
            
            if progress_rank >= 32:
                # Completely done and tested!
                mekanik_status = "tamamlandi"
                mekanik_date = d_str(10)
                mekanik_note = "Kazan ve borulama montajı eksiksiz tamamlandı."
                
                klima_status = "tamamlandi"
                klima_date = d_str(9)
                klima_note = "Kanal ve VRF iç ünite bağlantıları bitti."
                
                mesa_status = "onaylandi"
                mesa_date = d_str(7)
                mesa_officer = "Cemil Arslan (MESA Saha Şefi)"
                mesa_doc = f"MESA-KBL-{b_id:02d}-{f_order}"
                mesa_note = "Mahaller teslim alındı, elektrik testine onay verildi."
                
                elk_status = "tamamlandi"
                elk_date = d_str(4)
                elk_tester = "Murat Özkan (Elektrik Şefi)"
                elk_report = f"ELK-TR-{b_id:02d}-{f_order}"
                elk_note = "Yalıtım, meger ve fonksiyon testleri başarıyla tamamlandı. Enerjilendirilebilir."
                
            elif progress_rank >= 27:
                # MESA approved, READY for electrical test!
                mekanik_status = "tamamlandi"
                mekanik_date = d_str(6)
                mekanik_note = "Mekanik test ve montajlar tamamlandı."
                
                klima_status = "tamamlandi"
                klima_date = d_str(5)
                klima_note = "Klima montajı ve drenaj testleri bitti."
                
                mesa_status = "onaylandi"
                mesa_date = d_str(3)
                mesa_officer = "Serkan Demir (MESA Kontrol)"
                mesa_doc = f"MESA-KBL-{b_id:02d}-{f_order}"
                mesa_note = "MESA tarafından teslim alındı. Elektrik testi için uygun."
                
                elk_status = "hazir"
                elk_note = "MESA onayı tamam. Test ekibi sahaya bekleniyor."
                
            elif progress_rank >= 23:
                # Mekanik & Klima done, WAITING FOR MESA APPROVAL
                mekanik_status = "tamamlandi"
                mekanik_date = d_str(4)
                mekanik_note = "Mekanik işler bitirildi, teslime hazır."
                
                klima_status = "tamamlandi"
                klima_date = d_str(3)
                klima_note = "Klima işleri bitirildi, teslime hazır."
                
                mesa_status = "bekliyor"
                mesa_note = "Mekanik ve klima bitti. MESA teslim kontrolü için çağrıldı."
                
                elk_status = "kilitli"
                elk_note = "MESA teslim onayı bekleniyor."
                
            elif progress_rank >= 18:
                # Mekanik done, Klima in progress or vice-versa
                mekanik_status = "tamamlandi"
                mekanik_date = d_str(3)
                mekanik_note = "Mekanik borulama bitti."
                
                klima_status = "devam"
                klima_note = "Klima santrali ve kanal imalatı %70 seviyesinde sürüyor."
                
                mesa_status = "bekliyor"
                mesa_note = "Klima işi bitmeden MESA onayı alınamaz."
                
                elk_status = "kilitli"
                
            elif progress_rank >= 12:
                # Mekanik and Klima in progress
                mekanik_status = "devam"
                mekanik_note = "Sıhhi ve yangın tesisatı devam ediyor."
                
                klima_status = "bekliyor"
                klima_note = "Menfez ve ünite montajı bekleniyor."
                
                mesa_status = "bekliyor"
                elk_status = "kilitli"
                
            else:
                # Waiting / not started
                mekanik_status = "bekliyor"
                klima_status = "bekliyor"
                mesa_status = "bekliyor"
                elk_status = "kilitli"
                
            units[u_key] = {
                "id": u_key,
                "blockId": b_id,
                "blockName": b_name,
                "floorId": f_id,
                "floorName": f_name,
                "floorShort": f["short"],
                "floorOrder": f_order,
                "mekanik": {
                    "status": mekanik_status, # tamamlandi, devam, bekliyor
                    "date": mekanik_date,
                    "company": "Mekanik Tesisat A.Ş.",
                    "note": mekanik_note
                },
                "klima": {
                    "status": klima_status, # tamamlandi, devam, bekliyor
                    "date": klima_date,
                    "company": "VRF Klima Sistemleri",
                    "note": klima_note
                },
                "mesa": {
                    "status": mesa_status, # onaylandi, revizyon, bekliyor
                    "date": mesa_date,
                    "officer": mesa_officer,
                    "docNo": mesa_doc,
                    "note": mesa_note
                },
                "elektrikTest": {
                    "status": elk_status, # tamamlandi, hazir, suruyor, kilitli, basarisiz
                    "date": elk_date,
                    "tester": elk_tester,
                    "reportNo": elk_report,
                    "note": elk_note
                },
                "updatedAt": d_str(1),
                "updatedBy": "Saha Koordinatörü"
            }
            
    # Sample audit log entries
    logs = [
        {
            "id": "log-1",
            "timestamp": f"{d_str(1)} 16:45",
            "user": "Admin",
            "unitId": "1_kat1",
            "blockName": "Blok 1",
            "floorName": "1. Kat",
            "action": "MESA Onayı Kaydedildi",
            "details": "MESA yetkilisi Serkan Demir tarafından teslim alındı. Kat elektrik testine hazır duruma getirildi.",
            "badgeType": "success"
        },
        {
            "id": "log-2",
            "timestamp": f"{d_str(2)} 11:20",
            "user": "Admin",
            "unitId": "2_zemin",
            "blockName": "Blok 2",
            "floorName": "Zemin Kat",
            "action": "Klima İşi Tamamlandı",
            "details": "Klima ve VRF tesisatı testleri tamamlandı olarak güncellendi.",
            "badgeType": "info"
        },
        {
            "id": "log-3",
            "timestamp": f"{d_str(3)} 09:15",
            "user": "Admin",
            "unitId": "1_b1",
            "blockName": "Blok 1",
            "floorName": "Bodrum 1 (B1)",
            "action": "Elektrik Testi Tamamlandı",
            "details": "ELK-TR-01-2 nolu test raporu ile yalıtım testi başarılı olarak onaylandı.",
            "badgeType": "primary"
        }
    ]
    
    data = {
        "projectName": "MESA Şantiye Elektrik Testi Ön Şart Takip Sistemi",
        "projectInfo": {
            "totalBlocks": 10,
            "floorsPerBlock": 8,
            "totalUnits": 80,
            "siteAddress": "MESA Şantiye Alanı, Kadıköy / İstanbul",
            "lastSync": datetime.now().isoformat()
        },
        "settings": {
            "adminPasswordHash": hash_pw("admin123"), # default: admin123
            "siteName": "MESA Şantiye Sahası",
            "defaultMekanikCompany": "Mekanik Tesisat A.Ş.",
            "defaultKlimaCompany": "VRF Klima Sistemleri",
            "defaultMesaOfficer": "MESA Teslim Kontrol Grubu",
            "defaultTester": "Elektrik Test Ekibi"
        },
        "blocks": blocks,
        "floors": floors,
        "units": units,
        "logs": logs
    }
    
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"Başarıyla {len(units)} birim oluşturuldu ve {DATA_FILE} konumuna kaydedildi.")

if __name__ == "__main__":
    generate_initial_data()
