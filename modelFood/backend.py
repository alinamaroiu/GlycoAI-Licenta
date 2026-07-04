import os
import io
import json
import sqlite3
import numpy as np
from datetime import datetime, date

from flask import Flask, request, jsonify
from flask_cors import CORS

import torch
torch.set_num_threads(1)
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

from werkzeug.security import generate_password_hash, check_password_hash

# IMPORTANT: Importăm FastSAM
from ultralytics import FastSAM

# -----------------------------
# Config general
# -----------------------------
MODEL_PATH = "best_model_366.pth"
CLASSES_PATH = "classes.txt"
FOODS_JSON_PATH = "foods_updated.json"
DB_PATH = "meals.db"
SAM_MODEL_PATH = "FastSAM-s.pt"

DEVICE = torch.device("cpu")  # Forțăm CPU pe Render

app = Flask(__name__)
CORS(app)

# -----------------------------
# Încărcare resurse statice
# -----------------------------
if not os.path.exists(CLASSES_PATH):
    raise FileNotFoundError(f"Lipsește {CLASSES_PATH}")
with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    CLASS_NAMES = [line.strip() for line in f if line.strip()]

if os.path.exists(FOODS_JSON_PATH):
    with open(FOODS_JSON_PATH, "r", encoding="utf-8") as f:
        FOODS_DB = json.load(f)
else:
    FOODS_DB = {}

# -----------------------------
# ÎNCĂRCARE MODELE LA STARTUP
# -----------------------------
print("[INFO] Încarc FastSAM...")
fast_sam = FastSAM(SAM_MODEL_PATH)

print("[INFO] Încarc EfficientNet-B0...")
model = models.efficientnet_b0(weights=None)
in_features = model.classifier[1].in_features
model.classifier[1] = nn.Linear(in_features, len(CLASS_NAMES))
state_dict = torch.load(MODEL_PATH, map_location="cpu")
if isinstance(state_dict, dict) and "model" in state_dict:
    model.load_state_dict(state_dict["model"])
else:
    model.load_state_dict(state_dict)
model.eval()
CLASSIFIER = model
print("[INFO] Modele încărcate cu succes.")

TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# -----------------------------
# Baza de date SQLite
# -----------------------------
def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            food_class TEXT NOT NULL,
            grams REAL NOT NULL,
            gi REAL NOT NULL,
            carbs REAL NOT NULL,
            gl REAL NOT NULL,
            calories REAL NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    conn.commit()
    conn.close()

# -----------------------------
# Logica de Procesare
# -----------------------------
def get_nutrition(food_class):
    search_key = food_class.split("__")[-1].replace("_", " ").lower().strip()
    info = None
    for key, value in FOODS_DB.items():
        if key.lower().replace("_", " ").strip() == search_key:
            info = value
            break

    if info:
        return {
            "name": info.get("name", search_key).title(),
            "name_ro": info.get("name_ro", search_key).title(),
            "gi": float(info.get("gi", 50.0)),
            "carbs_per_100g": float(info.get("carbs_per_100g", 0.0)),
            "calories_per_100g": float(info.get("calories", 0.0))
        }

    return {
        "name": search_key.title(),
        "name_ro": search_key.title(),
        "gi": 55.0,
        "carbs_per_100g": 15.0,
        "calories_per_100g": 100.0,
        "is_fallback": True
    }

