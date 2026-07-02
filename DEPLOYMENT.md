# วิธีติดตั้งเกม Rock Paper Scissors บน Server

คู่มือนี้จะพาคุณติดตั้งเกมบน server ทีละขั้นตอน

---

## สิ่งที่ต้องมีก่อนเริ่ม

- [ ] Server ที่ติดตั้ง **Ubuntu 20** แล้ว และสามารถเข้าใช้งานผ่าน Terminal ได้
- [ ] อินเทอร์เน็ต
- [ ] ใช้เวลาประมาณ 15-20 นาที

---

## ขั้นตอนที่ 1: เข้า Server

เปิด Terminal แล้วพิมพ์:

```bash
ssh username@ip-address
```

> เปลี่ยน `username` และ `ip-address` เป็นของ server คุณ

---

## ขั้นตอนที่ 2: ติดตั้ง Docker

คัดลอกคำสั่งด้านล่างทั้งหมด แล้ววางลงใน Terminal กด Enter:

```bash
sudo apt update
```

```bash
sudo apt install -y docker.io
```

```bash
sudo systemctl start docker
```

```bash
sudo systemctl enable docker
```

ตรวจสอบว่าติดตั้งสำเร็จ:

```bash
docker --version
```

> ถ้าขึ้นตัวเลข version เช่น `Docker version 24.x.x` แปลว่าสำเร็จ

---

## ขั้นตอนที่ 3: ติดตั้ง Docker Compose

```bash
sudo apt install -y docker-compose-v2
```

> ถ้าคำสั่งนี้ไม่ได้ผล ให้ใช้:
> ```bash
> sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
> sudo chmod +x /usr/local/bin/docker-compose
> ```

ตรวจสอบ:

```bash
docker compose version
```

---

## ขั้นตอนที่ 4: ดาวน์โหลดโค้ด

```bash
cd ~
git clone https://github.com/noxhsxrk/coraline-challenge.git
cd coraline-challenge
```

---

## ขั้นตอนที่ 5: เปิดเกม

```bash
cd ~/coraline-challenge
sudo docker compose up -d
```

> รอประมาณ 2-3 นาทีให้ build เสร็จ (ครั้งแรก)

---

## ขั้นตอนที่ 6: ทดสอบว่าเกมทำงาน

1. เปิดเว็บบราวเซอร์ (Chrome หรือ Safari)
2. พิมพ์ที่อยู่: `http://<server-ip>:3000`
3. เปลี่ยน `<server-ip>` เป็น IP address ของ server คุณ

ถ้าเห็นหน้าเกมขึ้นมา แปลว่าสำเร็จ 🎉

---

## คำสั่งที่ควรรู้

| ต้องการทำอะไร | คำสั่ง |
|---------------|--------|
| **เปิดเกม** | `cd ~/coraline-challenge && sudo docker compose up -d` |
| **ปิดเกม** | `cd ~/coraline-challenge && sudo docker compose stop` |
| **เปิดใหม่หลังปิด** | `cd ~/coraline-challenge && sudo docker compose start` |
| **รีสตาร์ทเกม** | `cd ~/coraline-challenge && sudo docker compose restart` |
| **อัพเดทโค้ดแล้ว restart** | `cd ~/coraline-challenge && git pull && sudo docker compose down && sudo docker compose up -d --build` |
| **ดูล็อก (log)** | `cd ~/coraline-challenge && sudo docker compose logs` |
| **รีเซ็ตคะแนนสูงสุดเป็น 0** | `sudo docker exec $(sudo docker ps -qf "name=backend") sh -c 'echo "{\"highScore\":0}" > /app/data/high-score.json'` |

---

## การขยายระบบให้รองรับคนเล่นเยอะขึ้น

ถ้าเกมมีคนเล่นเยอะ สามารถเพิ่มจำนวน backend ได้ด้วยคำสั่งเดียว:

```bash
cd ~/coraline-challenge && sudo docker compose up -d --scale backend=3
```

> ตัวเลข `3` คือจำนวน backend ที่ต้องการ — เปลี่ยนได้ตามต้องการ

---

## การตั้งค่า Firewall (กรณี server เปิด firewall ไว้)

```bash
sudo ufw allow 3000
```

> แค่พอร์ต 3000 ก็พอ ผู้เล่นเข้าถึงเกมผ่านพอร์ตนี้พอร์ตเดียว

---

## จบแล้ว 🎉

เกมของคุณพร้อมให้คนอื่นเล่นแล้วที่ `http://<server-ip>:3000`
