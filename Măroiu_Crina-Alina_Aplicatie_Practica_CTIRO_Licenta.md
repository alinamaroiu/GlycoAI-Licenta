# Descriere Livrabile Proiect Licență

**Student:** Măroiu Crina-Alina

### 1. Adresa repository-ului (GitHub)
Întregul cod sursă al proiectului (Frontend și Backend) este setat la vizibilitate publică și poate fi accesat la adresa:
https://github.com/alinamaroiu/GlycoAI-Licenta

### 2. Pașii de compilare ai aplicației

**Frontend (React Native + Expo):**
1. Se deschide terminalul în directorul principal al proiectului.
2. Se execută comanda pentru instalarea modulelor:
   `npm install`
3. Se instalează dependințele specifice setului de biblioteci Expo:
   `npx expo install`

**Backend (Python + Flask):**
1. Se navighează în folderul dedicat logicii de server: `cd modelFood`
2. Se instalează bibliotecile necesare pentru rularea modelelor AI și a API-ului:
   `pip install flask flask-cors torch torchvision ultralytics pillow numpy`

### 3. Pașii de instalare și lansare a aplicației

**Lansare aplicație mobilă:**
1. Din directorul principal al proiectului, se pornește serverul de dezvoltare:
   `npx expo start`
2. Aplicația poate fi vizualizată prin scanarea codului QR generat utilizând aplicația **Expo Go** pe un dispozitiv mobil sau prin intermediul unui emulator Android/iOS.

**Lansare Backend (Server):**
Proiectul este pre-configurat să comunice cu instanța publică de backend găzduită pe Hugging Face Spaces:
https://alinam14-backend.hf.space

Pentru o rulare locală a serverului de predicție:
1. Din folderul `modelFood`, se execută comanda:
   `python backend.py`
2. Serverul va deveni activ implicit pe mediul local.