# -----------------------------
# Endpoint-uri API
# -----------------------------
@app.route("/api/predict", methods=["POST"])
def api_predict():
    if "image" not in request.files:
        return jsonify({"success": False, "error": "Lipsă imagine"}), 400

    file = request.files["image"]
    try:
        raw_img = Image.open(io.BytesIO(file.read())).convert("RGB")
        img_np = np.array(raw_img)
        w, h = raw_img.size

        # --- PASUL 1: Imaginea întreagă ca backup ---
        full_tensor = TRANSFORM(raw_img).unsqueeze(0)
        with torch.no_grad():
            full_out = CLASSIFIER(full_tensor)
            full_probs = torch.softmax(full_out, dim=1)[0].cpu().numpy()
            full_idx = int(np.argmax(full_probs))
            full_conf = float(full_probs[full_idx])
            full_class = CLASS_NAMES[full_idx]

        # --- PASUL 2: Segmentare cu FastSAM ---
        print("[INFO] Pornesc FastSAM...")
        results = fast_sam(img_np, device="cpu", retina_masks=True, imgsz=512, conf=0.4, iou=0.9)
        boxes = results[0].boxes.xyxy.cpu().numpy()
        print(f"[DEBUG] FastSAM a găsit {len(boxes)} obiecte.")

        all_predictions = []
        found_names = set()

        if len(boxes) > 1:
            boxes = sorted(boxes, key=lambda b: (b[2]-b[0])*(b[3]-b[1]), reverse=True)

            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = map(int, box)
                area_ratio = ((x2 - x1) * (y2 - y1)) / (w * h)

                if area_ratio > 0.85 or area_ratio < 0.05:
                    continue

                crop_img = raw_img.crop((x1, y1, x2, y2))
                tensor = TRANSFORM(crop_img).unsqueeze(0)

                with torch.no_grad():
                    outputs = CLASSIFIER(tensor)
                    probs = torch.softmax(outputs, dim=1)[0].cpu().numpy()
                    idx = int(np.argmax(probs))
                    conf = float(probs[idx])
                    label = CLASS_NAMES[idx]

                if conf > 0.30 and label not in found_names:
                    all_predictions.append({
                        "food_class": label,
                        "confidence": conf,
                        "nutrition": get_nutrition(label),
                        "box": [x1, y1, x2, y2]
                    })
                    found_names.add(label)

                if len(all_predictions) >= 3:
                    break

        # --- PASUL 3: Fallback ---
        if len(all_predictions) == 0:
            print("[INFO] Folosesc imaginea întreagă.")
            all_predictions.append({
                "food_class": full_class,
                "confidence": full_conf,
                "nutrition": get_nutrition(full_class),
                "box": [0, 0, w, h]
            })

        return jsonify({"success": True, "predictions": all_predictions})

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/meal", methods=["POST"])
def add_meal():
    data = request.get_json()
    user_id = data.get("user_id")
    food_class = data.get("food_class")
    grams = float(data.get("grams", 0))

    nutrition = get_nutrition(food_class)
    if not nutrition:
        return jsonify({"success": False, "error": "Aliment negăsit"}), 404

    carbs = (nutrition["carbs_per_100g"] * grams) / 100.0
    gl = (nutrition["gi"] * carbs) / 100.0
    calories = (nutrition["calories_per_100g"] * grams) / 100.0
    ts = datetime.utcnow().isoformat()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO meals (user_id, food_class, grams, gi, carbs, gl, calories, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, food_class, grams, nutrition["gi"], carbs, gl, calories, ts))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "meal": {
            "food_class": food_class,
            "grams": grams,
            "gi": nutrition["gi"],
            "carbs": round(carbs, 2),
            "gl": round(gl, 2),
            "calories": round(calories, 2)
        }
    })


@app.route("/api/meals/today", methods=["GET"])
def get_today():
    user_id = request.args.get("user_id")
    today = date.today().isoformat()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM meals WHERE user_id = ? AND timestamp LIKE ?", (user_id, f"{today}%"))
    rows = cur.fetchall()
    conn.close()

    meals = [dict(r) for r in rows]
    totals = {
        "total_carbs": round(sum(m['carbs'] for m in meals), 2),
        "total_gl": round(sum(m['gl'] for m in meals), 2),
        "total_calories": round(sum(m['calories'] for m in meals), 2)
    }
    return jsonify({"success": True, "meals": meals, "totals": totals})

@app.route('/api/meals/clear', methods=['DELETE'])
def clear_meals():
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'user1')
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM meals WHERE user_id = ?', (user_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "Email și parola sunt obligatorii"}), 400

    hashed_pw = generate_password_hash(password)
    ts = datetime.utcnow().isoformat()

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)", 
                    (email, hashed_pw, ts))
        conn.commit()
        user_id = cur.lastrowid
        conn.close()
        return jsonify({"success": True, "user_id": str(user_id)})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Acest email este deja înregistrat"}), 400
    
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "Email și parola sunt obligatorii"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, password_hash FROM users WHERE email = ?", (email,))
    row = cur.fetchone()
    conn.close()

    if row is None:
        return jsonify({"success": False, "error": "Email necunoscut"}), 404

    user_id = row["id"]
    password_hash = row["password_hash"]

    if not check_password_hash(password_hash, password):
        return jsonify({"success": False, "error": "Parolă incorectă"}), 401

    # Login OK — returnăm user_id (frontend salvează user_id local)
    return jsonify({"success": True, "user_id": str(user_id)})

init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)